import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import {
  MOMOHeader,
  MOMOAvatar,
  MOMOButton,
  MOMOIconButton,
  MOMOEmptyState,
  MOMOToast,
} from '@/components/ui';
import {
  getUserProfile,
  getFriendshipStatus,
  sendFriendRequest,
  removeFriend,
} from '@/services/friendsService';
import { getUserPhotos } from '@/services/photoStorageService';
import { Profile, Photo } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii, shadows } = useTheme();
  const { user } = useAuth();

  const [targetUser, setTargetUser] = useState<Profile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [relationship, setRelationship] = useState<'accepted' | 'pending' | 'none' | 'self'>('none');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadUserData = useCallback(async () => {
    if (!id || !user) return;

    if (id === user.id) {
      router.replace('/(tabs)/profile');
      return;
    }

    try {
      const [prof, rel, userPhotos] = await Promise.all([
        getUserProfile(id),
        getFriendshipStatus(user.id, id),
        getUserPhotos(id, user.id),
      ]);

      setTargetUser(prof);
      setRelationship(rel);
      setPhotos(userPhotos);
    } catch (err) {
      console.warn('Failed to load user profile & photos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, user, router]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleAddFriend = async () => {
    if (!targetUser || !user) return;
    setActionLoading(true);
    const { error } = await sendFriendRequest(user.id, targetUser.username);
    setActionLoading(false);

    if (error) {
      Alert.alert('Thông báo', error.message);
    } else {
      setRelationship('pending');
      setToastMessage(`Đã gửi lời mời kết bạn đến @${targetUser.username} ✨`);
    }
  };

  const handleConfirmUnfriend = () => {
    if (!targetUser || !user) return;
    Alert.alert(
      'Hủy kết bạn',
      `Bạn có chắc chắn muốn hủy kết bạn với ${targetUser.display_name}? Bạn sẽ không thể xem ảnh riêng tư của nhau nữa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Hủy kết bạn',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            await removeFriend(user.id, targetUser.id);
            setActionLoading(false);
            setRelationship('none');
            setPhotos([]);
            setToastMessage(`Đã hủy kết bạn với ${targetUser.display_name}`);
          },
        },
      ]
    );
  };

  const gridItemWidth = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  if (!targetUser) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'center' }}>
        <MOMOEmptyState
          icon="person-outline"
          title="Không tìm thấy người dùng"
          description="Người dùng này có thể đã đổi tên hoặc tài khoản không tồn tại."
          actionTitle="Quay lại"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const isFriend = relationship === 'accepted';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader
        showBack
        title={`@${targetUser.username}`}
        rightAction={
          isFriend ? (
            <MOMOIconButton
              icon={<Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />}
              onPress={handleConfirmUnfriend}
              accessibilityLabel="Tùy chọn bạn bè"
            />
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadUserData();
            }}
            tintColor={colors.coral}
          />
        }>
        {/* Profile Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xxl,
            padding: spacing.xl,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            marginVertical: spacing.md,
            ...shadows.sm,
          }}>
          <MOMOAvatar
            url={targetUser.avatar_url}
            name={targetUser.display_name}
            size="xl"
          />

          <Text style={[typography.title2, { color: colors.text, marginTop: spacing.md }]}>
            {targetUser.display_name}
          </Text>

          <Text style={[typography.caption, { color: colors.coral, fontWeight: '700', marginTop: 2 }]}>
            @{targetUser.username}
          </Text>

          {targetUser.bio && (
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.md },
              ]}>
              {targetUser.bio}
            </Text>
          )}

          {/* Stats Bar */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              marginTop: spacing.lg,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}>
            <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl }}>
              <Text style={[typography.title3, { color: colors.text, fontWeight: '700' }]}>
                {photos.length}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Khoảnh khắc
              </Text>
            </View>

            <View style={{ width: 1, height: 28, backgroundColor: colors.border }} />

            <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl }}>
              <View
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 2,
                  borderRadius: radii.full,
                  backgroundColor: isFriend ? '#E6F4EA' : relationship === 'pending' ? '#FEF7E0' : colors.surfaceMuted,
                }}>
                <Text
                  style={[
                    typography.caption,
                    {
                      fontWeight: '700',
                      color: isFriend ? '#137333' : relationship === 'pending' ? '#B06000' : colors.textSecondary,
                    },
                  ]}>
                  {isFriend ? 'Bạn thân ✨' : relationship === 'pending' ? 'Đang chờ' : 'Chưa kết bạn'}
                </Text>
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Mối quan hệ
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <View style={{ width: '100%', marginTop: spacing.lg }}>
            {isFriend ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <MOMOButton
                  title="Nhắn tin 💬"
                  variant="primary"
                  onPress={() => router.push({ pathname: '/chat/[id]', params: { id: targetUser.id, type: 'direct' } })}
                  style={{ flex: 1 }}
                />
                <MOMOButton
                  title="Gửi ảnh 📸"
                  variant="secondary"
                  onPress={() => router.push('/(tabs)/camera')}
                  style={{ flex: 1 }}
                />
              </View>
            ) : relationship === 'pending' ? (
              <MOMOButton
                title="Đã gửi lời mời kết bạn"
                variant="secondary"
                disabled
                onPress={() => {}}
              />
            ) : (
              <MOMOButton
                title="Kết bạn để xem ảnh"
                icon={<Ionicons name="person-add" size={18} color="#FFFFFF" />}
                loading={actionLoading}
                onPress={handleAddFriend}
              />
            )}
          </View>
        </View>

        {/* Photos Grid Section */}
        <View style={{ marginTop: spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}>
            <Text style={[typography.headline, { color: colors.text }]}>
              Tất cả ảnh của {targetUser.display_name}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
              {photos.length} ẢNH
            </Text>
          </View>

          {!isFriend ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.xl,
                padding: spacing.xl,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                marginTop: spacing.sm,
              }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: radii.full,
                  backgroundColor: colors.blushLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.md,
                }}>
                <Ionicons name="lock-closed" size={28} color={colors.coral} />
              </View>
              <Text style={[typography.title3, { color: colors.text, textAlign: 'center' }]}>
                Tài khoản riêng tư
              </Text>
              <Text
                style={[
                  typography.subhead,
                  { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 },
                ]}>
                Chỉ những người bạn thân đã được chấp nhận mới có thể xem ảnh và khoảnh khắc của {targetUser.display_name}.
              </Text>
            </View>
          ) : photos.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.xl,
                padding: spacing.xl,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                marginTop: spacing.sm,
              }}>
              <Ionicons name="images-outline" size={44} color={colors.textSecondary} />
              <Text style={[typography.headline, { color: colors.text, marginTop: spacing.md }]}>
                Chưa có ảnh nào
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
                {targetUser.display_name} chưa chia sẻ khoảnh khắc nào. Hãy nhắc bạn ấy chụp ảnh nhé!
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {photos.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/moment/${item.id}` as any)}
                  style={{
                    width: gridItemWidth,
                    height: gridItemWidth * 1.3,
                    borderRadius: radii.md,
                    overflow: 'hidden',
                    backgroundColor: colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                  <ExpoImage
                    source={{ uri: item.thumbnail_url || item.thumbnail_path || item.object_path }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                  {item.caption && (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: 4,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                      }}>
                      <Text
                        style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}
                        numberOfLines={1}>
                        {item.caption}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
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
