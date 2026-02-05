import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { PointsChip } from '../ui/PointsChip';
import { TaskInstance } from '../../domain/models/TaskInstance';
import { RecurringTemplate } from '../../domain/models/RecurringTemplate';
import { Competitor } from '../../domain/models/Competitor';

export interface TaskRowProps {
  /** The task to display */
  task: TaskInstance;
  /** Competitors to show chips for */
  competitors: Competitor[];
  /** Recurring templates (used to show icon only when task is actually recurring) */
  templates?: RecurringTemplate[];
  /** Called when points chip is tapped */
  onPointsChange: (competitorId: string, newPoints: number) => void;
  /** Called when task row is tapped (for editing) */
  onPress?: () => void;
}

/**
 * A row displaying a task with points chips for each competitor.
 * Shows the recurring icon only when the task is linked to a template that has repeat days.
 */
export function TaskRow({
  task,
  competitors,
  templates = [],
  onPointsChange,
  onPress,
}: TaskRowProps) {
  const { colors, typography, spacing } = useTheme();

  const isRecurring =
    Boolean(task.templateId) &&
    templates.some(
      (t) => t.id === task.templateId && (t.repeatDays?.length ?? 0) > 0
    );

  const handlePointsTap = (competitor: Competitor) => {
    const currentPoints = task.points[competitor.id] ?? 0;
    const newPoints = (currentPoints + 1) % 4; // Cycle 0 → 1 → 2 → 3 → 0
    onPointsChange(competitor.id, newPoints);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { paddingVertical: spacing.sm }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.nameContainer}>
        <Text
          style={[typography.body, { color: colors.textPrimary, flexShrink: 1 }]}
          numberOfLines={1}
        >
          {task.name}
        </Text>
        {isRecurring && (
          <Ionicons
            name="repeat"
            size={14}
            color={colors.textSecondary}
            style={{ marginLeft: 8 }}
          />
        )}
      </View>

      <View style={styles.chipsContainer}>
        {competitors.map((competitor) => (
          <PointsChip
            key={competitor.id}
            competitor={competitor}
            points={task.points[competitor.id] ?? 0}
            onPress={() => handlePointsTap(competitor)}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default TaskRow;
