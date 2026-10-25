import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MOMOHeader, MOMOAvatar } from '@/components/ui';

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
    title: 'Bảo Ngọc vừa chia sẻ khoảnh khắc mới',
    subtitle: 'Nắng chiều vàng rực rỡ ngoài hiên nhà 🌸',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    timestamp: '15 phút trước',
  },
  {
    id: 'notif-2',
    type: 'reaction',
    title: 'Minh Quân đã thả tim ❤️ vào khoảnh khắc của bạn',
    subtitle: 'Tách cà phê sớm trên đồi',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    timestamp: '2 giờ trước',
  },
  {
    id: 'notif-3',
    type: 'friend',
    title: 'Thùy Chi đã gửi lời mời kết bạn',
    subtitle: 'Chạm để xem và thêm vào nhóm bạn thân',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    timestamp: '3 giờ trước',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();

  const handlePress = (item: NotificationItem) => {
    if (item.type === 'friend') {
      router.push('/friend-requests');
    } else {
      router.push('/(tabs)');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Thông báo" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}>
        {SAMPLE_NOTIFICATIONS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => handlePress(item)}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.md,
              marginBottom: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            })}>
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
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
