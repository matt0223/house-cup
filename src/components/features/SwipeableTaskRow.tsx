import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../theme/useTheme';
import { TaskRow, TaskRowProps } from './TaskRow';
import { TaskInstance } from '../../domain/models/TaskInstance';

export interface SwipeableTaskRowProps extends Omit<TaskRowProps, 'task'> {
  /** The task to display */
  task: TaskInstance;
  /** Called when delete action is triggered */
  onDelete: (task: TaskInstance) => void;
}

/**
 * A TaskRow wrapped with swipe-to-delete functionality.
 */
export function SwipeableTaskRow({
  task,
  onDelete,
  ...taskRowProps
}: SwipeableTaskRowProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const handleDelete = () => {
    swipeableRef.current?.close();
    onDelete(task);
  };

  // Match PointsChip medium size (44px)
  const BUTTON_HEIGHT = 44;
  // Slightly desaturated red for softer appearance
  const DELETE_COLOR = '#E25C54';

  const renderRightActions = () => (
    <View style={styles.deleteActionContainer}>
      <TouchableOpacity
        style={[
          styles.deleteButton,
          {
            height: BUTTON_HEIGHT,
            backgroundColor: DELETE_COLOR,
            borderRadius: BUTTON_HEIGHT / 2, // Full pill shape
            paddingHorizontal: spacing.md,
          },
        ]}
        onPress={handleDelete}
        activeOpacity={0.8}
      >
        <Text style={[typography.callout, styles.deleteText]}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <View style={{ backgroundColor: colors.surface }}>
        <TaskRow task={task} {...taskRowProps} />
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteActionContainer: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default SwipeableTaskRow;
