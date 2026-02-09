import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../../theme/useTheme';
import { Card } from '../ui/Card';
import { SwipeableTaskRow } from './SwipeableTaskRow';
import { TaskInstance } from '../../domain/models/TaskInstance';
import { RecurringTemplate } from '../../domain/models/RecurringTemplate';
import { Competitor } from '../../domain/models/Competitor';

export interface TaskListProps {
  /** Tasks to display */
  tasks: TaskInstance[];
  /** Competitors for points chips */
  competitors: Competitor[];
  /** Recurring templates (for showing recurring icon only when task has repeat days) */
  templates?: RecurringTemplate[];
  /** Called when points change */
  onPointsChange: (taskId: string, competitorId: string, points: number) => void;
  /** Called when a task is pressed */
  onTaskPress?: (task: TaskInstance) => void;
  /** Called when a task is deleted via swipe */
  onTaskDelete?: (task: TaskInstance) => void;
  /** Show pulse nudge on the first task's score circle (for onboarding) */
  showScoreNudge?: boolean;
}

/**
 * A list of tasks in a card container.
 */
export function TaskList({
  tasks,
  competitors,
  templates = [],
  onPointsChange,
  onTaskPress,
  onTaskDelete,
  showScoreNudge = false,
}: TaskListProps) {
  const { colors } = useTheme();

  if (tasks.length === 0) {
    return null;
  }

  const renderItem = ({ item, index }: { item: TaskInstance; index: number }) => (
    <View>
      <SwipeableTaskRow
        task={item}
        competitors={competitors}
        templates={templates}
        onPointsChange={(competitorId, points) =>
          onPointsChange(item.id, competitorId, points)
        }
        onPress={onTaskPress ? () => onTaskPress(item) : undefined}
        onDelete={onTaskDelete ?? (() => {})}
        showScoreNudge={showScoreNudge && index === 0}
      />
      {index < tasks.length - 1 && (
        <View
          style={[styles.divider, { backgroundColor: colors.divider }]}
        />
      )}
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <Card padding="none">
        <FlatList
          data={tasks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </Card>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});

export default TaskList;
