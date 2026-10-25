import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import {
  MOMOHeader,
  MOMOAvatar,
  MOMOButton,
  MOMOIconButton,
  MOMOBottomSheet,
  MOMOTextField,
  MOMOToast,
} from '@/components/ui';
import {
  getFriends,
  getFriendRequests,
  getGroups,
  sendFriendRequest,
  createGroup,
} from '@/services/friendsService';
import { Profile, FriendRequest, Group } from '@/lib/supabase';

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { user } = useAuth();

  const [friends, setFriends] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Add friend dialog
  const [addFriendVisible, setAddFriendVisible] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Create group dialog
  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [f, r, g] = await Promise.all([
        getFriends(user.id),
        getFriendRequests(user.id),
        getGroups(user.id),
      ]);
      setFriends(f);
      setRequests(r);
      setGroups(g);
    } catch (err) {
      console.warn('Friends load error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendFriendRequest = async () => {
    if (!usernameInput.trim() || !user) return;
    setAddLoading(true);
    setAddError(null);

    const { error } = await sendFriendRequest(user.id, usernameInput.trim());
    setAddLoading(false);

    if (error) {
      setAddError(error.message);
    } else {
      setAddFriendVisible(false);
      setUsernameInput('');
      setToastMessage(`Đã gửi lời mời kết bạn đến @${usernameInput.trim()} ✨`);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupNameInput.trim() || !user) return;
    setGroupLoading(true);
    await createGroup(user.id, groupNameInput.trim());
    setGroupLoading(false);
    setCreateGroupVisible(false);
    setGroupNameInput('');
    setToastMessage('Tạo nhóm riêng thành công ✨');
    loadData();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader
        title="Bạn bè & Nhóm riêng"
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MOMOIconButton
              icon={<Ionicons name="search" size={20} color={colors.text} />}
              onPress={() => router.push('/search')}
              accessibilityLabel="Tìm kiếm"
              size={38}
              style={{ marginRight: spacing.xs }}
            />
            <MOMOIconButton
              icon={<Ionicons name="person-add" size={19} color={colors.coral} />}
              onPress={() => setAddFriendVisible(true)}
              accessibilityLabel="Thêm bạn"
              size={38}
            />
          </View>
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
              loadData();
            }}
            tintColor={colors.coral}
          />
        }>
        {/* Pending Requests Banner */}
        {requests.length > 0 && (
          <Pressable
            onPress={() => router.push('/friend-requests')}
            style={{
              backgroundColor: colors.coralLight,
              borderRadius: radii.lg,
              padding: spacing.md,
              marginBottom: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.coral,
            }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.full,
                backgroundColor: colors.coral,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
              }}>
              <Ionicons name="mail-unread" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.headline, { color: colors.coralDark, fontWeight: '700' }]}>
                {requests.length} Lời mời kết bạn
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Chạm để xem và chấp nhận
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.coral} />
          </Pressable>
        )}

        {/* Private Groups Section */}
        <View style={{ marginBottom: spacing.xl }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.sm,
            }}>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
              NHÓM RIÊNG TƯ
            </Text>
            <Pressable onPress={() => setCreateGroupVisible(true)}>
              <Text style={[typography.caption, { color: colors.coral, fontWeight: '700' }]}>
                + Tạo nhóm mới
              </Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {groups.map((group) => (
              <Pressable
                key={group.id}
                onPress={() => router.push(`/group/${group.id}` as any)}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.xl,
                  padding: spacing.md,
                  marginRight: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  width: 140,
                  alignItems: 'center',
                }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: radii.full,
                    backgroundColor: colors.blushLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.sm,
                  }}>
                  <Ionicons name="people" size={26} color={colors.blush} />
                </View>
                <Text
                  style={[typography.callout, { fontWeight: '700', color: colors.text, textAlign: 'center' }]}
                  numberOfLines={1}>
                  {group.name}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  {group.member_count || 1} thành viên
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Close Friends List */}
        <View>
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '700' },
            ]}>
            BẠN THÂN ({friends.length})
          </Text>

          {friends.map((friend, index) => (
            <Pressable
              key={friend.id}
              onPress={() => router.push(`/user/${friend.id}` as any)}
              style={({ pressed }) => ({
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              })}>
              <MOMOAvatar
                url={friend.avatar_url}
                name={friend.display_name}
                size="md"
                isOnline={index === 0}
              />

              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.headline, { color: colors.text }]}>
                  {friend.display_name}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  @{friend.username}
                </Text>
                {friend.bio && (
                  <Text
                    style={[
                      typography.footnote,
                      { color: colors.textSecondary, marginTop: 2 },
                    ]}
                    numberOfLines={1}>
                    {friend.bio}
                  </Text>
                )}
              </View>

              <MOMOIconButton
                icon={<Ionicons name="camera-outline" size={20} color={colors.coral} />}
                onPress={() => router.push('/(tabs)/camera')}
                accessibilityLabel={`Gửi khoảnh khắc cho ${friend.display_name}`}
                variant="subtle"
                size={38}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Add Friend Bottom Sheet */}
      <MOMOBottomSheet
        visible={addFriendVisible}
        onClose={() => setAddFriendVisible(false)}
        title="Thêm bạn thân">
        <View style={{ paddingBottom: spacing.xl }}>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Nhập username MOMO của bạn bè để gửi lời mời kết nối vào vòng bạn thân.
          </Text>

          <MOMOTextField
            label="Tên người dùng (Username)"
            placeholder="Ví dụ: nguyen_momo"
            value={usernameInput}
            onChangeText={setUsernameInput}
            autoCapitalize="none"
            error={addError || undefined}
            leftIcon={<Ionicons name="at" size={18} color={colors.textSecondary} />}
          />

          <MOMOButton
            title="Gửi lời mời kết bạn"
            onPress={handleSendFriendRequest}
            loading={addLoading}
            variant="primary"
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </MOMOBottomSheet>

      {/* Create Group Bottom Sheet */}
      <MOMOBottomSheet
        visible={createGroupVisible}
        onClose={() => setCreateGroupVisible(false)}
        title="Tạo nhóm riêng tư">
        <View style={{ paddingBottom: spacing.xl }}>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Tạo một nhóm chia sẻ riêng tư (như "Gia đình", "Bạn thân", "Cạ cứng") cho các khoảnh khắc chung.
          </Text>

          <MOMOTextField
            label="Tên nhóm"
            placeholder="Ví dụ: Hội cà phê cuối tuần"
            value={groupNameInput}
            onChangeText={setGroupNameInput}
          />

          <MOMOButton
            title="Tạo nhóm"
            onPress={handleCreateGroup}
            loading={groupLoading}
            variant="primary"
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </MOMOBottomSheet>

      <MOMOToast
        visible={!!toastMessage}
        message={toastMessage || ''}
        type="success"
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
}
