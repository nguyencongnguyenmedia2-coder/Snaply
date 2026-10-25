import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MOMOButton, MOMOIconButton } from '@/components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radii, spacing, typography } = useTheme();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashOpacity] = useState(() => new Animated.Value(0));
  const cameraRef = useRef<any>(null);

  const toggleFacing = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setFlash((current) => (current === 'off' ? 'on' : current === 'on' ? 'auto' : 'off'));
  };

  const triggerShutterFlash = () => {
    flashOpacity.setValue(0.85);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const takePhoto = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);

      // Trigger shutter visual and haptic feedback immediately
      triggerShutterFlash();
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch {}
      }

      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.88,
          skipProcessing: false,
        });

        if (photo?.uri) {
          router.push({
            pathname: '/camera/preview',
            params: { uri: photo.uri },
          });
          return;
        }
      }

      // Fallback if cameraRef not ready or on web
      const fallbackUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=80';
      router.push({
        pathname: '/camera/preview',
        params: { uri: fallbackUrl },
      });
    } catch (err) {
      console.warn('Take picture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.88,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        router.push({
          pathname: '/camera/preview',
          params: { uri: result.assets[0].uri },
        });
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
          Allow Camera Access
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
          MOMO captures authentic, intimate moments to share with your chosen circle and home-screen widgets.
        </Text>

        <MOMOButton
          title="Grant Camera Access"
          onPress={requestPermission}
          variant="primary"
          size="lg"
          style={{ width: '100%', marginBottom: spacing.md }}
        />

        <MOMOButton
          title="Select from Photo Library Instead"
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
        enableTorch={flash === 'on'}>
        
        {/* Shutter flash animation overlay */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#FFFFFF',
              opacity: flashOpacity,
            },
          ]}
        />

        {/* Top Floating Control Bar */}
        <View
          style={{
            paddingTop: Math.max(insets.top, 20),
            paddingHorizontal: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}>
          <MOMOIconButton
            icon={<Ionicons name="close" size={24} color="#FFFFFF" />}
            onPress={() => router.push('/(tabs)')}
            accessibilityLabel="Close Camera"
            variant="glass"
            size={44}
          />

          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radii.full,
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
            }}>
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
              MOMO MOMENT
            </Text>
          </View>

          <MOMOIconButton
            icon={
              <Ionicons
                name={flash === 'off' ? 'flash-off' : flash === 'on' ? 'flash' : 'flash-outline'}
                size={22}
                color={flash === 'on' ? colors.coral : '#FFFFFF'}
              />
            }
            onPress={toggleFlash}
            accessibilityLabel="Toggle Flash"
            variant="glass"
            size={44}
          />
        </View>

        {/* Framing Guides */}
        <View
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
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.45)',
              borderStyle: 'dashed',
            }}
          />
        </View>

        {/* Bottom Shutter & Controls Bar (Dedicated Full Screen) */}
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 24) + 16,
            paddingHorizontal: spacing.xxl,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}>
          {/* Gallery Picker */}
          <Pressable
            onPress={pickFromGallery}
            accessibilityRole="button"
            accessibilityLabel="Choose photo from library"
            style={({ pressed }) => [
              {
                width: 52,
                height: 52,
                borderRadius: radii.full,
                backgroundColor: 'rgba(255, 255, 255, 0.28)',
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.4)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}>
            <Ionicons name="images" size={24} color="#FFFFFF" />
          </Pressable>

          {/* Big Tactile Shutter Button */}
          <Pressable
            onPress={takePhoto}
            disabled={isCapturing}
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
            style={({ pressed }) => [
              {
                width: 86,
                height: 86,
                borderRadius: 43,
                borderWidth: 4,
                borderColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                opacity: isCapturing ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.92 : 1 }],
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
              },
            ]}>
            <View
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: colors.coral,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                }}
              />
            </View>
          </Pressable>

          {/* Flip Camera Button */}
          <Pressable
            onPress={toggleFacing}
            accessibilityRole="button"
            accessibilityLabel="Flip camera front or rear"
            style={({ pressed }) => [
              {
                width: 52,
                height: 52,
                borderRadius: radii.full,
                backgroundColor: 'rgba(255, 255, 255, 0.28)',
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.4)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}>
            <Ionicons name="camera-reverse" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}
