import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  ViewStyle,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { MOMOAvatar } from './MOMOAvatar';
import { MOMOReactionBar } from './MOMOReactionBar';
import { parseMomentMediaUrls } from '@/services/momentsService';

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
  mediaUrls?: string[];
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
  mediaUrls,
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
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const photos =
    mediaUrls && mediaUrls.length > 0
      ? mediaUrls
      : parseMomentMediaUrls(imageUrl);
  const isAlbum = photos.length > 1;

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
      if (diffSec < 60) return 'Vừa xong';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
      return `${Math.floor(diffSec / 86400)} ngày trước`;
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
          accessibilityLabel={`Xem hồ sơ của ${author.name}`}>
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
            accessibilityLabel="Tùy chọn khoảnh khắc">
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Photo / Album Carousel with double-tap gesture */}
      <View style={{ position: 'relative', width: '100%', height: imageHeight }}>
        {isAlbum ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const page = Math.round(offsetX / cardWidth);
              if (page >= 0 && page < photos.length) {
                setActivePhotoIndex(page);
              }
            }}
            style={{ width: '100%', height: imageHeight }}>
            {photos.map((photoUri, index) => (
              <Pressable
                key={`${id}_photo_${index}`}
                onPress={handleDoubleTap}
                style={{ width: cardWidth, height: imageHeight }}>
                <Image
                  source={{ uri: photoUri }}
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: colors.surfaceMuted,
                  }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Pressable onPress={handleDoubleTap} style={{ width: '100%', height: '100%' }}>
            <Image
              source={{ uri: photos[0] || imageUrl }}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: colors.surfaceMuted,
              }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          </Pressable>
        )}

        {/* Album Badge Indicator (Top Right) */}
        {isAlbum && (
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: radii.full,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}>
            <Ionicons name="images" size={13} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
              {activePhotoIndex + 1}/{photos.length}
            </Text>
          </View>
        )}

        {/* Album Carousel Dots (Bottom Center) */}
        {isAlbum && (
          <View
            style={{
              position: 'absolute',
              bottom: 12,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
            }}
            pointerEvents="none">
            {photos.map((_, dotIdx) => (
              <View
                key={`dot_${dotIdx}`}
                style={{
                  width: dotIdx === activePhotoIndex ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    dotIdx === activePhotoIndex
                      ? '#FFFFFF'
                      : 'rgba(255, 255, 255, 0.45)',
                }}
              />
            ))}
          </View>
        )}

        {/* Heart Overlay for Double Tap */}
        {showHeartOverlay && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.2)',
              },
            ]}
            pointerEvents="none">
            <Text style={{ fontSize: 72 }}>❤️</Text>
          </View>
        )}
      </View>

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
