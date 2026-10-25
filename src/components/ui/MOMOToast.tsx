import React, { useEffect, useState } from 'react';
import { View, Text, Animated, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

export interface MOMOToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onDismiss: () => void;
  duration?: number;
  style?: ViewStyle;
}

export const MOMOToast: React.FC<MOMOToastProps> = ({
  visible,
  message,
  type = 'info',
  onDismiss,
  duration = 3000,
  style,
}) => {
  const { colors, radii, spacing, typography, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const [translateY] = useState(() => new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }).start(() => onDismiss());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss, translateY]);

  if (!visible) return null;

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      case 'info':
      default:
        return 'sparkles';
    }
  };

  const getAccentColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'info':
      default:
        return colors.coral;
    }
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: Math.max(insets.top, 16) + 8,
          left: spacing.lg,
          right: spacing.lg,
          zIndex: 9999,
          transform: [{ translateY }],
        },
      ]}>
      <View
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            borderLeftWidth: 4,
            borderLeftColor: getAccentColor(),
            borderWidth: 1,
            borderColor: colors.border,
            ...shadows.lg,
          },
          style,
        ]}>
        <Ionicons
          name={getIconName()}
          size={22}
          color={getAccentColor()}
          style={{ marginRight: spacing.sm }}
        />
        <Text
          style={[
            typography.callout,
            { color: colors.text, fontWeight: '600', flex: 1 },
          ]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};
