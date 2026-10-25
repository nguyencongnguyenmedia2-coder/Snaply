import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';

export interface MOMOButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
}

export const MOMOButton: React.FC<MOMOButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  haptic = true,
}) => {
  const { colors, typography, radii, spacing } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    if (haptic && Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onPress();
  };

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    let bg: string = colors.coral;
    let borderColor: string = 'transparent';
    let borderWidth: number = 0;

    switch (variant) {
      case 'secondary':
        bg = colors.blush;
        break;
      case 'outline':
        bg = 'transparent';
        borderColor = colors.border;
        borderWidth = 1.5;
        break;
      case 'ghost':
        bg = 'transparent';
        break;
      case 'danger':
        bg = colors.error;
        break;
      case 'primary':
      default:
        bg = colors.coral;
        break;
    }

    const paddingVertical =
      size === 'sm' ? spacing.xs + 2 : size === 'lg' ? spacing.lg : spacing.md;
    const paddingHorizontal =
      size === 'sm' ? spacing.md : size === 'lg' ? spacing.xxl : spacing.xl;
    const borderRadius = size === 'sm' ? radii.sm : radii.md;

    return {
      backgroundColor: bg,
      borderColor,
      borderWidth,
      paddingVertical,
      paddingHorizontal,
      borderRadius,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
      transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
    };
  };

  const getTextStyle = (): TextStyle => {
    let color: string = colors.surface;

    switch (variant) {
      case 'secondary':
        color = colors.text;
        break;
      case 'outline':
        color = colors.text;
        break;
      case 'ghost':
        color = colors.coral;
        break;
      case 'danger':
        color = '#FFFFFF';
        break;
      case 'primary':
      default:
        color = '#FFFFFF';
        break;
    }

    const baseTypography =
      size === 'sm'
        ? typography.subhead
        : size === 'lg'
        ? typography.headline
        : typography.callout;

    return {
      ...baseTypography,
      fontWeight: '600',
      color,
    };
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [getContainerStyle(pressed), style]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.coral : '#FFFFFF'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' ? (
            <React.Fragment>{icon}</React.Fragment>
          ) : null}
          <Text
            style={[
              getTextStyle(),
              icon && iconPosition === 'left' ? { marginLeft: spacing.sm } : undefined,
              icon && iconPosition === 'right' ? { marginRight: spacing.sm } : undefined,
              textStyle,
            ]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' ? (
            <React.Fragment>{icon}</React.Fragment>
          ) : null}
        </>
      )}
    </Pressable>
  );
};
