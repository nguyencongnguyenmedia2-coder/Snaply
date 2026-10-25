import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import {
  MOMOHeader,
  MOMOAvatar,
  MOMOButton,
  MOMOEmptyState,
  MOMOToast,
} from '@/components/ui';
import {
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
} from '@/services/friendsService';
import { FriendRequest } from '@/lib/supabase';

export default function FriendRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { user } = useAuth();

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!user) return;
    const reqs = await getFriendRequests(user.id);
    setRequests(reqs);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [user]);

  const handleAccept = async (req: FriendRequest) => {
    if (!user) return;
    await acceptFriendRequest(req.id, user.id);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setToastMessage(`You and ${req.sender?.display_name || 'friend'} are now friends! 🌸`);
  };

  const handleDecline = async (req: FriendRequest) => {
    if (!user) return;
    await declineFriendRequest(req.id, user.id);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setToastMessage('Friend request declined.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Friend Requests" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadRequests}
            tintColor={colors.coral}
          />
        }>
        {requests.length === 0 ? (
          <MOMOEmptyState
            icon="checkmark-done-circle-outline"
            title="All caught up!"
            description="You have no pending friend requests at this time."
            actionTitle="Find Friends"
            onAction={() => router.push('/search')}
            style={{ marginTop: spacing.xxxl }}
          />
        ) : (
          requests.map((req) => (
            <View
              key={req.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.xl,
                padding: spacing.lg,
                marginBottom: spacing.md,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                <MOMOAvatar
                  url={req.sender?.avatar_url}
                  name={req.sender?.display_name}
                  size="md"
                />
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[typography.headline, { color: colors.text }]}>
                    {req.sender?.display_name || 'Someone'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    @{req.sender?.username || 'user'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <MOMOButton
                  title="Decline"
                  variant="outline"
                  size="sm"
                  onPress={() => handleDecline(req)}
                  style={{ flex: 1 }}
                />
                <MOMOButton
                  title="Accept"
                  variant="primary"
                  size="sm"
                  onPress={() => handleAccept(req)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ))
        )}
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
