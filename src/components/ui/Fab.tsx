import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

export interface FabProps {
  /** Called when FAB is pressed */
  onPress: () => void;
  /** Icon name (Ionicons) */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Position from bottom edge */
  bottom?: number;
  /** Position from right edge */
  right?: number;
  /** Accessibility label */
  accessibilityLabel?: string;
}

const FAB_SIZE = 56;

/**
 * Floating Action Button - fixed position button for primary actions.
 * Defaults to orange with a "+" icon in bottom-right corner.
 */
export function Fab({
  onPress,
  icon = 'add',
  bottom = 100,
  right = 20,
  accessibilityLabel = 'Add',
}: FabProps) {
  const { colors, shadows } = useTheme();

  const containerStyle: ViewStyle = {
    position: 'absolute',
    bottom,
    right,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={28} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

export default Fab;
