import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import {
  MOMOHeader,
  MOMOAvatar,
  MOMOButton,
  MOMOEmptyState,
} from '@/components/ui';
import { getGroups, getFriends } from '@/services/friendsService';
import { getFeedMoments } from '@/services/momentsService';
import { postGroupPhoto } from '@/services/chatService';
import { Group, Profile, Moment } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SPACING = 2;
const PHOTO_SIZE = (SCREEN_WIDTH - 32 - GRID_SPACING * 2) / 3;

export default function GroupDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, typography, shadows } = useTheme();
  const { user, profile } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [activeTab, setActiveTab] = useState<'gallery' | 'members'>('gallery');

  // Photo posting
  const [isPostingPhoto, setIsPostingPhoto] = useState(false);
  const [postStage, setPostStage] = useState('');

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  useEffect(() => {
    async function load() {
      if (!user) return;
      const [groups, friends, feed] = await Promise.all([
        getGroups(user.id),
        getFriends(user.id),
        getFeedMoments(user.id),
      ]);
      const found = groups.find((g) => g.id === id) || groups[0];
      setGroup(found || null);
      setMembers(friends);

      // Filter moments belonging to this group
      const groupMoments = feed.filter(
        (m) => m.group_id === id || m.group_name === found?.name
      );
      setMoments(groupMoments);
    }
    load();
  }, [id, user]);

  // Handle posting photo into group directly from gallery
  const handlePostPhotoToGroup = async () => {
    if (!user || !group) return;
    triggerHaptic();

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    try {
      setIsPostingPhoto(true);
      setPostStage('Đang xử lý ảnh...');

      await postGroupPhoto({
        groupId: group.id,
        groupName: group.name,
        ownerId: user.id,
        ownerProfile: profile,
        photoUri: result.assets[0].uri,
        onProgress: (stage) => setPostStage(stage),
      });

      // Reload group feed
      const feed = await getFeedMoments(user.id);
      const groupMoments = feed.filter(
        (m) => m.group_id === id || m.group_name === group.name
      );
      setMoments(groupMoments);
    } catch (err: any) {
      console.warn('Post group photo error:', err);
    } finally {
      setIsPostingPhoto(false);
      setPostStage('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MOMOHeader
        showBack
        title={group?.name || 'Nhóm'}
        rightAction={
          <Pressable
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: group?.id || id, type: 'group' } })}
            style={[styles.headerChatBtn, { backgroundColor: colors.coralLight }]}>
            <Ionicons name="chatbubbles" size={18} color={colors.coral} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Group Hero Card */}
        <View style={[styles.groupHeroCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
          <View style={[styles.groupAvatarCircle, { backgroundColor: colors.blushLight }]}>
            <Text style={{ fontSize: 36 }}>👥</Text>
          </View>

          <Text style={[typography.title2, { fontWeight: '800', color: colors.text, marginTop: 10 }]}>
            {group?.name || 'Nhóm riêng'}
          </Text>

          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
            Nhóm chia sẻ khoảnh khắc & nhắn tin • {members.length} thành viên
          </Text>

          {/* Action Buttons: Chat & Post Photo */}
          <View style={styles.actionRow}>
            <MOMOButton
              title="Nhắn tin nhóm 💬"
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: group?.id || id, type: 'group' } })}
              variant="primary"
              size="md"
              style={{ flex: 1, marginRight: 8 }}
            />

            <MOMOButton
              title="Đăng ảnh 📸"
              onPress={handlePostPhotoToGroup}
              variant="secondary"
              size="md"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Uploading indicator */}
        {isPostingPhoto && (
          <View style={[styles.postingToast, { backgroundColor: colors.charcoal }]}>
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
              {postStage}
            </Text>
          </View>
        )}

        {/* Tab Switcher: Kho ảnh vs Thành viên */}
        <View style={[styles.tabBar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <Pressable
            onPress={() => {
              triggerHaptic();
              setActiveTab('gallery');
            }}
            style={[
              styles.tabBtn,
              activeTab === 'gallery' && { backgroundColor: colors.surface, ...shadows.sm },
            ]}>
            <Ionicons
              name="images"
              size={16}
              color={activeTab === 'gallery' ? colors.coral : colors.textSecondary}
            />
            <Text
              style={[
                typography.caption,
                {
                  fontWeight: '700',
                  marginLeft: 6,
                  color: activeTab === 'gallery' ? colors.coral : colors.textSecondary,
                },
              ]}>
              Kho ảnh nhóm ({moments.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              triggerHaptic();
              setActiveTab('members');
            }}
            style={[
              styles.tabBtn,
              activeTab === 'members' && { backgroundColor: colors.surface, ...shadows.sm },
            ]}>
            <Ionicons
              name="people"
              size={16}
              color={activeTab === 'members' ? colors.coral : colors.textSecondary}
            />
            <Text
              style={[
                typography.caption,
                {
                  fontWeight: '700',
                  marginLeft: 6,
                  color: activeTab === 'members' ? colors.coral : colors.textSecondary,
                },
              ]}>
              Thành viên ({members.length})
            </Text>
          </Pressable>
        </View>

        {/* Tab 1: Group Moments Gallery */}
        {activeTab === 'gallery' && (
          <View>
            {moments.length === 0 ? (
              <MOMOEmptyState
                icon="images-outline"
                title="Chưa có khoảnh khắc nhóm nào"
                description="Đăng bức ảnh đầu tiên để bắt đầu kỷ niệm cùng nhóm!"
                actionTitle="Đăng ảnh vào nhóm"
                onAction={handlePostPhotoToGroup}
              />
            ) : (
              <View style={styles.photoGrid}>
                {moments.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/moment/${item.id}`)}
                    style={styles.gridItem}>
                    <Image
                      source={{ uri: item.media_url }}
                      style={styles.gridPhoto}
                      contentFit="cover"
                      transition={200}
                    />
                    {item.caption && (
                      <View style={styles.gridCaptionOverlay}>
                        <Text numberOfLines={1} style={styles.gridCaptionText}>
                          {item.caption}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tab 2: Group Members List */}
        {activeTab === 'members' && (
          <View style={[styles.membersCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {members.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/user/${m.id}` as any)}
                style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                <MOMOAvatar url={m.avatar_url} name={m.display_name} size="sm" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[typography.headline, { color: colors.text, fontWeight: '700' }]}>
                    {m.display_name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    @{m.username}
                  </Text>
                </View>

                {/* Direct Chat shortcut with member */}
                <Pressable
                  onPress={() => router.push({ pathname: '/chat/[id]', params: { id: m.id, type: 'direct' } })}
                  style={[styles.memberChatBtn, { backgroundColor: colors.coralLight }]}>
                  <Ionicons name="chatbubble-ellipses" size={16} color={colors.coral} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerChatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  groupHeroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
  },
  groupAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 18,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_SPACING,
  },
  gridItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
  },
  gridCaptionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  gridCaptionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  membersCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberChatBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postingToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 14,
  },
});
