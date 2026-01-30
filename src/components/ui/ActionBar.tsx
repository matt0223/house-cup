import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

export interface ActionBarProps {
  /** Called when Add task button is pressed */
  onAddTask: () => void;
  /** Called when filter button is pressed */
  onFilter?: () => void;
}

/**
 * Bottom action bar with filter button (left) and Add task button (right).
 * Sits above the tab bar.
 */
export function ActionBar({ onAddTask, onFilter }: ActionBarProps) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* Filter button */}
      <TouchableOpacity
        style={[
          styles.filterButton,
          {
            backgroundColor: colors.surface,
            borderRadius: radius.medium,
            padding: spacing.sm,
          },
        ]}
        onPress={onFilter}
        activeOpacity={0.7}
        accessibilityLabel="Filter tasks"
        accessibilityRole="button"
      >
        <Ionicons name="filter-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Add task button */}
      <TouchableOpacity
        style={[
          styles.addButton,
          {
            backgroundColor: colors.primary,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          },
        ]}
        onPress={onAddTask}
        activeOpacity={0.8}
        accessibilityLabel="Add task"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text
          style={[
            typography.callout,
            { color: '#FFFFFF', marginLeft: spacing.xs, fontWeight: '600' },
          ]}
        >
          Add task
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ActionBar;
