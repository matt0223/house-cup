import { getColors, ColorScheme } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { radius } from './radius';
import { shadows } from './shadows';
import { useThemeContext } from './ThemeContext';

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
 * Hook to access theme values based on user preference and system color scheme.
 *
 * @example
 * const { colors, spacing } = useTheme();
 * <View style={{ backgroundColor: colors.background, padding: spacing.md }} />
 */
export function useTheme(): Theme {
  const { isDark } = useThemeContext();

  return {
    colors: getColors(isDark),
    spacing,
    typography,
    radius,
    shadows,
    isDark,
  };
}
