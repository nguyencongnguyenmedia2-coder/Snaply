import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { MOMOHeader, MOMOAvatar, MOMOTextField, MOMOButton } from '@/components/ui';
import { getFriends } from '@/services/friendsService';
import { createChatGroup } from '@/services/chatService';
import { Profile } from '@/lib/supabase';

const GROUP_AVATAR_OPTIONS = [
  '👥', '☕', '🌸', '⚡', '🍕', '🎉', '🏖️', '🐱', '🔥', '💖'
];

export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii, shadows } = useTheme();
  const { user } = useAuth();

  const [groupName, setGroupName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👥');
  const [friends, setFriends] = useState<Profile[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        setFriendsLoading(true);
        const list = await getFriends(user.id);
        setFriends(list);
      } finally {
        setFriendsLoading(false);
      }
    }
    load();
  }, [user]);

  const toggleMember = (friendId: string) => {
    triggerHaptic();
    setSelectedMemberIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setErrorMessage('Vui lòng đặt tên cho nhóm nhắn tin.');
      return;
    }
    if (!user) return;

    triggerHaptic();
    setLoading(true);
    setErrorMessage(null);

    try {
      const newGroup = await createChatGroup({
        ownerId: user.id,
        name: groupName.trim(),
        memberIds: selectedMemberIds,
        avatarUrl: `https://avatar.vercel.sh/${encodeURIComponent(groupName)}?text=${encodeURIComponent(selectedEmoji)}`,
      });

      // Redirect directly to the newly created group chat!
      router.replace({
        pathname: '/chat/[id]',
        params: { id: newGroup.id, type: 'group' },
      });
    } catch (err: any) {
      console.warn('Create group error:', err);
      setErrorMessage(err.message || 'Không thể tạo nhóm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MOMOHeader showBack title="Tạo nhóm nhắn tin" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Emoji Icon Picker */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
            BIỂU TƯỢNG NHÓM
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
            {GROUP_AVATAR_OPTIONS.map((emoji) => {
              const isSelected = selectedEmoji === emoji;
              return (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedEmoji(emoji);
                  }}
                  style={[
                    styles.emojiBtn,
                    {
                      backgroundColor: isSelected ? colors.coralLight : colors.surfaceSubtle,
                      borderColor: isSelected ? colors.coral : colors.border,
                    },
                  ]}>
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Group Name Field */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
            TÊN NHÓM
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
          <MOMOTextField
            placeholder="Ví dụ: Hội bạn thân, Cà phê sáng..."
            value={groupName}
            onChangeText={(text) => {
              setGroupName(text);
              if (errorMessage) setErrorMessage(null);
            }}
            maxLength={40}
            leftIcon={<Ionicons name="chatbubbles" size={20} color={colors.coral} />}
          />
        </View>

        {/* Member Selection */}
        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
            CHỌN THÀNH VIÊN ({selectedMemberIds.length} ĐÃ CHỌN)
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
          {friendsLoading ? (
            <ActivityIndicator size="small" color={colors.coral} style={{ padding: 20 }} />
          ) : friends.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={[typography.callout, { color: colors.textSecondary }]}>
                Chưa có bạn bè nào để thêm. Bạn vẫn có thể tạo nhóm trước!
              </Text>
            </View>
          ) : (
            friends.map((friend) => {
              const isSelected = selectedMemberIds.includes(friend.id);
              return (
                <Pressable
                  key={friend.id}
                  onPress={() => toggleMember(friend.id)}
                  style={[
                    styles.friendRow,
                    { borderBottomColor: colors.border },
                  ]}>
                  <MOMOAvatar url={friend.avatar_url} name={friend.display_name} size="sm" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[typography.headline, { color: colors.text, fontWeight: '600' }]}>
                      {friend.display_name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      @{friend.username}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? colors.coral : 'transparent',
                        borderColor: isSelected ? colors.coral : colors.border,
                      },
                    ]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Error banner */}
        {errorMessage && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={[typography.caption, { color: colors.error, marginLeft: 6, fontWeight: '600' }]}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Create Button */}
        <MOMOButton
          title={loading ? 'Đang tạo nhóm...' : 'Tạo nhóm & Trò chuyện ngay ✨'}
          onPress={handleCreate}
          loading={loading}
          variant="primary"
          size="lg"
          style={{ marginTop: 24, width: '100%' }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
  },
  emojiRow: {
    gap: 10,
    paddingVertical: 4,
  },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
});
