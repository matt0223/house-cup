import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { getOrderedDays, getDayOfWeekLabel } from '../../domain/services';
import { WeekStartDay } from '../../domain/models/Household';

export interface RepeatDayPickerProps {
  /** Currently selected days (0-6, where 0=Sunday) */
  selectedDays: number[];
  /** Called when day selection changes */
  onDaysChange: (days: number[]) => void;
  /** Day the week starts (0-6) - determines display order */
  weekStartDay: WeekStartDay;
  /** Today's day of week (0-6, where 0=Sunday). Shows an orange stroke ring when not selected. */
  todayDay?: number;
}

const CHIP_SIZE = 36;

/**
 * Multi-select day picker for choosing repeat days.
 * Renders 7 day chips in order based on weekStartDay.
 * Tapping a day toggles its selection.
 */
export function RepeatDayPicker({
  selectedDays,
  onDaysChange,
  weekStartDay,
  todayDay,
}: RepeatDayPickerProps) {
  const { colors, typography, spacing } = useTheme();

  // Get days in display order based on week start
  const orderedDays = getOrderedDays(weekStartDay);

  const handleDayPress = (day: number) => {
    if (selectedDays.includes(day)) {
      // Remove day
      onDaysChange(selectedDays.filter((d) => d !== day));
    } else {
      // Add day
      onDaysChange([...selectedDays, day]);
    }
  };

  return (
    <View style={[styles.container, { gap: spacing.sm }]}>
      {orderedDays.map((day) => {
        const isSelected = selectedDays.includes(day);
        const isToday = todayDay !== undefined && day === todayDay;
        const label = getDayOfWeekLabel(day);

        return (
          <TouchableOpacity
            key={day}
            onPress={() => handleDayPress(day)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : 'transparent',
                borderWidth: isSelected ? 0 : (isToday ? 2 : 1),
                borderColor: isToday && !isSelected ? colors.primary : colors.border,
              },
            ]}
            accessibilityLabel={`${label}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}
            accessibilityRole="button"
          >
            <Text
              style={[
                typography.callout,
                { color: isSelected ? '#FFFFFF' : colors.textPrimary, fontWeight: '500' },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RepeatDayPicker;
