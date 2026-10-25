import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { MOMOHeader, MOMOTextField, MOMOAvatar, MOMOButton, MOMOToast } from '@/components/ui';
import { searchUsers, sendFriendRequest, acceptFriendRequest, SearchedUser } from '@/services/friendsService';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await searchUsers(query, user?.id || '');
      setResults(res);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user?.id]);

  const handleSendRequest = async (targetUser: SearchedUser) => {
    if (!user) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setActionLoadingId(targetUser.id);
    const { error } = await sendFriendRequest(user.id, targetUser.username);
    setActionLoadingId(null);

    if (error) {
      setToastMessage(error.message);
    } else {
      setToastMessage(`Đã gửi lời mời kết bạn đến @${targetUser.username} ✨`);
      setResults((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, friendship_status: 'pending_sent' } : u))
      );
    }
  };

  const handleAcceptRequest = async (targetUser: SearchedUser) => {
    if (!user || !targetUser.request_id) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setActionLoadingId(targetUser.id);
    const { error } = await acceptFriendRequest(targetUser.request_id, user.id);
    setActionLoadingId(null);

    if (error) {
      setToastMessage(error.message);
    } else {
      setToastMessage(`Bạn và @${targetUser.username} đã trở thành bạn bè! 🌸`);
      setResults((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, friendship_status: 'friends' } : u))
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Tìm bạn bè" />

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <MOMOTextField
          placeholder="Tìm theo tên hoặc @username..."
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={<Ionicons name="search" size={18} color={colors.textSecondary} />}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}
        keyboardShouldPersistTaps="handled">
        {loading && (
          <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.coral} />
          </View>
        )}

        {!loading && query.trim() !== '' && results.length === 0 && (
          <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
            <Text style={[typography.headline, { color: colors.textSecondary }]}>
              Không tìm thấy ai với "{query}"
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
              Hãy thử kiểm tra lại chính tả hoặc tìm theo @username chính xác.
            </Text>
          </View>
        )}

        {results.map((item) => {
          const isActing = actionLoadingId === item.id;
          return (
            <View
              key={item.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.xl,
                padding: spacing.md,
                marginBottom: spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}>
              <Pressable
                onPress={() => router.push(`/user/${item.id}` as any)}
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MOMOAvatar url={item.avatar_url} name={item.display_name} size="md" />
                <View style={{ flex: 1, marginLeft: spacing.md, marginRight: spacing.sm }}>
                  <Text style={[typography.headline, { color: colors.text }]} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                    @{item.username}
                  </Text>
                </View>
              </Pressable>

              {/* Action Button */}
              {item.friendship_status === 'friends' ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.surfaceMuted,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                    borderRadius: radii.full,
                  }}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginRight: 4 }} />
                  <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                    Bạn bè
                  </Text>
                </View>
              ) : item.friendship_status === 'pending_sent' ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.surfaceSubtle,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                    borderRadius: radii.full,
                  }}>
                  <Ionicons name="time-outline" size={15} color={colors.coral} style={{ marginRight: 4 }} />
                  <Text style={[typography.caption, { color: colors.coral, fontWeight: '600' }]}>
                    Đã gửi
                  </Text>
                </View>
              ) : item.friendship_status === 'pending_received' ? (
                <MOMOButton
                  title="Chấp nhận"
                  size="sm"
                  variant="primary"
                  loading={isActing}
                  onPress={() => handleAcceptRequest(item)}
                />
              ) : (
                <MOMOButton
                  title="Kết bạn"
                  size="sm"
                  variant="outline"
                  loading={isActing}
                  onPress={() => handleSendRequest(item)}
                />
              )}
            </View>
          );
        })}
      </ScrollView>

      <MOMOToast
        visible={!!toastMessage}
        message={toastMessage || ''}
        type={toastMessage?.includes('bạn bè') ? 'success' : 'info'}
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
}
