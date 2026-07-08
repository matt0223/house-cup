import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
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

/** Diameter of the floating action button */
const FAB_SIZE = 56;

/**
 * Floating circular add-task button (Todoist-style FAB).
 * Positioned in the bottom-right corner.
 */
export function AddTaskButton({
  onPress,
  bottom = 100,
  right = 16,
}: AddTaskButtonProps) {
  const { colors, shadows } = useTheme();

  const containerStyle: ViewStyle = {
    position: 'absolute',
    bottom,
    right,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
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
      <Ionicons name="add" size={28} color={colors.onAccent} />
    </TouchableOpacity>
  );
}
