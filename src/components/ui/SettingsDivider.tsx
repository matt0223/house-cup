import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export interface SettingsDividerProps {
  /** Left margin to align with row content (e.g. after icon or avatar). Default 0. */
  marginLeft?: number;
}

/**
 * Horizontal divider used between rows in settings sections.
 * Always inset on the right by spacing.sm so it aligns with row content (e.g. buttons, values).
 * Use marginLeft to align the left edge with content when rows have icons/avatars.
 */
export function SettingsDivider({ marginLeft = 0 }: SettingsDividerProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.divider,
        {
          backgroundColor: colors.divider,
          marginLeft,
          marginRight: spacing.sm,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});

export default SettingsDivider;
