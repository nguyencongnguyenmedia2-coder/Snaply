import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { Moment } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MomentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { user } = useAuth();

  const [moment, setMoment] = useState<Moment | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const moments = await getFeedMoments(user?.id);
      const found = moments.find((m) => m.id === id);
      setMoment(found || moments[0] || null);
      setLoading(false);
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

  const handleDelete = async () => {
    if (!moment || !user) return;
    await deleteMoment(moment.id, user.id);
    router.replace('/(tabs)');
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
          Moment not found or you lack permission.
        </Text>
        <MOMOButton title="Back to Feed" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader
        showBack
        title="Moment"
        rightAction={
          moment.owner_id === user?.id ? (
            <MOMOButton
              title="Delete"
              variant="ghost"
              size="sm"
              onPress={handleDelete}
              textStyle={{ color: colors.error }}
            />
          ) : (
            <MOMOButton
              title="Report"
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
          <Image
            source={{ uri: moment.media_url }}
            style={{ width: '100%', height: SCREEN_WIDTH * 1.25, backgroundColor: colors.surfaceMuted }}
            resizeMode="cover"
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
