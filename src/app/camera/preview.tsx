import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  Pressable,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { createMoment } from '@/services/momentsService';
import { uploadPhoto } from '@/services/photoStorageService';
import { getFriends } from '@/services/friendsService';
import { Profile } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = Math.min(SCREEN_WIDTH - 36, 390);

// Caption Pill Styles (cycled via the Aa✨ button)
const CAPTION_STYLES = [
  { id: 'blue', bg: 'rgba(26, 92, 224, 0.88)', textColor: '#FFFFFF', border: 'transparent' },
  { id: 'dark', bg: 'rgba(20, 18, 19, 0.85)', textColor: '#FFFFFF', border: 'rgba(255,255,255,0.2)' },
  { id: 'coral', bg: 'rgba(255, 128, 110, 0.92)', textColor: '#FFFFFF', border: 'transparent' },
  { id: 'translucent', bg: 'rgba(255, 255, 255, 0.28)', textColor: '#FFFFFF', border: 'rgba(255,255,255,0.4)' },
];

// Fallback demo friends for initial testing if no friends exist yet
const DEMO_FRIENDS: Profile[] = [
  {
    id: 'friend-bink',
    username: 'bink',
    display_name: 'bìnk',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    bio: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'friend-ling',
    username: 'lingling',
    display_name: '玲',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    bio: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'friend-mom',
    username: 'me_yeu',
    display_name: 'mẹ b...',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    bio: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'friend-nam',
    username: 'hoangnam',
    display_name: 'Nam',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bio: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function CameraPreviewScreen() {
  const router = useRouter();
  const { uri, uris } = useLocalSearchParams<{ uri?: string; uris?: string }>();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();

  // Multi-photo list parsing
  const photos = useMemo<string[]>(() => {
    if (uris) {
      try {
        const parsed = JSON.parse(uris);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(Boolean);
        }
      } catch {}
    }
    return uri ? [uri] : [];
  }, [uri, uris]);

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Media & Caption State
  const [caption, setCaption] = useState('');
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionStyleIndex, setCaptionStyleIndex] = useState(0);
  const [isSoundMuted, setIsSoundMuted] = useState(false);

  // Audience State: 'all' | 'private' | 'friend'
  const [recipientMode, setRecipientMode] = useState<'all' | 'private' | 'friend'>('all');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  // Friends list
  const [friends, setFriends] = useState<Profile[]>(DEMO_FRIENDS);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Animated scale for send button
  const [sendButtonScale] = useState(() => new Animated.Value(1));
  const captionInputRef = useRef<any>(null);

  useEffect(() => {
    async function loadUserFriends() {
      if (user?.id) {
        try {
          const list = await getFriends(user.id);
          if (list && list.length > 0) {
            setFriends(list);
          }
        } catch {
          // Keep demo list for fluid preview experience
        }
      }
    }
    loadUserFriends();
  }, [user?.id]);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  };

  const handleToggleSound = () => {
    triggerHaptic();
    setIsSoundMuted((prev) => !prev);
  };

  const handleCycleCaptionStyle = () => {
    triggerHaptic();
    setCaptionStyleIndex((prev) => (prev + 1) % CAPTION_STYLES.length);
  };

  const handleOpenCaptionInput = () => {
    triggerHaptic();
    setIsEditingCaption(true);
    setTimeout(() => {
      captionInputRef.current?.focus();
    }, 100);
  };

  const handleSelectAudience = (mode: 'all' | 'private' | 'friend', friendId?: string) => {
    triggerHaptic();
    setRecipientMode(mode);
    setSelectedFriendId(friendId || null);
  };

  const handleSendMoment = async () => {
    if (photos.length === 0 || !user || isUploading) return;

    triggerHaptic();

    // Button press animation
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.88,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sendButtonScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      setIsUploading(true);
      setUploadError(null);

      // Upload all photos in parallel via private R2/Supabase storage
      const uploadedPhotos = await Promise.all(
        photos.map((photoUri) =>
          uploadPhoto({
            localUri: photoUri,
            caption,
            ownerId: user.id,
          })
        )
      );

      const uploadedUrls = uploadedPhotos.map((p) => p.main_url || p.object_path);

      // Determine recipients
      let targetRecipients: string[] | undefined = undefined;
      if (recipientMode === 'friend' && selectedFriendId) {
        targetRecipients = [selectedFriendId];
      } else if (recipientMode === 'private') {
        targetRecipients = [user.id]; // Private journal
      }

      // Create Moment & Update Widget
      await createMoment({
        userId: user.id,
        mediaUri: uploadedUrls[0],
        mediaUris: uploadedUrls,
        caption: caption.trim() || undefined,
        recipientIds: targetRecipients,
        ownerProfile: profile
          ? {
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
            }
          : undefined,
      });

      // Smooth direct navigation to feed
      router.replace('/(tabs)');
    } catch (err: any) {
      console.warn('Send moment error:', err);
      setUploadError(err.message || 'Gửi ảnh thất bại. Vui lòng thử lại.');
      setIsUploading(false);
    }
  };

  const activeCaptionStyle = CAPTION_STYLES[captionStyleIndex];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      {/* Background Wine Tint Overlay */}
      <View style={styles.backgroundTint} />

      {/* Top Header: "Gửi đến..." */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 14) }]}>
        <Text style={styles.headerTitle}>Gửi đến...</Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.centerSection}>
        {/* Photo Squircle Container */}
        <View style={styles.photoCard}>
          {photos.length > 1 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              onMomentumScrollEnd={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const page = Math.round(offsetX / PHOTO_SIZE);
                if (page >= 0 && page < photos.length) {
                  setActivePhotoIndex(page);
                }
              }}
              style={styles.photoScroll}>
              {photos.map((pUri, pIdx) => (
                <View key={`preview_p_${pIdx}`} style={styles.photoSlide}>
                  <Image source={{ uri: pUri }} style={styles.photoImage} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
          ) : (
            <Image
              source={{ uri: photos[0] || uri }}
              style={styles.photoImage}
              resizeMode="cover"
            />
          )}

          {/* Sound / Audio Toggle Button (Top-Left) */}
          <Pressable
            onPress={handleToggleSound}
            style={styles.soundButton}
            accessibilityLabel="Bật/Tắt âm thanh">
            <Ionicons
              name={isSoundMuted ? 'volume-mute' : 'volume-high'}
              size={18}
              color="#FFFFFF"
            />
          </Pressable>

          {/* Album Badge Indicator (Top-Right) */}
          {photos.length > 1 && (
            <View style={styles.albumBadge}>
              <Ionicons name="images" size={13} color="#FFFFFF" />
              <Text style={styles.albumBadgeText}>
                {activePhotoIndex + 1}/{photos.length}
              </Text>
            </View>
          )}

          {/* Interactive Caption Pill (Bottom-Center of Photo) */}
          <Pressable
            onPress={handleOpenCaptionInput}
            style={[
              styles.captionPill,
              {
                backgroundColor: activeCaptionStyle.bg,
                borderColor: activeCaptionStyle.border,
              },
            ]}>
            {isEditingCaption ? (
              <TextInput
                ref={captionInputRef}
                value={caption}
                onChangeText={setCaption}
                placeholder="Thêm một tin nhắn"
                placeholderTextColor="rgba(255, 255, 255, 0.75)"
                style={[styles.captionInput, { color: activeCaptionStyle.textColor }]}
                onBlur={() => setIsEditingCaption(false)}
                returnKeyType="done"
                onSubmitEditing={() => setIsEditingCaption(false)}
                maxLength={90}
              />
            ) : (
              <Text
                style={[
                  styles.captionText,
                  { color: activeCaptionStyle.textColor },
                ]}>
                {caption.trim() ? caption : 'Thêm một tin nhắn'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Error message if any */}
        {uploadError && (
          <View style={styles.errorToast}>
            <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
            <Text style={styles.errorToastText}>{uploadError}</Text>
          </View>
        )}

        {/* Action Controls Row (Close ✕, Send ➤, Style Aa✨) */}
        <View style={styles.actionControlsRow}>
          {/* Discard / Close Button */}
          <Pressable
            onPress={() => router.back()}
            style={styles.sideActionButton}
            accessibilityLabel="Hủy và chụp lại">
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </Pressable>

          {/* Center Send Button with discreet loading inside button */}
          <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
            <Pressable
              onPress={handleSendMoment}
              disabled={isUploading}
              style={[styles.sendButton, isUploading && { opacity: 0.85 }]}
              accessibilityLabel="Gửi khoảnh khắc">
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="send"
                  size={28}
                  color="#FFFFFF"
                  style={{ transform: [{ rotate: '-25deg' }, { translateX: 2 }] }}
                />
              )}
            </Pressable>
          </Animated.View>

          {/* Aa✨ Text Style / Filter Button */}
          <Pressable
            onPress={handleCycleCaptionStyle}
            style={styles.sideActionButton}
            accessibilityLabel="Đổi kiểu chữ">
            <View style={styles.textStyleIconWrapper}>
              <Text style={styles.textStyleAa}>Aa</Text>
              <Text style={styles.textStyleSparkle}>✦</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Bottom Audience Selector Bar ("Gửi đến ai") */}
      <View style={[styles.bottomAudienceBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.audienceScrollContent}>
          {/* Option 1: Riêng tư (Lock icon) */}
          <Pressable
            onPress={() => handleSelectAudience('private')}
            style={styles.audienceItem}>
            <View
              style={[
                styles.audienceIconCircle,
                recipientMode === 'private' && styles.audienceActiveRing,
              ]}>
              <Ionicons
                name="lock-closed"
                size={20}
                color={recipientMode === 'private' ? '#FF4F5E' : '#C4B9B8'}
              />
            </View>
            <Text
              style={[
                styles.audienceLabel,
                recipientMode === 'private' && styles.audienceLabelActive,
              ]}>
              Riêng tư
            </Text>
          </Pressable>

          {/* Vertical Separator Divider */}
          <View style={styles.audienceDivider} />

          {/* Option 2: Tất cả (Group icon) */}
          <Pressable
            onPress={() => handleSelectAudience('all')}
            style={styles.audienceItem}>
            <View
              style={[
                styles.audienceIconCircle,
                recipientMode === 'all' && styles.audienceActiveRing,
              ]}>
              <Ionicons
                name="people"
                size={22}
                color={recipientMode === 'all' ? '#FF4F5E' : '#C4B9B8'}
              />
            </View>
            <Text
              style={[
                styles.audienceLabel,
                recipientMode === 'all' && styles.audienceLabelActive,
              ]}>
              Tất cả
            </Text>
          </Pressable>

          {/* Option 3+: Individual Friends List */}
          {friends.map((friend) => {
            const isSelected = recipientMode === 'friend' && selectedFriendId === friend.id;
            return (
              <Pressable
                key={friend.id}
                onPress={() => handleSelectAudience('friend', friend.id)}
                style={styles.audienceItem}>
                <View style={[styles.audienceAvatarWrapper, isSelected && styles.audienceActiveRing]}>
                  {friend.avatar_url ? (
                    <Image
                      source={{ uri: friend.avatar_url }}
                      style={styles.audienceAvatarImage}
                    />
                  ) : (
                    <View style={styles.audienceAvatarFallback}>
                      <Text style={styles.audienceAvatarInitial}>
                        {(friend.display_name || friend.username || 'B')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.audienceLabel,
                    isSelected && styles.audienceLabelActive,
                  ]}>
                  {friend.display_name || friend.username}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#241419', // Deep warm wine/charcoal background matching Locket
  },
  backgroundTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(36, 20, 25, 0.96)',
  },
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EDE4E7',
    letterSpacing: -0.3,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  photoCard: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 44, // Locket signature large squircle curvature
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1216',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  photoScroll: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
  },
  photoSlide: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  soundButton: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(26, 92, 224, 0.72)', // Locket blue sound button
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 10,
  },
  albumBadge: {
    position: 'absolute',
    top: 18,
    right: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  albumBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  captionPill: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: '85%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 10,
  },
  captionText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  captionInput: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 140,
    padding: 0,
    margin: 0,
  },
  actionControlsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  sideActionButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#8C5662', // Locket signature rose-brown circular button
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  textStyleIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  textStyleAa: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.5,
  },
  textStyleSparkle: {
    position: 'absolute',
    top: 4,
    right: 5,
    color: '#FFFFFF',
    fontSize: 10,
  },
  bottomAudienceBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 14,
    backgroundColor: 'rgba(24, 14, 18, 0.85)',
  },
  audienceScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  audienceItem: {
    alignItems: 'center',
    marginHorizontal: 10,
    width: 56,
  },
  audienceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceAvatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceAvatarImage: {
    width: '100%',
    height: '100%',
  },
  audienceAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3E242C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceAvatarInitial: {
    color: '#FFECE8',
    fontWeight: '700',
    fontSize: 16,
  },
  audienceActiveRing: {
    borderWidth: 2.5,
    borderColor: '#FF4F5E', // Locket active red/coral ring
    backgroundColor: 'rgba(255, 79, 94, 0.15)',
  },
  audienceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A89F9A',
    marginTop: 6,
    textAlign: 'center',
  },
  audienceLabelActive: {
    color: '#FF4F5E',
    fontWeight: '700',
  },
  audienceDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  errorToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 72, 77, 0.25)',
    borderWidth: 1,
    borderColor: '#E5484D',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 10,
  },
  errorToastText: {
    color: '#FF8A8A',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});
