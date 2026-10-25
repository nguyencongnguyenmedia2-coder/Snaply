import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { MOMOButton } from './MOMOButton';

export interface MOMOEmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const MOMOEmptyState: React.FC<MOMOEmptyStateProps> = ({
  icon = 'sparkles-outline',
  title,
  description,
  actionTitle,
  onAction,
  style,
}) => {
  const { colors, typography, spacing, radii } = useTheme();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xxl,
          paddingVertical: spacing.xxxl,
        },
        style,
      ]}>
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: radii.full,
          backgroundColor: colors.coralLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        }}>
        <Ionicons name={icon} size={36} color={colors.coral} />
      </View>

      <Text
        style={[
          typography.title3,
          {
            color: colors.text,
            textAlign: 'center',
            marginBottom: spacing.xs,
            fontWeight: '700',
          },
        ]}>
        {title}
      </Text>

      <Text
        style={[
          typography.body,
          {
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: actionTitle ? spacing.xl : 0,
            lineHeight: 22,
          },
        ]}>
        {description}
      </Text>

      {actionTitle && onAction && (
        <MOMOButton
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="md"
        />
      )}
    </View>
  );
};
