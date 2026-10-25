import React from 'react';
import {
  Pressable,
  ViewStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';

export interface MOMOIconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number;
  variant?: 'surface' | 'subtle' | 'coral' | 'ghost' | 'glass';
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel: string;
}

export const MOMOIconButton: React.FC<MOMOIconButtonProps> = ({
  icon,
  onPress,
  size = 42,
  variant = 'surface',
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const { colors, radii, shadows } = useTheme();

  const handlePress = () => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onPress();
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'subtle':
        return colors.coralLight;
      case 'coral':
        return colors.coral;
      case 'ghost':
        return 'transparent';
      case 'glass':
        return colors.surface + 'D9';
      case 'surface':
      default:
        return colors.surface;
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radii.full,
          backgroundColor: getBackgroundColor(),
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed && !disabled ? 0.94 : 1 }],
          ...(variant === 'surface' || variant === 'glass' ? shadows.sm : {}),
        },
        style,
      ]}>
      {icon}
    </Pressable>
  );
};
