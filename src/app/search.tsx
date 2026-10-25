import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MOMOHeader, MOMOTextField, MOMOAvatar, MOMOButton } from '@/components/ui';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();

  const [query, setQuery] = useState('');

  const mockUsers = [
    { id: '1', username: 'sarah_m', name: 'Sarah Miller', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' },
    { id: '2', username: 'leo_explores', name: 'Leo Chen', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400' },
    { id: '3', username: 'maya_bakes', name: 'Maya Tanaka', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400' },
  ];

  const results = mockUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.username.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Find Friends" />

      <View style={{ paddingHorizontal: spacing.lg }}>
        <MOMOTextField
          placeholder="Search by name or @username..."
          value={query}
          onChangeText={setQuery}
          leftIcon={<Ionicons name="search" size={18} color={colors.textSecondary} />}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}>
        {results.map((user) => (
          <View
            key={user.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing.md,
              marginBottom: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}>
            <MOMOAvatar url={user.avatar} name={user.name} size="sm" />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.headline, { color: colors.text }]}>{user.name}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>@{user.username}</Text>
            </View>
            <MOMOButton
              title="Add"
              variant="secondary"
              size="sm"
              onPress={() => router.back()}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
