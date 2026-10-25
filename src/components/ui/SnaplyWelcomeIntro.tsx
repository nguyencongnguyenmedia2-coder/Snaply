import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme';

interface SnaplyWelcomeIntroProps {
  onFinish?: () => void;
  autoHideDuration?: number; // Total ms before auto-dismiss
}

export const SnaplyWelcomeIntro: React.FC<SnaplyWelcomeIntroProps> = ({
  onFinish,
  autoHideDuration = 2200,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, typography, shadows } = useTheme();
  const { user, profile } = useAuth();
  const [visible, setVisible] = useState(true);

  // Animated state values (React 19 compliant)
  const [logoScale] = useState(() => new Animated.Value(0.3));
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [flashScale] = useState(() => new Animated.Value(0.8));
  const [flashOpacity] = useState(() => new Animated.Value(0.9));
  const [titleOpacity] = useState(() => new Animated.Value(0));
  const [titleTranslateY] = useState(() => new Animated.Value(20));
  const [subtitleOpacity] = useState(() => new Animated.Value(0));
  const [greetingOpacity] = useState(() => new Animated.Value(0));
  const [containerOpacity] = useState(() => new Animated.Value(1));
  const [containerScale] = useState(() => new Animated.Value(1));

  // Background floating ambient orbs
  const [orb1Scale] = useState(() => new Animated.Value(0.8));
  const [orb2Scale] = useState(() => new Animated.Value(0.9));

  const dismissIntro = useCallback(() => {
    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(containerScale, {
        toValue: 1.06,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onFinish?.();
    });
  }, [containerOpacity, containerScale, onFinish]);

  useEffect(() => {
    // 1. Subtle Haptics feedback on mobile
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }

    // 2. Ambient background floating pulsation
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Scale, {
          toValue: 1.15,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(orb1Scale, {
          toValue: 0.85,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Staggered Intro Choreography
    Animated.sequence([
      // Step A: Logo burst & Flash pulse
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(flashScale, {
          toValue: 1.6,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),

      // Step B: Title slide up & fade in
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),

      // Step C: Subtitle & personalized greeting fade in
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(greetingOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 4. Auto dismiss after autoHideDuration
    const timer = setTimeout(() => {
      dismissIntro();
    }, autoHideDuration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoHideDuration, dismissIntro]);

  if (!visible) return null;

  const greetingName = profile?.display_name || user?.email?.split('@')[0];

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          backgroundColor: colors.background,
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}>
      {/* Tap anywhere to skip instantly */}
      <Pressable style={StyleSheet.absoluteFill} onPress={dismissIntro}>
        {/* Ambient Decorative Orbs */}
        <Animated.View
          style={[
            styles.ambientOrb,
            {
              top: -80,
              right: -60,
              width: 260,
              height: 260,
              borderRadius: 130,
              backgroundColor: '#FFE3D6',
              transform: [{ scale: orb1Scale }],
              opacity: 0.6,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ambientOrb,
            {
              bottom: 80,
              left: -80,
              width: 280,
              height: 280,
              borderRadius: 140,
              backgroundColor: '#FFECE4',
              transform: [{ scale: orb2Scale }],
              opacity: 0.5,
            },
          ]}
        />

        {/* Center Animated Logo & Branding */}
        <View style={[styles.centerContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Shutter Camera Flash Ring */}
          <Animated.View
            style={[
              styles.flashRing,
              {
                borderColor: colors.coral,
                transform: [{ scale: flashScale }],
                opacity: flashOpacity,
              },
            ]}
          />

          {/* Snaply Camera Logo Icon */}
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                transform: [{ scale: logoScale }],
                opacity: logoOpacity,
                ...shadows.lg,
              },
            ]}>
            <Image
              source={require('../../../assets/images/icon.png')}
              style={styles.logoImage}
              contentFit="contain"
            />
          </Animated.View>

          {/* Brand Name Title */}
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
              alignItems: 'center',
              marginTop: 20,
            }}>
            <Text
              style={[
                typography.display,
                {
                  color: colors.coral,
                  fontWeight: '900',
                  letterSpacing: -0.5,
                  fontSize: 38,
                },
              ]}>
              Snaply
            </Text>
          </Animated.View>

          {/* Slogan */}
          <Animated.View style={{ opacity: subtitleOpacity, alignItems: 'center', marginTop: 6 }}>
            <Text
              style={[
                typography.callout,
                {
                  color: colors.textSecondary,
                  fontWeight: '600',
                  letterSpacing: 0.2,
                },
              ]}>
              Khoảnh khắc nhỏ, gắn kết hơn.
            </Text>
          </Animated.View>

          {/* Personalized Warm Greeting */}
          <Animated.View
            style={[
              styles.greetingBadge,
              {
                opacity: greetingOpacity,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...shadows.sm,
              },
            ]}>
            <Text style={[typography.subhead, { color: colors.text, fontWeight: '600' }]}>
              {user
                ? `Chào mừng trở lại, ${greetingName} 🌸`
                : 'Chào mừng bạn đến với Snaply ✨'}
            </Text>
          </Animated.View>

          {/* Bottom subtle hint */}
          <View style={styles.bottomHintContainer}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.coral,
                opacity: 0.8,
                marginRight: 6,
              }}
            />
            <Text style={[typography.caption, { color: colors.textSecondary, opacity: 0.7 }]}>
              Chạm để tiếp tục
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientOrb: {
    position: 'absolute',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  flashRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
  },
  logoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  greetingBadge: {
    marginTop: 26,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  bottomHintContainer: {
    position: 'absolute',
    bottom: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
