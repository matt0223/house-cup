import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

export interface KebabButtonProps {
  /** Called when button is pressed */
  onPress?: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * Three-dot kebab menu button styled to match RepeatPill.
 * Used in edit mode to show additional actions like delete.
 */
export function KebabButton({ onPress, disabled = false }: KebabButtonProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        },
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      accessibilityLabel="More options"
      accessibilityRole="button"
    >
      <Ionicons
        name="ellipsis-horizontal"
        size={16}
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default KebabButton;
