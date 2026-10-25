import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

export interface MOMOHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  subtitle?: string;
  style?: ViewStyle;
}

export const MOMOHeader: React.FC<MOMOHeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightAction,
  subtitle,
  style,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      style={[
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.background,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 52 + insets.top,
        },
        style,
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {showBack && (
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [
              {
                width: 36,
                height: 36,
                borderRadius: radii.full,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.sm,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
        )}

        <View style={{ flex: 1 }}>
          {title && (
            <Text
              style={[
                typography.title2,
                { color: colors.text, fontWeight: '800', letterSpacing: -0.3 },
              ]}
              numberOfLines={1}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, fontWeight: '500' },
              ]}
              numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {rightAction && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {rightAction}
        </View>
      )}
    </View>
  );
};
