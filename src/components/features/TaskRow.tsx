import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { PointsChip } from '../ui/PointsChip';
import { TaskInstance } from '../../domain/models/TaskInstance';
import { Competitor } from '../../domain/models/Competitor';

export interface TaskRowProps {
  /** The task to display */
  task: TaskInstance;
  /** Competitors to show chips for */
  competitors: Competitor[];
  /** Called when points chip is tapped */
  onPointsChange: (competitorId: string, newPoints: number) => void;
  /** Called when task row is tapped (for editing) */
  onPress?: () => void;
}

/**
 * A row displaying a task with points chips for each competitor.
 */
export function TaskRow({
  task,
  competitors,
  onPointsChange,
  onPress,
}: TaskRowProps) {
  const { colors, typography, spacing } = useTheme();

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
      <Text
        style={[typography.body, { color: colors.textPrimary, flex: 1 }]}
        numberOfLines={2}
      >
        {task.name}
      </Text>

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
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default TaskRow;
