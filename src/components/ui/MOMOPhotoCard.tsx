import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { MOMOAvatar } from './MOMOAvatar';
import { MOMOReactionBar } from './MOMOReactionBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface MomentAuthor {
  id: string;
  name: string;
  username: string;
  avatar_url?: string | null;
}

export interface MOMOPhotoCardProps {
  id: string;
  author: MomentAuthor;
  imageUrl: string;
  caption?: string | null;
  createdAt: string;
  groupName?: string | null;
  reactions?: Record<string, number>;
  userReaction?: string | null;
  onReact: (emoji: string) => void;
  onReplyPhoto?: () => void;
  onPressAuthor?: () => void;
  onOptionsPress?: () => void;
  style?: ViewStyle;
}

export const MOMOPhotoCard: React.FC<MOMOPhotoCardProps> = ({
  id,
  author,
  imageUrl,
  caption,
  createdAt,
  groupName,
  reactions = {},
  userReaction,
  onReact,
  onReplyPhoto,
  onPressAuthor,
  onOptionsPress,
  style,
}) => {
  const { colors, radii, spacing, typography, shadows } = useTheme();
  const lastTapRef = useRef<number>(0);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      setShowHeartOverlay(true);
      onReact('❤️');
      setTimeout(() => setShowHeartOverlay(false), 800);
    }
    lastTapRef.current = now;
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  const cardWidth = Math.min(SCREEN_WIDTH - spacing.lg * 2, 460);
  const imageHeight = cardWidth * 1.25; // 4:5 photography portrait ratio

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          marginBottom: spacing.xl,
          ...shadows.md,
        },
        style,
      ]}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}>
        <Pressable
          onPress={onPressAuthor}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          accessibilityRole="button"
          accessibilityLabel={`View ${author.name}'s profile`}>
          <MOMOAvatar
            url={author.avatar_url}
            name={author.name}
            size="sm"
            hasUnseen={false}
          />
          <View style={{ marginLeft: spacing.sm, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[typography.callout, { fontWeight: '700', color: colors.text }]}
                numberOfLines={1}>
                {author.name}
              </Text>
              {groupName && (
                <View
                  style={{
                    backgroundColor: colors.sageLight,
                    borderRadius: radii.xs,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    marginLeft: spacing.xs,
                  }}>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.charcoal || '#292526', fontSize: 10, fontWeight: '600' },
                    ]}>
                    {groupName}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              @{author.username} • {getRelativeTime(createdAt)}
            </Text>
          </View>
        </Pressable>

        {onOptionsPress && (
          <Pressable
            onPress={onOptionsPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Moment options">
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Photo with double-tap gesture */}
      <Pressable onPress={handleDoubleTap} style={{ position: 'relative' }}>
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: '100%',
            height: imageHeight,
            backgroundColor: colors.surfaceMuted,
          }}
          resizeMode="cover"
        />

        {showHeartOverlay && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.2)',
              },
            ]}>
            <Text style={{ fontSize: 72 }}>❤️</Text>
          </View>
        )}
      </Pressable>

      {/* Caption & Reactions */}
      <View style={{ padding: spacing.md }}>
        {caption ? (
          <Text
            style={[
              typography.body,
              { color: colors.text, marginBottom: spacing.sm, lineHeight: 22 },
            ]}>
            {caption}
          </Text>
        ) : null}

        <MOMOReactionBar
          reactions={reactions}
          userReaction={userReaction}
          onReact={onReact}
          onReplyPhoto={onReplyPhoto}
        />
      </View>
    </View>
  );
};
