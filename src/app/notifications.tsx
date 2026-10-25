import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MOMOHeader, MOMOAvatar, MOMOEmptyState } from '@/components/ui';

interface NotificationItem {
  id: string;
  type: 'moment' | 'reaction' | 'friend';
  title: string;
  subtitle: string;
  avatarUrl?: string;
  timestamp: string;
}

const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'moment',
    title: 'Sarah Miller shared a new moment',
    subtitle: 'Golden hour in the garden with the little one 🌸',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    timestamp: '15m ago',
  },
  {
    id: 'notif-2',
    type: 'reaction',
    title: 'Leo Chen reacted ❤️ to your moment',
    subtitle: 'Morning brew overlooking the hills',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    timestamp: '2h ago',
  },
  {
    id: 'notif-3',
    type: 'friend',
    title: 'Elena Vance sent you a friend request',
    subtitle: 'Tap to review and add to your circle',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    timestamp: '3h ago',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Notifications" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}>
        {SAMPLE_NOTIFICATIONS.map((item) => (
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
            <MOMOAvatar url={item.avatarUrl} size="sm" />

            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.headline, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {item.subtitle}
              </Text>
              <Text style={[typography.caption, { color: colors.coral, marginTop: 2, fontWeight: '600' }]}>
                {item.timestamp}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
