import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/useTheme';

export interface DayChipProps {
  /** Day label (single letter: S, M, T, etc.) */
  label: string;
  /** Whether this day is selected */
  isSelected: boolean;
  /** Whether this day is today */
  isToday: boolean;
  /** Called when chip is tapped */
  onPress: () => void;
}

const CHIP_SIZE = 36;

/**
 * A single day indicator chip for the day strip.
 * Shows day letter with selected and today states.
 *
 * States:
 * - Default: Just the letter
 * - Today (not selected): Letter with coral ring
 * - Selected: Filled coral circle with white letter
 */
export function DayChip({
  label,
  isSelected,
  isToday,
  onPress,
}: DayChipProps) {
  const { colors, typography } = useTheme();

  const backgroundColor = isSelected ? colors.primary : 'transparent';
  // Text is white when selected, otherwise always dark (even for today with ring)
  const textColor = isSelected ? '#FFFFFF' : colors.textPrimary;

  const containerStyle: ViewStyle = {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    backgroundColor,
    borderWidth: isToday && !isSelected ? 2 : 0,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={containerStyle}
      accessibilityLabel={`${label}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}
      accessibilityRole="button"
    >
      <Text style={[typography.callout, { color: textColor, fontWeight: '500' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default DayChip;
