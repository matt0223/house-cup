import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { Card } from '../ui/Card';
import { TaskRow } from './TaskRow';
import { TaskInstance } from '../../domain/models/TaskInstance';
import { Competitor } from '../../domain/models/Competitor';

export interface TaskListProps {
  /** Tasks to display */
  tasks: TaskInstance[];
  /** Competitors for points chips */
  competitors: Competitor[];
  /** Called when points change */
  onPointsChange: (taskId: string, competitorId: string, points: number) => void;
  /** Called when a task is pressed */
  onTaskPress?: (task: TaskInstance) => void;
}

/**
 * A list of tasks in a card container.
 */
export function TaskList({
  tasks,
  competitors,
  onPointsChange,
  onTaskPress,
}: TaskListProps) {
  const { colors } = useTheme();

  if (tasks.length === 0) {
    return null;
  }

  const renderItem = ({ item, index }: { item: TaskInstance; index: number }) => (
    <View>
      <TaskRow
        task={item}
        competitors={competitors}
        onPointsChange={(competitorId, points) =>
          onPointsChange(item.id, competitorId, points)
        }
        onPress={onTaskPress ? () => onTaskPress(item) : undefined}
      />
      {index < tasks.length - 1 && (
        <View
          style={[styles.divider, { backgroundColor: colors.divider }]}
        />
      )}
    </View>
  );

  return (
    <Card padding="none">
      <FlatList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});

export default TaskList;
