import { useColorScheme } from 'react-native';
import { getColors, ColorScheme } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { radius } from './radius';
import { shadows } from './shadows';

/**
 * Theme object returned by useTheme hook
 */
export interface Theme {
  colors: ColorScheme;
  spacing: typeof spacing;
  typography: typeof typography;
  radius: typeof radius;
  shadows: typeof shadows;
  isDark: boolean;
}

/**
 * Hook to access theme values based on current color scheme.
 *
 * @example
 * const { colors, spacing } = useTheme();
 * <View style={{ backgroundColor: colors.background, padding: spacing.md }} />
 */
export function useTheme(): Theme {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    colors: getColors(isDark),
    spacing,
    typography,
    radius,
    shadows,
    isDark,
  };
}
