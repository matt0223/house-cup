import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

export interface AddTaskButtonProps {
  /** Called when button is pressed */
  onPress: () => void;
  /** Position from bottom edge */
  bottom?: number;
  /** Position from right edge */
  right?: number;
}

/**
 * Floating pill-shaped "Add task" button.
 * Positioned in bottom-right corner above the tab bar.
 */
export function AddTaskButton({
  onPress,
  bottom = 100,
  right = 16,
}: AddTaskButtonProps) {
  const { colors, typography, spacing, radius, shadows } = useTheme();

  const containerStyle: ViewStyle = {
    position: 'absolute',
    bottom,
    right,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.medium,
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel="Add task"
      accessibilityRole="button"
    >
      <Ionicons name="add" size={20} color="#FFFFFF" />
      <Text
        style={[
          typography.callout,
          styles.label,
        ]}
      >
        Add task
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
});

export default AddTaskButton;
