import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { MOMOHeader, MOMOButton, MOMOToast } from '@/components/ui';
import { createReef, REEF_GRADIENTS, REEF_STICKERS } from '@/services/reefService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CreateReefScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii, shadows } = useTheme();
  const { user, profile } = useAuth();

  const [mode, setMode] = useState<'text' | 'media'>('text');
  const [content, setContent] = useState('');
  const [selectedGradientIndex, setSelectedGradientIndex] = useState(0);
  const [selectedSticker, setSelectedSticker] = useState<string | null>('🌸');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<'all' | 'friends' | 'private'>('all');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeGradient = REEF_GRADIENTS[selectedGradientIndex];

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  };

  const handlePickImage = async () => {
    triggerHaptic();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setSelectedImageUri(result.assets[0].uri);
        setMode('media');
      }
    } catch (err) {
      console.warn('Pick image error:', err);
    }
  };

  const handlePostReef = async () => {
    if (!user) return;
    if (mode === 'text' && !content.trim()) {
      setToastMessage('Vui lòng nhập nội dung cho tin Reef của bạn.');
      return;
    }
    if (mode === 'media' && !selectedImageUri) {
      setToastMessage('Vui lòng chọn hình ảnh hoặc video để đăng tin.');
      return;
    }

    triggerHaptic();
    setLoading(true);

    try {
      await createReef({
        userId: user.id,
        type: mode,
        mediaUri: selectedImageUri || undefined,
        content: content.trim(),
        gradientId: activeGradient.id,
        sticker: selectedSticker,
        privacy,
        ownerProfile: profile
          ? {
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
            }
          : undefined,
      });

      setToastMessage('Đã đăng tin Reef thành công! ✨');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 600);
    } catch (err: any) {
      console.warn('Post reef error:', err);
      setToastMessage(err.message || 'Không thể đăng tin. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const previewCardHeight = Math.min(380, SCREEN_WIDTH * 1.1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader
        showBack
        title="Đăng tin Reef"
        rightAction={
          <Pressable onPress={handlePostReef} disabled={loading} hitSlop={10}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.coral} />
            ) : (
              <Text style={[typography.headline, { color: colors.coral, fontWeight: '700' }]}>
                Đăng tin
              </Text>
            )}
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + 90,
          }}
          keyboardShouldPersistTaps="handled">
          {/* Mode Switcher Tabs */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.surfaceSubtle,
              borderRadius: radii.full,
              padding: 4,
              marginVertical: spacing.md,
            }}>
            <Pressable
              onPress={() => {
                triggerHaptic();
                setMode('text');
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: radii.full,
                alignItems: 'center',
                backgroundColor: mode === 'text' ? colors.coral : 'transparent',
              }}>
              <Text
                style={[
                  typography.callout,
                  {
                    fontWeight: '700',
                    color: mode === 'text' ? '#FFFFFF' : colors.textSecondary,
                  },
                ]}>
                ✍️ Tin Chữ & Cảm xúc
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic();
                setMode('media');
                if (!selectedImageUri) handlePickImage();
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: radii.full,
                alignItems: 'center',
                backgroundColor: mode === 'media' ? colors.coral : 'transparent',
              }}>
              <Text
                style={[
                  typography.callout,
                  {
                    fontWeight: '700',
                    color: mode === 'media' ? '#FFFFFF' : colors.textSecondary,
                  },
                ]}>
                📸 Tin Ảnh & Video
              </Text>
            </Pressable>
          </View>

          {/* Live Preview Screen */}
          <View
            style={{
              width: '100%',
              height: previewCardHeight,
              borderRadius: radii.xxl,
              backgroundColor:
                mode === 'media'
                  ? '#000000'
                  : activeGradient.colors[0],
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              padding: spacing.xl,
              marginVertical: spacing.sm,
              ...shadows.lg,
            }}>
            {mode === 'media' && selectedImageUri ? (
              <>
                <Image
                  source={{ uri: selectedImageUri }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                  resizeMode="cover"
                />
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.22)',
                  }}
                />
              </>
            ) : null}

            {/* Sticker Badge */}
            {selectedSticker && (
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: radii.full,
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.md,
                }}>
                <Text style={{ fontSize: 32 }}>{selectedSticker}</Text>
              </View>
            )}

            {/* Text message preview */}
            <Text
              style={[
                typography.title2,
                {
                  color: mode === 'media' ? '#FFFFFF' : activeGradient.textColor,
                  fontWeight: '800',
                  textAlign: 'center',
                  lineHeight: 30,
                  textShadowColor: 'rgba(0,0,0,0.4)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 6,
                },
              ]}>
              {content.trim() ||
                (mode === 'text'
                  ? 'Gõ cảm nghĩ của bạn tại đây...'
                  : 'Chạm để thêm chú thích cho tin')}
            </Text>

            {/* Mode media picker action button inside preview if no image */}
            {mode === 'media' && !selectedImageUri && (
              <Pressable
                onPress={handlePickImage}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  borderRadius: radii.full,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                <Ionicons name="images" size={20} color="#FFFFFF" style={{ marginRight: spacing.xs }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Chọn ảnh hoặc video</Text>
              </Pressable>
            )}
          </View>

          {/* Text Input Field */}
          <View style={{ marginVertical: spacing.md }}>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '700' },
              ]}>
              NỘI DUNG TIN REEF
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                color: colors.text,
                fontSize: 16,
                minHeight: 70,
                textAlignVertical: 'top',
              }}
              placeholder={
                mode === 'text'
                  ? 'Hôm nay bạn thấy thế nào? Ghi lại cảm xúc ngay...'
                  : 'Thêm ghi chú ngắn cho ảnh/video...'
              }
              placeholderTextColor={colors.textSecondary}
              value={content}
              onChangeText={setContent}
              maxLength={180}
              multiline
            />
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, textAlign: 'right', marginTop: 4 },
              ]}>
              {content.length}/180 ký tự
            </Text>
          </View>

          {/* Gradient Palette (if text mode) */}
          {mode === 'text' && (
            <View style={{ marginBottom: spacing.lg }}>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '700' },
                ]}>
                MÀU NỀN GRADIENT
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {REEF_GRADIENTS.map((g, idx) => {
                  const isSelected = selectedGradientIndex === idx;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => {
                        triggerHaptic();
                        setSelectedGradientIndex(idx);
                      }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: radii.full,
                        backgroundColor: g.colors[0],
                        marginRight: spacing.sm,
                        borderWidth: isSelected ? 3 : 1,
                        borderColor: isSelected ? '#FFFFFF' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...shadows.sm,
                      }}>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Stickers */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '700' },
              ]}>
              STICKER CẢM XÚC
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {REEF_STICKERS.map((stk) => {
                const isSelected = selectedSticker === stk;
                return (
                  <Pressable
                    key={stk}
                    onPress={() => {
                      triggerHaptic();
                      setSelectedSticker((prev) => (prev === stk ? null : stk));
                    }}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: radii.full,
                      backgroundColor: isSelected ? colors.coralLight : colors.surface,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.coral : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing.sm,
                    }}>
                    <Text style={{ fontSize: 22 }}>{stk}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Change Media Button if in media mode */}
          {mode === 'media' && selectedImageUri && (
            <View style={{ marginBottom: spacing.lg, flexDirection: 'row', gap: spacing.sm }}>
              <MOMOButton
                title="Đổi ảnh khác"
                variant="outline"
                size="md"
                onPress={handlePickImage}
                style={{ flex: 1 }}
              />
              <MOMOButton
                title="Mở Camera"
                variant="secondary"
                size="md"
                onPress={() => router.push('/(tabs)/camera')}
                style={{ flex: 1 }}
              />
            </View>
          )}

          {/* Privacy Selector */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '700' },
              ]}>
              ĐỐI TƯỢNG XEM TIN
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {[
                { id: 'all', label: '👥 Bạn bè' },
                { id: 'friends', label: '🌟 Bạn thân' },
                { id: 'private', label: '🔒 Chỉ mình tôi' },
              ].map((item) => {
                const isPicked = privacy === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      triggerHaptic();
                      setPrivacy(item.id as any);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: isPicked ? colors.coralLight : colors.surface,
                      borderRadius: radii.lg,
                      paddingVertical: spacing.sm,
                      alignItems: 'center',
                      borderWidth: 1.5,
                      borderColor: isPicked ? colors.coral : colors.border,
                    }}>
                    <Text
                      style={[
                        typography.caption,
                        {
                          fontWeight: isPicked ? '700' : '500',
                          color: isPicked ? colors.coral : colors.text,
                        },
                      ]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Post Action Button */}
          <MOMOButton
            title="Đăng tin Reef ngay ✨"
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handlePostReef}
            style={{ width: '100%', marginTop: spacing.xs }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <MOMOToast
        visible={!!toastMessage}
        message={toastMessage || ''}
        type={toastMessage?.includes('thành công') ? 'success' : 'info'}
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
}
