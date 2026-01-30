import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

export interface RepeatPillProps {
  /** Current repeat label (e.g., "Does not repeat", "Daily", "Mon, Wed, Fri") */
  label: string;
  /** Called when pill is pressed */
  onPress?: () => void;
  /** Whether the pill is disabled */
  disabled?: boolean;
}

/**
 * Pill showing the current repeat setting for a task.
 * Displays a repeat icon and label text.
 */
export function RepeatPill({
  label,
  onPress,
  disabled = false,
}: RepeatPillProps) {
  const { colors, typography, spacing, radius } = useTheme();

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
      accessibilityLabel={`Repeat: ${label}`}
      accessibilityRole="button"
    >
      <Ionicons
        name="repeat"
        size={16}
        color={colors.textSecondary}
        style={{ marginRight: spacing.xs }}
      />
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
});

export default RepeatPill;
