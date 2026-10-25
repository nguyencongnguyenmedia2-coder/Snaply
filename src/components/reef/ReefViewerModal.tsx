import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  Dimensions,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { MOMOAvatar } from '@/components/ui';
import { Reef, REEF_GRADIENTS, reactToReef } from '@/services/reefService';
import { sendChatMessage } from '@/services/chatService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const REEF_DURATION_MS = 5000;

export interface ReefViewerModalProps {
  visible: boolean;
  reefs: Reef[];
  initialIndex?: number;
  onClose: () => void;
}

export const ReefViewerModal: React.FC<ReefViewerModalProps> = ({
  visible,
  reefs,
  initialIndex = 0,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { user, profile } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReactionFeedback, setShowReactionFeedback] = useState<string | null>(null);

  const [progressAnim] = useState(() => new Animated.Value(0));
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const currentReef = reefs[currentIndex] || reefs[0];

  useEffect(() => {
    if (visible) {
      setCurrentIndex(Math.min(initialIndex, Math.max(0, reefs.length - 1)));
    }
  }, [visible, initialIndex, reefs.length]);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  };

  const handleNext = React.useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < reefs.length - 1) return prev + 1;
      onClose();
      return prev;
    });
  }, [reefs.length, onClose]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  useEffect(() => {
    if (!visible || !currentReef) return;

    progressAnim.setValue(0);
    if (!isPaused) {
      animRef.current = Animated.timing(progressAnim, {
        toValue: 1,
        duration: REEF_DURATION_MS,
        useNativeDriver: false,
      });

      animRef.current.start(({ finished }) => {
        if (finished) {
          handleNext();
        }
      });
    }

    return () => {
      animRef.current?.stop();
    };
  }, [visible, currentIndex, isPaused, currentReef, progressAnim, handleNext]);

  if (!visible || !currentReef) return null;

  const gradientDef =
    REEF_GRADIENTS.find((g) => g.id === currentReef.background_gradient) || REEF_GRADIENTS[0];

  const handleReact = async (emoji: string) => {
    if (!user) return;
    triggerHaptic();
    setShowReactionFeedback(emoji);
    setTimeout(() => setShowReactionFeedback(null), 1200);

    await reactToReef(currentReef.id, emoji, user.id);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !user) return;
    triggerHaptic();

    const textToSend = replyText.trim();
    setReplyText('');

    try {
      await sendChatMessage({
        currentUserId: user.id,
        senderProfile: profile,
        recipientId: currentReef.owner_id,
        content: `Đã phản hồi tin Reef: "${textToSend}"`,
      });
      setShowReactionFeedback('💌 Đã gửi phản hồi!');
      setTimeout(() => setShowReactionFeedback(null), 1500);
    } catch (err) {
      console.warn('Reply reef error:', err);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {/* Background Visual: Image or Vibrant Gradient */}
        {currentReef.type === 'media' && currentReef.media_url ? (
          <Image
            source={{ uri: currentReef.media_url }}
            style={{
              position: 'absolute',
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              position: 'absolute',
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
              backgroundColor: gradientDef.colors[0],
            }}
          />
        )}

        {/* Ambient Dark Overlay */}
        <View
          style={{
            position: 'absolute',
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            backgroundColor: currentReef.type === 'media' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
          }}
        />

        {/* Interactive Tap Zones (Left = Prev, Right = Next, Center = Hold) */}
        <View
          style={{
            position: 'absolute',
            top: 100,
            bottom: 120,
            left: 0,
            right: 0,
            flexDirection: 'row',
          }}>
          <Pressable
            onPress={handlePrev}
            onLongPress={() => setIsPaused(true)}
            onPressOut={() => setIsPaused(false)}
            style={{ width: '30%', height: '100%' }}
          />
          <Pressable
            onLongPress={() => setIsPaused(true)}
            onPressOut={() => setIsPaused(false)}
            style={{ width: '40%', height: '100%' }}
          />
          <Pressable
            onPress={handleNext}
            onLongPress={() => setIsPaused(true)}
            onPressOut={() => setIsPaused(false)}
            style={{ width: '30%', height: '100%' }}
          />
        </View>

        {/* Top Progress Bars & Header */}
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: spacing.md,
            zIndex: 20,
          }}>
          {/* Progress segments */}
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 10 }}>
            {reefs.map((_, idx) => {
              const widthVal =
                idx < currentIndex
                  ? '100%'
                  : idx === currentIndex
                  ? progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    })
                  : '0%';

              return (
                <View
                  key={idx}
                  style={{
                    flex: 1,
                    height: 3,
                    backgroundColor: 'rgba(255,255,255,0.35)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                  <Animated.View
                    style={{
                      height: '100%',
                      width: widthVal,
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </View>
              );
            })}
          </View>

          {/* Author Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MOMOAvatar url={currentReef.owner.avatar_url} name={currentReef.owner.display_name} size="sm" />
              <View style={{ marginLeft: spacing.sm }}>
                <Text style={[typography.headline, { color: '#FFFFFF', fontWeight: '700' }]}>
                  {currentReef.owner.display_name}
                </Text>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>
                  @{currentReef.owner.username} • Tin Reef 24h
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.4)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Center Content Text / Sticker */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.xxl,
            pointerEvents: 'box-none',
          }}>
          {currentReef.sticker && (
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}>
              <Text style={{ fontSize: 40 }}>{currentReef.sticker}</Text>
            </View>
          )}

          {currentReef.content ? (
            <View
              style={{
                backgroundColor:
                  currentReef.type === 'media'
                    ? 'rgba(0,0,0,0.65)'
                    : 'transparent',
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderRadius: radii.xl,
                maxWidth: '92%',
              }}>
              <Text
                style={[
                  typography.title2,
                  {
                    color: '#FFFFFF',
                    fontWeight: '800',
                    textAlign: 'center',
                    lineHeight: 32,
                    textShadowColor: 'rgba(0,0,0,0.5)',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 8,
                  },
                ]}>
                {currentReef.content}
              </Text>
            </View>
          ) : null}

          {/* Floating Emoji Reaction Feedback */}
          {showReactionFeedback && (
            <View
              style={{
                position: 'absolute',
                top: '40%',
                backgroundColor: 'rgba(0,0,0,0.85)',
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderRadius: radii.full,
                borderWidth: 1,
                borderColor: colors.coral,
              }}>
              <Text style={{ fontSize: 24, color: '#FFFFFF', fontWeight: '700' }}>
                {showReactionFeedback}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Reaction Bar & Reply Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingBottom: Math.max(insets.bottom, 16) + 10,
              paddingTop: spacing.sm,
            }}>
            {/* Quick emoji reactions */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 14,
                marginBottom: spacing.sm,
              }}>
              {['❤️', '😂', '🔥', '🌸', '⚡', '👍'].map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => handleReact(emoji)}
                  style={({ pressed }) => ({
                    transform: [{ scale: pressed ? 1.3 : 1 }],
                    padding: 6,
                  })}>
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>

            {/* Message input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.22)',
                borderRadius: radii.full,
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)',
              }}>
              <TextInput
                style={{
                  flex: 1,
                  color: '#FFFFFF',
                  fontSize: 15,
                  paddingVertical: 4,
                }}
                placeholder={`Trả lời @${currentReef.owner.username}...`}
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={replyText}
                onChangeText={setReplyText}
                onSubmitEditing={handleSendReply}
                returnKeyType="send"
              />

              {replyText.trim() ? (
                <Pressable onPress={handleSendReply} hitSlop={10}>
                  <Ionicons name="send" size={20} color={colors.coral} />
                </Pressable>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
