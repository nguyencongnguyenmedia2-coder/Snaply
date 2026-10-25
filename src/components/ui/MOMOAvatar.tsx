import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export interface MOMOAvatarProps {
  url?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  hasUnseen?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

export const MOMOAvatar: React.FC<MOMOAvatarProps> = ({
  url,
  name = '?',
  size = 'md',
  hasUnseen = false,
  isOnline = false,
  style,
}) => {
  const { colors, radii, typography } = useTheme();

  const getPixelSize = () => {
    switch (size) {
      case 'xs':
        return 26;
      case 'sm':
        return 34;
      case 'lg':
        return 58;
      case 'xl':
        return 86;
      case 'md':
      default:
        return 44;
    }
  };

  const pixelSize = getPixelSize();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('') || '?';

  return (
    <View
      style={[
        {
          width: pixelSize + (hasUnseen ? 6 : 0),
          height: pixelSize + (hasUnseen ? 6 : 0),
          borderRadius: radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: hasUnseen ? 2.5 : 0,
          borderColor: colors.coral,
          padding: hasUnseen ? 2 : 0,
        },
        style,
      ]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={{
            width: pixelSize,
            height: pixelSize,
            borderRadius: pixelSize / 2,
            backgroundColor: colors.coralLight,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: pixelSize,
            height: pixelSize,
            borderRadius: pixelSize / 2,
            backgroundColor: colors.blush,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text
            style={{
              color: colors.charcoal || '#292526',
              fontSize: pixelSize * 0.4,
              fontWeight: '700',
            }}>
            {initials}
          </Text>
        </View>
      )}

      {isOnline && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: Math.max(10, pixelSize * 0.28),
            height: Math.max(10, pixelSize * 0.28),
            borderRadius: radii.full,
            backgroundColor: colors.success,
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        />
      )}
    </View>
  );
};
