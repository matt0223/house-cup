import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { GestureHandlerRootView, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  useDerivedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
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
  /** Called with reordered tasks after a drag completes */
  onReorder?: (reorderedTasks: TaskInstance[]) => void;
  /** Show pulse nudge on the first task's score circle (for onboarding) */
  showScoreNudge?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a positions map: { [taskId]: slotIndex } */
function buildPositions(tasks: TaskInstance[]): Record<string, number> {
  const pos: Record<string, number> = {};
  tasks.forEach((t, i) => { pos[t.id] = i; });
  return pos;
}

/** Swap two slot values inside the positions object (worklet-safe). */
function objectSwap(
  obj: Record<string, number>,
  fromSlot: number,
  toSlot: number,
): Record<string, number> {
  'worklet';
  const next = Object.assign({}, obj);
  for (const id in obj) {
    if (obj[id] === fromSlot) next[id] = toSlot;
    else if (obj[id] === toSlot) next[id] = fromSlot;
  }
  return next;
}

// ---------------------------------------------------------------------------
// TaskList
// ---------------------------------------------------------------------------

/**
 * A list of tasks in a card container with grip-based drag-to-reorder.
 *
 * Rows are absolutely positioned and driven by shared-value positions so that
 * all drag and drop animations happen on the UI thread with zero React
 * re-renders. This eliminates the flash-to-origin issue.
 */
export function TaskList({
  tasks,
  competitors,
  templates = [],
  onPointsChange,
  onTaskPress,
  onTaskDelete,
  onReorder,
  showScoreNudge = false,
}: TaskListProps) {
  const { colors } = useTheme();

  if (tasks.length === 0) {
    return null;
  }

  // --- Row height measurement ---
  const ROW_HEIGHT = useSharedValue(0);
  const [measuredRowHeight, setMeasuredRowHeight] = useState(0);

  const onFirstRowLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && measuredRowHeight === 0) {
      setMeasuredRowHeight(h);
      ROW_HEIGHT.value = h;
    }
  }, [measuredRowHeight]);

  // --- Positions map (shared value — drives all row positions on UI thread) ---
  const positions = useSharedValue<Record<string, number>>(buildPositions(tasks));

  // Keep positions in sync when the tasks array changes from outside
  // (e.g. adding/deleting a task, changing day).
  const prevTaskIdsRef = useRef(tasks.map((t) => t.id).join(','));
  const taskIds = tasks.map((t) => t.id).join(',');
  if (taskIds !== prevTaskIdsRef.current) {
    prevTaskIdsRef.current = taskIds;
    positions.value = buildPositions(tasks);
  }

  // --- Drag state ---
  const draggedId = useSharedValue<string | null>(null);
  const isDragMovable = useSharedValue(false);
  const currentSlot = useSharedValue(-1); // current slot of the dragged item

  // React state for insertion line rendering
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropTargetSlot, setDropTargetSlot] = useState(-1);
  const [draggingFromSlot, setDraggingFromSlot] = useState(-1);

  // --- Callbacks bridged from UI thread ---
  const onDragStart = useCallback((taskId: string, slot: number) => {
    setDraggingTaskId(taskId);
    setDropTargetSlot(slot);
    setDraggingFromSlot(slot);
  }, []);

  const onTargetUpdate = useCallback((slot: number) => {
    setDropTargetSlot(slot);
  }, []);

  const onDragEnd = useCallback(() => {
    // Read the final positions from the shared value and commit to React state
    const finalPositions = positions.value;
    const ordered = [...tasks].sort(
      (a, b) => (finalPositions[a.id] ?? 0) - (finalPositions[b.id] ?? 0),
    );

    // Check if order actually changed
    const changed = ordered.some((t, i) => t.id !== tasks[i].id);
    if (changed && onReorder) {
      onReorder(ordered);
    }

    setDraggingTaskId(null);
    setDropTargetSlot(-1);
    setDraggingFromSlot(-1);
  }, [tasks, onReorder, positions]);

  // Container height for absolute positioning
  const containerHeight = measuredRowHeight > 0 ? measuredRowHeight * tasks.length : undefined;

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <Card padding="none" style={containerHeight ? { height: containerHeight } : undefined}>
        {tasks.map((task, arrayIndex) => (
          <SortableRow
            key={task.id}
            task={task}
            taskId={task.id}
            arrayIndex={arrayIndex}
            positions={positions}
            ROW_HEIGHT={ROW_HEIGHT}
            draggedId={draggedId}
            isDragMovable={isDragMovable}
            currentSlot={currentSlot}
            tasksCount={tasks.length}
            competitors={competitors}
            templates={templates}
            onPointsChange={onPointsChange}
            onTaskPress={onTaskPress}
            onTaskDelete={onTaskDelete}
            onReorder={onReorder}
            showScoreNudge={showScoreNudge && arrayIndex === 0}
            onDragStart={onDragStart}
            onTargetUpdate={onTargetUpdate}
            onDragEnd={onDragEnd}
            onLayout={arrayIndex === 0 ? onFirstRowLayout : undefined}
            // Insertion line state
            draggingTaskId={draggingTaskId}
            dropTargetSlot={dropTargetSlot}
            draggingFromSlot={draggingFromSlot}
            dividerColor={colors.divider}
            insertionLineColor={colors.primary}
          />
        ))}
      </Card>
    </GestureHandlerRootView>
  );
}

// ---------------------------------------------------------------------------
// SortableRow — each row manages its own position via shared values
// ---------------------------------------------------------------------------

interface SortableRowProps {
  task: TaskInstance;
  taskId: string;
  arrayIndex: number;
  positions: Animated.SharedValue<Record<string, number>>;
  ROW_HEIGHT: Animated.SharedValue<number>;
  draggedId: Animated.SharedValue<string | null>;
  isDragMovable: Animated.SharedValue<boolean>;
  currentSlot: Animated.SharedValue<number>;
  tasksCount: number;
  competitors: Competitor[];
  templates: RecurringTemplate[];
  onPointsChange: (taskId: string, competitorId: string, points: number) => void;
  onTaskPress?: (task: TaskInstance) => void;
  onTaskDelete?: (task: TaskInstance) => void;
  onReorder?: (reorderedTasks: TaskInstance[]) => void;
  showScoreNudge: boolean;
  onDragStart: (taskId: string, slot: number) => void;
  onTargetUpdate: (slot: number) => void;
  onDragEnd: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  // Insertion line
  draggingTaskId: string | null;
  dropTargetSlot: number;
  draggingFromSlot: number;
  dividerColor: string;
  insertionLineColor: string;
}

function SortableRow({
  task,
  taskId,
  arrayIndex,
  positions,
  ROW_HEIGHT,
  draggedId,
  isDragMovable,
  currentSlot,
  tasksCount,
  competitors,
  templates,
  onPointsChange,
  onTaskPress,
  onTaskDelete,
  onReorder,
  showScoreNudge,
  onDragStart,
  onTargetUpdate,
  onDragEnd,
  onLayout,
  draggingTaskId,
  dropTargetSlot,
  draggingFromSlot,
  dividerColor,
  insertionLineColor,
}: SortableRowProps) {
  // This row's slot position (derived from the positions map)
  const mySlot = useDerivedValue(() => {
    return positions.value[taskId] ?? arrayIndex;
  });

  // Animated top: follows the slot from the positions map.
  // Non-dragged rows animate smoothly when displaced.
  const top = useSharedValue((positions.value[taskId] ?? arrayIndex) * (ROW_HEIGHT.value || 0));

  // React to slot changes for non-dragged rows (smooth displacement animation)
  useAnimatedReaction(
    () => ({ slot: mySlot.value, h: ROW_HEIGHT.value, dragging: draggedId.value === taskId }),
    (curr, prev) => {
      if (!curr.dragging && curr.h > 0) {
        // Only animate if this isn't the first mount
        if (prev && prev.slot !== curr.slot) {
          top.value = withSpring(curr.slot * curr.h, { damping: 100, stiffness: 200 });
        } else if (!prev || prev.h === 0) {
          // First mount or height just measured — snap
          top.value = curr.slot * curr.h;
        }
      }
    },
    [taskId],
  );

  // --- Gesture: activateAfterLongPress combines long-press + pan in one gesture ---
  // This eliminates the two-phase activation problem where the first touch
  // always failed because React state had to re-render to enable the gesture.
  const startY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      // Initialize drag state (previously done in handleGripLongPress)
      const slot = positions.value[taskId] ?? 0;
      draggedId.value = taskId;
      currentSlot.value = slot;
      isDragMovable.value = true;
      startY.value = top.value;
      runOnJS(onDragStart)(taskId, slot);
    })
    .onUpdate((event) => {
      const h = ROW_HEIGHT.value;
      if (h <= 0) return;

      // Move the dragged row directly with the finger
      const newTop = startY.value + event.translationY;
      const clampedTop = Math.max(0, Math.min((tasksCount - 1) * h, newTop));
      top.value = clampedTop;

      // Determine which slot the center of the dragged row is over
      const centerY = clampedTop + h / 2;
      const targetSlot = Math.max(0, Math.min(tasksCount - 1, Math.floor(centerY / h)));

      // If we've moved to a new slot, swap positions
      if (targetSlot !== currentSlot.value) {
        positions.value = objectSwap(positions.value, currentSlot.value, targetSlot);
        currentSlot.value = targetSlot;
        runOnJS(onTargetUpdate)(targetSlot);
      }
    })
    .onEnd(() => {
      const h = ROW_HEIGHT.value;
      const finalSlot = currentSlot.value;

      // Animate the dragged row to snap into its final slot
      isDragMovable.value = false;
      top.value = withSpring(finalSlot * h, { damping: 100, stiffness: 300 }, (finished) => {
        if (finished) {
          draggedId.value = null;
          currentSlot.value = -1;
          runOnJS(onDragEnd)();
        }
      });
    });

  // --- Animated style ---
  const animatedStyle = useAnimatedStyle(() => {
    const isMe = draggedId.value === taskId;
    const isFloating = isMe && isDragMovable.value;
    return {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      top: top.value,
      zIndex: isMe ? 999 : 0,
      elevation: withTiming(isFloating ? 8 : 0, { duration: 200 }),
      shadowOpacity: withTiming(isFloating ? 0.15 : 0, { duration: 200 }),
      opacity: withTiming(isFloating ? 0.5 : 1, { duration: 200 }),
    };
  });

  // --- Insertion line + divider logic ---
  const myCurrentSlot = positions.value[taskId] ?? arrayIndex;
  const isDragging = draggingTaskId !== null;
  const showLineBefore =
    isDragging &&
    dropTargetSlot !== draggingFromSlot &&
    dropTargetSlot < draggingFromSlot &&
    myCurrentSlot === dropTargetSlot &&
    taskId !== draggingTaskId;
  const showLineAfter =
    isDragging &&
    dropTargetSlot !== draggingFromSlot &&
    dropTargetSlot > draggingFromSlot &&
    myCurrentSlot === dropTargetSlot &&
    taskId !== draggingTaskId;
  const showDivider = myCurrentSlot < tasksCount - 1 && !showLineAfter;

  return (
    <Animated.View
      style={[styles.row, animatedStyle]}
      onLayout={onLayout}
    >
      {showLineBefore && (
        <View style={[styles.insertionLine, { backgroundColor: insertionLineColor }]} />
      )}
      <SwipeableTaskRow
        task={task}
        competitors={competitors}
        templates={templates}
        onPointsChange={(competitorId, points) =>
          onPointsChange(task.id, competitorId, points)
        }
        onPress={onTaskPress ? () => onTaskPress(task) : undefined}
        onDelete={onTaskDelete ?? (() => {})}
        gripGesture={onReorder ? panGesture : undefined}
        isActive={draggingTaskId === taskId}
        showScoreNudge={showScoreNudge}
      />
      {showLineAfter && (
        <View style={[styles.insertionLine, { backgroundColor: insertionLineColor }]} />
      )}
      {showDivider && (
        <View style={[styles.divider, { backgroundColor: dividerColor }]} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  row: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  insertionLine: {
    height: 2,
    marginHorizontal: 16,
  },
});

export default TaskList;
