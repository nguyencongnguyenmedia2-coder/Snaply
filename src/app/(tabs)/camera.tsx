import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
  Animated,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MOMOButton, MOMOIconButton } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { uploadPhoto } from '@/services/photoStorageService';
import { createMoment } from '@/services/momentsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radii, spacing, typography } = useTheme();
  const { user, profile } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isInstantPosting, setIsInstantPosting] = useState(false);
  const [flashOpacity] = useState(() => new Animated.Value(0));
  const cameraRef = useRef<any>(null);

  // New Features: Album Capture & Instant Post
  const [captureMode, setCaptureMode] = useState<'single' | 'album'>('album');
  const [albumPhotos, setAlbumPhotos] = useState<string[]>([]);
  const [instantPost, setInstantPost] = useState(true); // "khi chụp xong là đăng ảnh liền"

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(style);
      } catch {}
    }
  };

  const toggleFacing = () => {
    triggerHaptic();
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    triggerHaptic();
    setFlash((current) => (current === 'off' ? 'on' : current === 'on' ? 'auto' : 'off'));
  };

  const triggerShutterFlash = () => {
    flashOpacity.setValue(0.9);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const postInstantly = async (photoUris: string[]) => {
    if (!user || photoUris.length === 0) return;
    try {
      setIsInstantPosting(true);
      // Immediate optimistic feedback: route straight to feed
      router.replace('/(tabs)');

      // Background upload all photos to Cloudflare R2 / Supabase
      const uploadedPhotos = await Promise.all(
        photoUris.map((u) => uploadPhoto({ localUri: u, ownerId: user.id }))
      );
      const uploadedUrls = uploadedPhotos.map((p) => p.main_url || p.object_path);

      await createMoment({
        userId: user.id,
        mediaUri: uploadedUrls[0],
        mediaUris: uploadedUrls,
        ownerProfile: profile
          ? {
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
            }
          : undefined,
      });
    } catch (err) {
      console.warn('Instant post error:', err);
    } finally {
      setIsInstantPosting(false);
    }
  };

  const takePhoto = async () => {
    if (isCapturing || isInstantPosting) return;

    try {
      setIsCapturing(true);

      // Shutter flash & haptic feedback immediately
      triggerShutterFlash();
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);

      let capturedUri: string | null = null;

      // Capture photo from native CameraView
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.88,
          skipProcessing: false,
        });
        if (photo?.uri) {
          capturedUri = photo.uri;
        }
      }

      // Fallback for web or dev environment without camera
      if (!capturedUri) {
        capturedUri =
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=80';
      }

      // 1. ALBUM MODE: Append photo to album tray
      if (captureMode === 'album') {
        const nextPhotos = [...albumPhotos, capturedUri];
        setAlbumPhotos(nextPhotos);

        // If Instant Post is active and we want to allow quick burst, keep collecting
        // or user can tap "Đăng Album ngay"
        return;
      }

      // 2. SINGLE MODE:
      if (instantPost) {
        // "khi chụp xong là đăng ảnh liền"
        await postInstantly([capturedUri]);
      } else {
        router.push({
          pathname: '/camera/preview',
          params: { uri: capturedUri },
        });
      }
    } catch (err) {
      console.warn('Take picture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFinishAlbum = async () => {
    if (albumPhotos.length === 0) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    if (instantPost) {
      // Instant publish all photos as 1 album
      await postInstantly(albumPhotos);
      setAlbumPhotos([]);
    } else {
      // Open preview with full album
      router.push({
        pathname: '/camera/preview',
        params: { uris: JSON.stringify(albumPhotos) },
      });
    }
  };

  const removeAlbumPhoto = (index: number) => {
    triggerHaptic();
    setAlbumPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const pickFromGallery = async () => {
    try {
      triggerHaptic();

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.88,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUris = result.assets.map((a) => a.uri);

        if (captureMode === 'album' || pickedUris.length > 1) {
          const combined = [...albumPhotos, ...pickedUris];
          setAlbumPhotos(combined);

          if (instantPost) {
            await postInstantly(combined);
            setAlbumPhotos([]);
          } else {
            router.push({
              pathname: '/camera/preview',
              params: { uris: JSON.stringify(combined) },
            });
          }
        } else {
          if (instantPost) {
            await postInstantly(pickedUris);
          } else {
            router.push({
              pathname: '/camera/preview',
              params: { uri: pickedUris[0] },
            });
          }
        }
      }
    } catch (err) {
      console.warn('Gallery pick error:', err);
    }
  };

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!permission.granted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xxl,
        }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: radii.full,
            backgroundColor: colors.coralLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}>
          <Ionicons name="camera" size={38} color={colors.coral} />
        </View>

        <Text
          style={[
            typography.title2,
            { color: colors.text, textAlign: 'center', fontWeight: '800', marginBottom: spacing.xs },
          ]}>
          Cho phép truy cập Máy ảnh
        </Text>

        <Text
          style={[
            typography.body,
            {
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: spacing.xxl,
            },
          ]}>
          Snaply ghi lại những khoảnh khắc chân thật để chia sẻ album và widget cùng bạn bè thân thiết.
        </Text>

        <MOMOButton
          title="Cho phép truy cập Máy ảnh"
          onPress={requestPermission}
          variant="primary"
          size="lg"
          style={{ width: '100%', marginBottom: spacing.md }}
        />

        <MOMOButton
          title="Chọn ảnh từ Thư viện Album"
          onPress={pickFromGallery}
          variant="outline"
          size="md"
          style={{ width: '100%' }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={flash === 'on'}
      />

      {/* Shutter flash animation layer */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#FFFFFF',
            opacity: flashOpacity,
            zIndex: 90,
          },
        ]}
      />

      {/* UI Overlay Container */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            justifyContent: 'space-between',
            zIndex: 100,
          },
        ]}
        pointerEvents="box-none">
        {/* Top Control Bar */}
        <View
          style={{
            paddingTop: Math.max(insets.top, 16),
            paddingHorizontal: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          pointerEvents="box-none">
          <MOMOIconButton
            icon={<Ionicons name="close" size={26} color="#FFFFFF" />}
            onPress={() => router.push('/(tabs)')}
            accessibilityLabel="Đóng máy ảnh"
            variant="glass"
            size={44}
          />

          {/* Center Mode Switcher & Instant Post Pill */}
          <View style={styles.topModesContainer}>
            {/* Mode Switcher */}
            <View style={styles.modePill}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setCaptureMode('single');
                }}
                style={[styles.modeTab, captureMode === 'single' && styles.modeTabActive]}>
                <Ionicons
                  name="camera"
                  size={14}
                  color={captureMode === 'single' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    captureMode === 'single' && styles.modeTabTextActive,
                  ]}>
                  Đơn
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setCaptureMode('album');
                }}
                style={[styles.modeTab, captureMode === 'album' && styles.modeTabActive]}>
                <Ionicons
                  name="images"
                  size={14}
                  color={captureMode === 'album' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    captureMode === 'album' && styles.modeTabTextActive,
                  ]}>
                  Album
                </Text>
              </Pressable>
            </View>

            {/* Instant Post Toggle Pill */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                setInstantPost((prev) => !prev);
              }}
              style={[styles.instantToggle, instantPost && styles.instantToggleActive]}>
              <Ionicons
                name="flash"
                size={13}
                color={instantPost ? '#FFD700' : 'rgba(255,255,255,0.5)'}
              />
              <Text
                style={[
                  styles.instantToggleText,
                  instantPost && styles.instantToggleTextActive,
                ]}>
                Đăng liền
              </Text>
            </Pressable>
          </View>

          <MOMOIconButton
            icon={
              <Ionicons
                name={flash === 'off' ? 'flash-off' : flash === 'on' ? 'flash' : 'flash-outline'}
                size={20}
                color={flash === 'on' ? colors.coral : '#FFFFFF'}
              />
            }
            onPress={toggleFlash}
            accessibilityLabel="Bật tắt đèn Flash"
            variant="glass"
            size={44}
          />
        </View>

        {/* Framing Guides — tap to capture */}
        <Pressable
          onPress={takePhoto}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View
            style={{
              width: SCREEN_WIDTH * 0.88,
              height: SCREEN_WIDTH * 0.88 * 1.25,
              borderRadius: radii.xxl,
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.4)',
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingBottom: spacing.sm,
            }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' }}>
              {captureMode === 'album'
                ? `Chế độ Album: Đã chụp ${albumPhotos.length} ảnh (Chạm nút chụp nhiều lần)`
                : 'Chạm để chụp khoảnh khắc'}
            </Text>
          </View>
        </Pressable>

        {/* Bottom Section: Album Filmstrip Tray (when photos captured) + Shutter Bar */}
        <View style={{ width: '100%' }} pointerEvents="box-none">
          {/* Captured Photos Tray (Multi-shot Album) */}
          {captureMode === 'album' && albumPhotos.length > 0 && (
            <View style={styles.albumTrayContainer}>
              <View style={styles.albumTrayHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="images" size={15} color="#FFD700" />
                  <Text style={styles.albumTrayTitle}>
                    Album: {albumPhotos.length} ảnh
                  </Text>
                </View>

                {/* Instant Post or Review Button */}
                <Pressable
                  onPress={handleFinishAlbum}
                  style={styles.albumFinishButton}>
                  <Text style={styles.albumFinishButtonText}>
                    {instantPost ? '⚡ Đăng Album ngay' : 'Xem & Gửi →'}
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.albumTrayList}>
                {albumPhotos.map((pUri, idx) => (
                  <View key={`thumb_${idx}`} style={styles.albumThumbWrapper}>
                    <Image source={{ uri: pUri }} style={styles.albumThumbImage} />
                    <Pressable
                      onPress={() => removeAlbumPhoto(idx)}
                      style={styles.albumThumbRemove}>
                      <Ionicons name="close" size={12} color="#FFFFFF" />
                    </Pressable>
                    <View style={styles.albumThumbIndex}>
                      <Text style={styles.albumThumbIndexText}>{idx + 1}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Shutter & Controls Row */}
          <View
            style={[
              styles.shutterBar,
              { paddingBottom: Math.max(insets.bottom, 20) + 12 },
            ]}
            pointerEvents="box-none">
            {/* Gallery Picker Button */}
            <Pressable
              onPress={pickFromGallery}
              accessibilityRole="button"
              accessibilityLabel="Chọn ảnh từ thư viện"
              style={({ pressed }) => [
                styles.sideControlBtn,
                { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.93 : 1 }] },
              ]}>
              <Ionicons name="images" size={24} color="#FFFFFF" />
            </Pressable>

            {/* Tactile Big Shutter Button */}
            <Pressable
              onPress={takePhoto}
              disabled={isCapturing || isInstantPosting}
              accessibilityRole="button"
              accessibilityLabel="Chụp ảnh"
              style={({ pressed }) => [
                styles.shutterOuterRing,
                {
                  opacity: isCapturing || isInstantPosting ? 0.6 : 1,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}>
              <View style={[styles.shutterInnerCircle, { backgroundColor: colors.coral }]}>
                {isCapturing || isInstantPosting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.shutterDot} />
                )}
              </View>
            </Pressable>

            {/* Flip Camera Button */}
            <Pressable
              onPress={toggleFacing}
              accessibilityRole="button"
              accessibilityLabel="Đổi camera trước/sau"
              style={({ pressed }) => [
                styles.sideControlBtn,
                { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.93 : 1 }] },
              ]}>
              <Ionicons name="camera-reverse" size={26} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topModesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modePill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  modeTabActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  modeTabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  instantToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 4,
  },
  instantToggleActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderColor: '#FFD700',
  },
  instantToggleText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
  },
  instantToggleTextActive: {
    color: '#FFD700',
  },
  albumTrayContainer: {
    backgroundColor: 'rgba(20, 16, 18, 0.88)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 10,
    marginBottom: 6,
  },
  albumTrayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  albumTrayTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  albumFinishButton: {
    backgroundColor: '#FF4F5E',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  albumFinishButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  albumTrayList: {
    paddingHorizontal: 14,
    gap: 10,
  },
  albumThumbWrapper: {
    width: 58,
    height: 58,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  albumThumbImage: {
    width: '100%',
    height: '100%',
  },
  albumThumbRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumThumbIndex: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 5,
    borderRadius: 8,
  },
  albumThumbIndexText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  shutterBar: {
    paddingHorizontal: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingTop: 12,
  },
  sideControlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuterRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  shutterInnerCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
});
