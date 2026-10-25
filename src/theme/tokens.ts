import { Platform } from 'react-native';

export const Palette = {
  cream: '#FFF8F1',
  coral: '#FF806E',
  coralDark: '#E66856',
  coralLight: '#FFECE8',
  blush: '#F5C8D7',
  blushLight: '#FDF1F5',
  charcoal: '#292526',
  charcoalLight: '#3D3839',
  sage: '#B8C9B5',
  sageLight: '#EBF2EA',
  mutedText: '#827772',
  mutedTextLight: '#A89F9A',
  surface: '#FFFFFF',
  surfaceSubtle: '#FDF9F5',
  border: '#EFE7DE',
  borderDark: '#36312F',
  error: '#E5484D',
  errorLight: '#FDECEE',
  success: '#46A758',
  successLight: '#EDF8EE',
  warning: '#F5A623',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const Colors = {
  light: {
    background: Palette.cream,
    backgroundSecondary: Palette.surfaceSubtle,
    surface: Palette.surface,
    surfaceSubtle: Palette.surfaceSubtle,
    surfaceMuted: Palette.coralLight,
    text: Palette.charcoal,
    charcoal: Palette.charcoal,
    textSecondary: Palette.mutedText,
    textInverted: Palette.cream,
    tint: Palette.coral,
    coral: Palette.coral,
    coralDark: Palette.coralDark,
    coralLight: Palette.coralLight,
    blush: Palette.blush,
    blushLight: Palette.blushLight,
    sage: Palette.sage,
    sageLight: Palette.sageLight,
    border: Palette.border,
    error: Palette.error,
    errorLight: Palette.errorLight,
    success: Palette.success,
    successLight: Palette.successLight,
    card: Palette.surface,
    tabBar: Palette.surface,
    tabBarBorder: Palette.border,
    tabBarActive: Palette.coral,
    tabBarInactive: Palette.mutedText,
    shadow: 'rgba(41, 37, 38, 0.08)',
    overlay: 'rgba(41, 37, 38, 0.45)',
  },
  dark: {
    background: '#1A1716',
    backgroundSecondary: '#211E1D',
    surface: '#262221',
    surfaceSubtle: '#2A2524',
    surfaceMuted: '#332927',
    text: '#FAF7F5',
    charcoal: '#FAF7F5',
    textSecondary: '#A89F9A',
    textInverted: '#1A1716',
    tint: '#FF8A7A',
    coral: '#FF8A7A',
    coralDark: '#E66856',
    coralLight: '#3D2522',
    blush: '#7A4556',
    blushLight: '#3D222B',
    sage: '#8EA38B',
    sageLight: '#263325',
    border: '#383230',
    error: '#FF6B6B',
    errorLight: '#3D1C1F',
    success: '#5BB96E',
    successLight: '#1C3320',
    card: '#262221',
    tabBar: '#211E1D',
    tabBarBorder: '#383230',
    tabBarActive: '#FF8A7A',
    tabBarInactive: '#8A827E',
    shadow: 'rgba(0, 0, 0, 0.35)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
} as const;

export type ThemeColors = typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const Typography = {
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  title3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  headline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400' as const,
  },
  callout: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500' as const,
  },
  subhead: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  giant: 48,
} as const;

export const Radii = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#292526',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#292526',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#292526',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const IconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 36,
  xxl: 48,
} as const;

export const Animation = {
  durationFast: 150,
  durationNormal: 250,
  durationSlow: 400,
  springConfig: {
    damping: 15,
    stiffness: 150,
    mass: 0.8,
  },
} as const;
