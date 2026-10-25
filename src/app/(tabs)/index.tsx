import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import {
  MOMOAvatar,
  MOMOPhotoCard,
  MOMOEmptyState,
  MOMOSkeleton,
  MOMOBottomSheet,
  MOMOButton,
  MOMOIconButton,
  MOMOToast,
} from '@/components/ui';
import {
  getFeedMoments,
  reactToMoment,
  deleteMoment,
} from '@/services/momentsService';
import { getFriends, getGroups } from '@/services/friendsService';
import { realtimeManager } from '@/services/realtimeService';
import { getActiveReefs, Reef } from '@/services/reefService';
import { ReefViewerModal } from '@/components/reef/ReefViewerModal';
import { Moment, Profile, Group } from '@/lib/supabase';

export default function HomeFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { user } = useAuth();

  const [moments, setMoments] = useState<Moment[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [reefs, setReefs] = useState<Reef[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reef Viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerReefs, setViewerReefs] = useState<Reef[]>([]);

  // Moment actions bottom sheet
  const [activeMoment, setActiveMoment] = useState<Moment | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [feedData, friendsData, groupsData, reefsData] = await Promise.all([
        getFeedMoments(user?.id),
        getFriends(user?.id || 'demo'),
        getGroups(user?.id || 'demo'),
        getActiveReefs(user?.id || 'demo'),
      ]);
      setMoments(feedData);
      setFriends(friendsData);
      setGroups(groupsData);
      setReefs(reefsData);
    } catch (err) {
      console.warn('Failed to load feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();

    // Subscribe to real-time moment and reaction updates
    const unsubMoments = realtimeManager.subscribeToMoments(
      user?.id || 'demo',
      (newMoment) => {
        setMoments((prev) => {
          if (prev.some((m) => m.id === newMoment.id)) return prev;
          return [newMoment, ...prev];
        });
      },
      (deletedId) => {
        setMoments((prev) => prev.filter((m) => m.id !== deletedId));
      }
    );

    const unsubReactions = realtimeManager.subscribeToReactions(
      (momentId, emoji, _userId, isAdded) => {
        setMoments((prev) =>
          prev.map((m) => {
            if (m.id !== momentId) return m;
            const reactions = { ...(m.reactions || {}) };
            if (isAdded) {
              reactions[emoji] = (reactions[emoji] || 0) + 1;
            } else {
              reactions[emoji] = Math.max(0, (reactions[emoji] || 1) - 1);
            }
            return { ...m, reactions };
          })
        );
      }
    );

    return () => {
      unsubMoments();
      unsubReactions();
    };
  }, [loadData, user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleReact = async (momentId: string, emoji: string) => {
    if (!user) return;
    // Optimistic UI update
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        let newUserReaction: string | null = emoji;

        if (m.user_reaction === emoji) {
          currentReactions[emoji] = Math.max(0, (currentReactions[emoji] || 1) - 1);
          newUserReaction = null;
        } else {
          if (m.user_reaction && currentReactions[m.user_reaction]) {
            currentReactions[m.user_reaction] = Math.max(
              0,
              currentReactions[m.user_reaction] - 1
            );
          }
          currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
        }

        return {
          ...m,
          reactions: currentReactions,
          user_reaction: newUserReaction,
        };
      })
    );

    await reactToMoment(momentId, emoji, user.id);
  };

  const handleDeleteActiveMoment = async () => {
    if (!activeMoment || !user) return;
    setSheetVisible(false);
    await deleteMoment(activeMoment.id, user.id);
    setMoments((prev) => prev.filter((m) => m.id !== activeMoment.id));
    setToastMessage('Đã xóa khoảnh khắc khỏi bảng tin.');
  };

  const filteredMoments = moments.filter((m) => {
    if (selectedFilter === 'all') return true;
    return m.group_name?.toLowerCase() === selectedFilter.toLowerCase();
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top, 14),
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            source={require('../../../assets/images/icon.png')}
            style={{ width: 38, height: 38, borderRadius: radii.md, marginRight: spacing.sm }}
          />
          <View>
            <Text
              style={[
                typography.title1,
                { color: colors.coral, fontWeight: '900', letterSpacing: -0.5 },
              ]}>
              Snaply
            </Text>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, fontWeight: '600' },
              ]}>
              Khoảnh khắc nhỏ, gắn kết hơn.
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MOMOIconButton
            icon={<Ionicons name="sparkles" size={19} color={colors.coral} />}
            onPress={() => router.push('/widget-config')}
            accessibilityLabel="Cài đặt Widget"
            size={38}
            style={{ marginRight: spacing.sm }}
          />

          <MOMOIconButton
            icon={<Ionicons name="notifications-outline" size={20} color={colors.text} />}
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Thông báo"
            size={38}
          />
        </View>
      </View>

      {/* Friends Horizontal Story & Reef Bar */}
      <View style={{ paddingVertical: spacing.xs }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            alignItems: 'center',
          }}>
          {/* Post Reef / Story Button */}
          <Pressable
            onPress={() => router.push('/reef/create')}
            style={{ alignItems: 'center', marginRight: spacing.md }}
            accessibilityRole="button"
            accessibilityLabel="Đăng tin Reef">
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: radii.full,
                borderWidth: 2,
                borderColor: colors.coral,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.coralLight,
                marginBottom: 4,
              }}>
              <Ionicons name="sparkles" size={24} color={colors.coral} />
            </View>
            <Text
              style={[
                typography.caption,
                { color: colors.coral, fontWeight: '700' },
              ]}>
              + Đăng tin
            </Text>
          </Pressable>

          {/* Quick Camera Shortcut */}
          <Pressable
            onPress={() => router.push('/(tabs)/camera')}
            style={{ alignItems: 'center', marginRight: spacing.md }}
            accessibilityRole="button"
            accessibilityLabel="Chụp nhanh">
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: radii.full,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
                marginBottom: 4,
              }}>
              <Ionicons name="camera" size={22} color={colors.textSecondary} />
            </View>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, fontWeight: '500' },
              ]}>
              Camera
            </Text>
          </Pressable>

          {/* Friends Reef list */}
          {friends.map((friend, idx) => {
            const friendReefs = reefs.filter((r) => r.owner_id === friend.id);
            const hasReefs = friendReefs.length > 0 || idx < 2; // Active story indicator

            const handleFriendPress = () => {
              if (friendReefs.length > 0) {
                setViewerReefs(friendReefs);
                setViewerVisible(true);
              } else {
                router.push(`/user/${friend.id}` as any);
              }
            };

            return (
              <Pressable
                key={friend.id}
                onPress={handleFriendPress}
                style={{ alignItems: 'center', marginRight: spacing.md }}
                accessibilityRole="button"
                accessibilityLabel={`Xem tin Reef của ${friend.display_name}`}>
                <View
                  style={{
                    padding: 2.5,
                    borderRadius: radii.full,
                    borderWidth: hasReefs ? 2.5 : 1,
                    borderColor: hasReefs ? colors.coral : 'transparent',
                    marginBottom: 2,
                  }}>
                  <MOMOAvatar
                    url={friend.avatar_url}
                    name={friend.display_name}
                    size="md"
                    isOnline={idx === 0}
                  />
                </View>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: hasReefs ? colors.text : colors.textSecondary,
                      fontWeight: hasReefs ? '700' : '500',
                      maxWidth: 64,
                    },
                  ]}
                  numberOfLines={1}>
                  {friend.display_name.split(' ')[0]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter Chips */}
      <View style={{ paddingVertical: spacing.xs }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            alignItems: 'center',
          }}>
          <Pressable
            onPress={() => setSelectedFilter('all')}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radii.full,
              backgroundColor:
                selectedFilter === 'all' ? colors.coral : colors.surface,
              marginRight: spacing.sm,
              borderWidth: 1,
              borderColor:
                selectedFilter === 'all' ? colors.coral : colors.border,
            }}>
            <Text
              style={[
                typography.caption,
                {
                  fontWeight: '700',
                  color: selectedFilter === 'all' ? '#FFFFFF' : colors.text,
                },
              ]}>
              Tất cả bạn bè
            </Text>
          </Pressable>

          {groups.map((grp) => {
            const isSelected = selectedFilter === grp.name;
            return (
              <Pressable
                key={grp.id}
                onPress={() => setSelectedFilter(grp.name)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radii.full,
                  backgroundColor: isSelected ? colors.coral : colors.surface,
                  marginRight: spacing.sm,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.coral : colors.border,
                }}>
                <Text
                  style={[
                    typography.caption,
                    {
                      fontWeight: '700',
                      color: isSelected ? '#FFFFFF' : colors.text,
                    },
                  ]}>
                  {grp.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Feed */}
      {loading ? (
        <View style={{ padding: spacing.lg }}>
          <MOMOSkeleton height={400} borderRadius={radii.xl} style={{ marginBottom: spacing.lg }} />
          <MOMOSkeleton height={400} borderRadius={radii.xl} />
        </View>
      ) : filteredMoments.length === 0 ? (
        <MOMOEmptyState
          icon="camera-outline"
          title="Chưa có khoảnh khắc nào"
          description="Hãy là người đầu tiên chia sẻ khoảnh khắc với bạn bè hoặc thêm bạn thân mới."
          actionTitle="Chụp khoảnh khắc ngay"
          onAction={() => router.push('/(tabs)/camera')}
          style={{ marginTop: spacing.xxl }}
        />
      ) : (
        <FlatList
          data={filteredMoments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + 80,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.coral}
              colors={[colors.coral]}
            />
          }
          renderItem={({ item }) => (
            <MOMOPhotoCard
              id={item.id}
              author={{
                id: item.owner?.id || item.owner_id,
                name: item.owner?.display_name || 'Friend',
                username: item.owner?.username || 'friend',
                avatar_url: item.owner?.avatar_url,
              }}
              imageUrl={item.media_url}
              caption={item.caption}
              createdAt={item.created_at}
              groupName={item.group_name}
              reactions={item.reactions}
              userReaction={item.user_reaction}
              onReact={(emoji) => handleReact(item.id, emoji)}
              onPressAuthor={() => {
                const authorId = item.owner?.id || item.owner_id;
                if (authorId === user?.id) {
                  router.push('/(tabs)/profile');
                } else {
                  router.push(`/user/${authorId}` as any);
                }
              }}
              onOptionsPress={() => {
                setActiveMoment(item);
                setSheetVisible(true);
              }}
            />
          )}
        />
      )}

      {/* Moment Options Bottom Sheet */}
      <MOMOBottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Tùy chọn khoảnh khắc">
        <View style={{ paddingBottom: spacing.xl }}>
          {activeMoment?.owner_id === user?.id ? (
            <MOMOButton
              title="Xóa khoảnh khắc này"
              variant="danger"
              onPress={handleDeleteActiveMoment}
              style={{ marginBottom: spacing.md }}
            />
          ) : (
            <MOMOButton
              title="Báo cáo nội dung không phù hợp"
              variant="outline"
              onPress={() => {
                setSheetVisible(false);
                router.push({
                  pathname: '/report',
                  params: { momentId: activeMoment?.id },
                });
              }}
              style={{ marginBottom: spacing.md }}
            />
          )}

          <MOMOButton
            title="Lưu vào Kỷ niệm cá nhân"
            variant="secondary"
            onPress={() => {
              setSheetVisible(false);
              setToastMessage('Đã lưu vào kỷ niệm cá nhân ✨');
            }}
            style={{ marginBottom: spacing.md }}
          />

          <MOMOButton
            title="Cài đặt Widget màn hình chính"
            variant="ghost"
            onPress={() => {
              setSheetVisible(false);
              router.push('/widget-config');
            }}
          />
        </View>
      </MOMOBottomSheet>

      <MOMOToast
        visible={!!toastMessage}
        message={toastMessage || ''}
        type="success"
        onDismiss={() => setToastMessage(null)}
      />

      <ReefViewerModal
        visible={viewerVisible}
        reefs={viewerReefs}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}
