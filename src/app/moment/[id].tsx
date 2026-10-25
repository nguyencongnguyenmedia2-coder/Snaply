import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import {
  MOMOHeader,
  MOMOAvatar,
  MOMOReactionBar,
  MOMOButton,
  MOMOToast,
} from '@/components/ui';
import { getFeedMoments, reactToMoment, deleteMoment } from '@/services/momentsService';
import { getPhotoDetail } from '@/services/photoStorageService';
import { Moment } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MomentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { user } = useAuth();

  const [moment, setMoment] = useState<Moment | null>(null);
  const [highResUrl, setHighResUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const moments = await getFeedMoments(user?.id);
        const found = moments.find((m) => m.id === id);
        const targetMoment = found || moments[0] || null;
        setMoment(targetMoment);

        // Fetch high-resolution main photo if available
        if (targetMoment) {
          const detail = await getPhotoDetail(targetMoment.id);
          if (detail?.main_url) {
            setHighResUrl(detail.main_url);
          }
        }
      } catch (err) {
        console.warn('Failed to load moment details:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user?.id]);

  const handleReact = async (emoji: string) => {
    if (!moment || !user) return;
    const { reactions, userReaction } = await reactToMoment(moment.id, emoji, user.id);
    setMoment((prev) =>
      prev ? { ...prev, reactions, user_reaction: userReaction } : null
    );
  };

  const confirmDelete = () => {
    if (!moment || !user) return;
    Alert.alert(
      'Xóa khoảnh khắc',
      'Bạn có chắc chắn muốn xóa ảnh này không? Ảnh sẽ được xóa khỏi bảng tin và kho lưu trữ của bạn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ảnh',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  };

  const performDelete = async () => {
    if (!moment || !user) return;
    try {
      setIsDeleting(true);
      await deleteMoment(moment.id, user.id);
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Delete error:', err);
      setIsDeleting(false);
      Alert.alert('Lỗi', 'Không thể xóa ảnh. Vui lòng thử lại sau.');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  if (!moment) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'center' }}>
        <Text style={[typography.title3, { color: colors.text, textAlign: 'center' }]}>
          Không tìm thấy khoảnh khắc hoặc bạn không có quyền xem.
        </Text>
        <MOMOButton title="Quay lại bảng tin" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader
        showBack
        title="Khoảnh khắc"
        rightAction={
          moment.owner_id === user?.id ? (
            <MOMOButton
              title={isDeleting ? 'Đang xóa...' : 'Xóa'}
              variant="ghost"
              size="sm"
              loading={isDeleting}
              disabled={isDeleting}
              onPress={confirmDelete}
              textStyle={{ color: colors.error }}
            />
          ) : (
            <MOMOButton
              title="Báo cáo"
              variant="ghost"
              size="sm"
              onPress={() => router.push({ pathname: '/report', params: { momentId: moment.id } })}
            />
          )
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}>
        {/* Author Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md }}>
          <MOMOAvatar
            url={moment.owner?.avatar_url}
            name={moment.owner?.display_name}
            size="md"
          />
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text style={[typography.headline, { color: colors.text }]}>
              {moment.owner?.display_name || 'Friend'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              @{moment.owner?.username || 'user'} • {new Date(moment.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Photo presentation */}
        <View
          style={{
            borderRadius: radii.xxl,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.lg,
          }}>
          <ExpoImage
            source={{ uri: highResUrl || moment.media_url }}
            style={{ width: '100%', height: SCREEN_WIDTH * 1.25, backgroundColor: colors.surfaceMuted }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        </View>

        {/* Caption */}
        {moment.caption && (
          <View
            style={{
              backgroundColor: colors.surface,
              padding: spacing.lg,
              borderRadius: radii.xl,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: spacing.lg,
            }}>
            <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
              {moment.caption}
            </Text>
          </View>
        )}

        {/* Reaction Bar */}
        <View style={{ marginBottom: spacing.xl }}>
          <MOMOReactionBar
            reactions={moment.reactions}
            userReaction={moment.user_reaction}
            onReact={handleReact}
            onReplyPhoto={() => router.push('/(tabs)/camera')}
          />
        </View>
      </ScrollView>

      <MOMOToast
        visible={!!toastMessage}
        message={toastMessage || ''}
        type="success"
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
}
