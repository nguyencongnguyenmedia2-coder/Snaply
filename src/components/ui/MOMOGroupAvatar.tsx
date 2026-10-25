import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { MOMOAvatar } from './MOMOAvatar';

export interface MOMOGroupAvatarProps {
  members: Array<{ id: string; name?: string; avatar_url?: string | null }>;
  maxVisible?: number;
  size?: 'xs' | 'sm' | 'md';
  style?: ViewStyle;
}

export const MOMOGroupAvatar: React.FC<MOMOGroupAvatarProps> = ({
  members,
  maxVisible = 3,
  size = 'sm',
  style,
}) => {
  const { colors, typography, radii } = useTheme();
  const visible = members.slice(0, maxVisible);
  const remaining = Math.max(0, members.length - maxVisible);

  const overlapOffset = size === 'xs' ? 14 : size === 'sm' ? 18 : 24;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {visible.map((member, idx) => (
        <View
          key={member.id}
          style={{
            marginLeft: idx === 0 ? 0 : -overlapOffset,
            zIndex: 10 - idx,
            borderRadius: radii.full,
            borderWidth: 2,
            borderColor: colors.surface,
          }}>
          <MOMOAvatar
            url={member.avatar_url}
            name={member.name}
            size={size}
          />
        </View>
      ))}

      {remaining > 0 && (
        <View
          style={{
            marginLeft: -overlapOffset,
            zIndex: 0,
            width: size === 'xs' ? 26 : size === 'sm' ? 34 : 44,
            height: size === 'xs' ? 26 : size === 'sm' ? 34 : 44,
            borderRadius: radii.full,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 2,
            borderColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text
            style={{
              fontSize: size === 'xs' ? 9 : 11,
              fontWeight: '700',
              color: colors.coral,
            }}>
            +{remaining}
          </Text>
        </View>
      )}
    </View>
  );
};
