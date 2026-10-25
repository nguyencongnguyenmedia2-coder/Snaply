import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { MOMOButton } from './MOMOButton';

export interface MOMOErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const MOMOErrorState: React.FC<MOMOErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We could not load this moment. Please check your connection and try again.',
  onRetry,
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
          width: 72,
          height: 72,
          borderRadius: radii.full,
          backgroundColor: colors.errorLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        }}>
        <Ionicons name="alert-circle-outline" size={36} color={colors.error} />
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
            marginBottom: onRetry ? spacing.xl : 0,
            lineHeight: 22,
          },
        ]}>
        {message}
      </Text>

      {onRetry && (
        <MOMOButton
          title="Try Again"
          onPress={onRetry}
          variant="secondary"
          size="md"
        />
      )}
    </View>
  );
};
