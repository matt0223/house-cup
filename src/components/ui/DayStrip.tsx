import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DayChip } from './DayChip';
import { useTheme } from '../../theme/useTheme';

export interface DayStripProps {
  /** Array of day keys for the week (e.g., ['2026-01-24', '2026-01-25', ...]) */
  dayKeys: string[];
  /** Currently selected day key */
  selectedDayKey: string;
  /** Today's day key */
  todayDayKey: string;
  /** Called when a day is selected */
  onSelectDay: (dayKey: string) => void;
}

/**
 * Get single-letter day label from day key.
 * Uses the first letter of the weekday name.
 */
function getDayLabel(dayKey: string): string {
  const date = new Date(dayKey + 'T12:00:00'); // Noon to avoid timezone issues
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  return dayName.charAt(0).toUpperCase();
}

/**
 * A horizontal strip of 7 days for week navigation.
 * Shows the week's days with selection and today indicator.
 */
export function DayStrip({
  dayKeys,
  selectedDayKey,
  todayDayKey,
  onSelectDay,
}: DayStripProps) {
  const { spacing } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.sm }]}>
      {dayKeys.map((dayKey) => (
        <DayChip
          key={dayKey}
          label={getDayLabel(dayKey)}
          isSelected={dayKey === selectedDayKey}
          isToday={dayKey === todayDayKey}
          onPress={() => onSelectDay(dayKey)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default DayStrip;
