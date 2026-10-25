import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MOMOButton, MOMOIconButton } from '@/components/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radii, spacing, typography } = useTheme();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
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

  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (photo?.uri) {
        router.push({
          pathname: '/camera/preview',
          params: { uri: photo.uri },
        });
      }
    } catch (err) {
      console.warn('Take picture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.85,
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
        {/* Top Control Bar */}
        <View
          style={{
            paddingTop: Math.max(insets.top, 16),
            paddingHorizontal: spacing.xl,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <MOMOIconButton
            icon={<Ionicons name="close" size={24} color="#FFFFFF" />}
            onPress={() => router.push('/(tabs)')}
            accessibilityLabel="Close Camera"
            variant="glass"
            size={42}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MOMOIconButton
              icon={
                <Ionicons
                  name={flash === 'off' ? 'flash-off' : flash === 'on' ? 'flash' : 'flash-outline'}
                  size={22}
                  color="#FFFFFF"
                />
              }
              onPress={toggleFlash}
              accessibilityLabel="Toggle Flash"
              variant="glass"
              size={42}
              style={{ marginRight: spacing.sm }}
            />

            <MOMOIconButton
              icon={<Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />}
              onPress={toggleFacing}
              accessibilityLabel="Flip Camera"
              variant="glass"
              size={42}
            />
          </View>
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
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.4)',
              borderStyle: 'dashed',
            }}
          />
        </View>

        {/* Bottom Shutter & Gallery Bar */}
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 24) + 12,
            paddingHorizontal: spacing.xxl,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          {/* Gallery Picker */}
          <Pressable
            onPress={pickFromGallery}
            accessibilityRole="button"
            accessibilityLabel="Choose photo from library"
            style={({ pressed }) => [
              {
                width: 48,
                height: 48,
                borderRadius: radii.lg,
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Ionicons name="images-outline" size={26} color="#FFFFFF" />
          </Pressable>

          {/* Shutter Button */}
          <Pressable
            onPress={takePhoto}
            disabled={isCapturing}
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
            style={({ pressed }) => [
              {
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 4,
                borderColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                opacity: isCapturing ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
            ]}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.coral,
              }}
            />
          </Pressable>

          {/* Filter / Mode placeholder */}
          <View style={{ width: 48, height: 48 }} />
        </View>
      </CameraView>
    </View>
  );
}
