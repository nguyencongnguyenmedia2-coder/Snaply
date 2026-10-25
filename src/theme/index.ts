import { useColorScheme } from 'react-native';
import { Colors, Palette, Typography, Spacing, Radii, Shadows, IconSizes, Animation } from './tokens';

export * from './tokens';

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return {
    isDark,
    colors,
    palette: Palette,
    typography: Typography,
    spacing: Spacing,
    radii: Radii,
    shadows: Shadows,
    iconSizes: IconSizes,
    animation: Animation,
  };
}

export type Theme = ReturnType<typeof useTheme>;
export type ThemeColors = typeof Colors.light;
