import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, FlatList, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import {
  MOMOHeader,
  MOMOAvatar,
  MOMOButton,
  MOMOPhotoCard,
  MOMOEmptyState,
} from '@/components/ui';
import { getGroups, getFriends } from '@/services/friendsService';
import { getFeedMoments } from '@/services/momentsService';
import { Group, Profile, Moment } from '@/lib/supabase';

export default function GroupDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);

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
      setMoments(feed.filter((m) => m.group_name === found?.name));
    }
    load();
  }, [id, user]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title={group?.name || 'Nhóm riêng'} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}>
        {/* Circle Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xxl,
            padding: spacing.xl,
            alignItems: 'center',
            marginBottom: spacing.lg,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radii.full,
              backgroundColor: colors.blushLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}>
            <Ionicons name="people" size={36} color={colors.blush} />
          </View>
          <Text style={[typography.title2, { fontWeight: '800', color: colors.text }]}>
            {group?.name || 'Nhóm riêng'}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            Nhóm chia sẻ riêng tư • {members.length} thành viên
          </Text>

          {/* Members row */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
            {members.slice(0, 5).map((m) => (
              <MOMOAvatar key={m.id} url={m.avatar_url} name={m.display_name} size="sm" />
            ))}
          </View>

          <MOMOButton
            title="Chụp khoảnh khắc vào nhóm"
            onPress={() => router.push('/(tabs)/camera')}
            variant="primary"
            size="md"
            style={{ marginTop: spacing.lg, width: '100%' }}
          />
        </View>

        {/* Moments in this circle */}
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '700' }]}>
          KHOẢNH KHẮC TRONG NHÓM NÀY
        </Text>

        {moments.length === 0 ? (
          <MOMOEmptyState
            icon="images-outline"
            title="Chưa có khoảnh khắc nhóm nào"
            description="Chụp một bức ảnh nhanh và gửi riêng vào nhóm này."
            actionTitle="Chụp ảnh ngay"
            onAction={() => router.push('/(tabs)/camera')}
          />
        ) : (
          moments.map((item) => (
            <MOMOPhotoCard
              key={item.id}
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
              reactions={item.reactions}
              userReaction={item.user_reaction}
              onReact={() => {}}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
