/**
 * Color tokens for House Cup design system.
 * Supports light and dark mode with warm, inviting tones.
 *
 * Note: Competitor colors are NOT in the theme - they come from
 * the Competitor object and are user-configurable. Orange is reserved
 * for the app's primary accent and cannot be chosen by users.
 */

// Light mode colors
export const lightColors = {
  // Backgrounds
  background: '#FAF8F5', // Warm cream
  surface: '#FFFFFF', // Cards, sheets

  // Accent colors
  primary: '#E8836D', // Coral/orange - app accent (reserved, not for competitors)
  prize: '#E9B44C', // Gold/amber for trophy

  // Text colors
  textPrimary: '#1A1A1A',
  textSecondary: '#8E8E93',

  // UI colors
  border: '#E5E5E5',
  divider: '#E5E5E5',

  // Tab bar
  tabActive: '#E8836D',
  tabInactive: '#8E8E93',

  // Semantic
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
} as const;

// Dark mode colors
export const darkColors = {
  // Backgrounds
  background: '#1C1917', // Warm dark
  surface: '#292524', // Cards, sheets

  // Accent colors
  primary: '#E8836D', // Coral/orange - app accent
  prize: '#E9B44C',

  // Text colors
  textPrimary: '#FAFAFA',
  textSecondary: '#8E8E93',

  // UI colors
  border: '#3D3D3D',
  divider: '#3D3D3D',

  // Tab bar
  tabActive: '#E8836D',
  tabInactive: '#8E8E93',

  // Semantic
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
} as const;

/**
 * Color scheme type - uses string instead of literal types for flexibility
 */
export interface ColorScheme {
  background: string;
  surface: string;
  primary: string;
  prize: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  divider: string;
  tabActive: string;
  tabInactive: string;
  success: string;
  warning: string;
  error: string;
}

/**
 * Get colors based on color scheme
 */
export function getColors(isDark: boolean): ColorScheme {
  return isDark ? darkColors : lightColors;
}
