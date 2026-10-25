import React from 'react';
import { View, Text, Pressable, Platform, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export interface ReactionItem {
  emoji: string;
  count: number;
  userReacted?: boolean;
}

export interface MOMOReactionBarProps {
  reactions?: Record<string, number>;
  userReaction?: string | null;
  onReact: (emoji: string) => void;
  onReplyPhoto?: () => void;
  style?: ViewStyle;
}

const DEFAULT_EMOJIS = ['❤️', '✨', '🔥', '🥺', '😂', '👏'];

export const MOMOReactionBar: React.FC<MOMOReactionBarProps> = ({
  reactions = {},
  userReaction,
  onReact,
  onReplyPhoto,
  style,
}) => {
  const { colors, radii, spacing, typography } = useTheme();

  const handleSelect = (emoji: string) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    onReact(emoji);
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radii.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-around' }}>
        {DEFAULT_EMOJIS.map((emoji) => {
          const count = reactions[emoji] || 0;
          const isSelected = userReaction === emoji;

          return (
            <Pressable
              key={emoji}
              onPress={() => handleSelect(emoji)}
              style={({ pressed }) => [
                {
                  paddingHorizontal: spacing.xs + 2,
                  paddingVertical: spacing.xxs + 2,
                  borderRadius: radii.full,
                  backgroundColor: isSelected ? colors.coralLight : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  transform: [{ scale: pressed ? 1.25 : isSelected ? 1.1 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Thả cảm xúc ${emoji}`}>
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
              {count > 0 && (
                <Text
                  style={[
                    typography.caption,
                    {
                      marginLeft: 3,
                      fontWeight: '700',
                      color: isSelected ? colors.coral : colors.textSecondary,
                    },
                  ]}>
                  {count}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {onReplyPhoto && (
        <Pressable
          onPress={onReplyPhoto}
          style={({ pressed }) => [
            {
              backgroundColor: colors.coral,
              width: 32,
              height: 32,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: spacing.xs,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Chụp ảnh phản hồi">
          <Ionicons name="camera" size={17} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
};
