import React, { createContext, useContext, ReactNode } from 'react';
import { useColorScheme, ColorSchemeName } from 'react-native';
import { useThemePreference } from '../store/useHouseholdStore';
import { ThemePreference } from '../domain/models/Household';

/**
 * Context value providing the resolved color scheme.
 */
interface ThemeContextValue {
  /** The resolved color scheme ('light' or 'dark') */
  colorScheme: 'light' | 'dark';
  /** Whether dark mode is active */
  isDark: boolean;
  /** The user's preference setting */
  preference: ThemePreference;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Resolves the actual color scheme based on user preference and system setting.
 */
function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: ColorSchemeName
): 'light' | 'dark' {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  // 'system' - use device preference, default to light
  return systemScheme === 'dark' ? 'dark' : 'light';
}

/**
 * Provider component that resolves theme based on user preference.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const preference = useThemePreference();
  
  const colorScheme = resolveColorScheme(preference, systemScheme);
  const isDark = colorScheme === 'dark';

  return (
    <ThemeContext.Provider value={{ colorScheme, isDark, preference }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the resolved theme context.
 * Must be used within a ThemeProvider.
 */
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback for when used outside provider (e.g., during initial render)
    return {
      colorScheme: 'light',
      isDark: false,
      preference: 'system',
    };
  }
  return context;
}
