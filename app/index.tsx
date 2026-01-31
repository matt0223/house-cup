import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/useTheme';
import { AppHeader, DayStrip, AddTaskButton, TaskAddedToast } from '../src/components/ui';
import { ScoreboardCard, TaskList, AddTaskSheet, TaskChanges, ChangeScope } from '../src/components/features';
import { ConfirmationModal } from '../src/components/ui';
import {
  useHouseholdStore,
  useChallengeStore,
  useRecurringStore,
} from '../src/store';
import { formatDayKeyRange, getTodayDayKey, getCurrentWeekWindow } from '../src/domain/services';
import { TaskInstance } from '../src/domain/models/TaskInstance';

/**
 * Challenge screen - Main tab showing scoreboard, day strip, and task list.
 */
export default function ChallengeScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAddSheetVisible, setIsAddSheetVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const [editingTask, setEditingTask] = useState<TaskInstance | null>(null);
  const [swipeDeleteTask, setSwipeDeleteTask] = useState<TaskInstance | null>(null);
  // Track the weekStartDay used to create the current challenge
  const [challengeWeekStartDay, setChallengeWeekStartDay] = useState<number | null>(null);

  // Household store
  const household = useHouseholdStore((s) => s.household);
  const loadHouseholdSample = useHouseholdStore((s) => s.loadSampleData);

  // Challenge store
  const challenge = useChallengeStore((s) => s.challenge);
  const tasks = useChallengeStore((s) => s.tasks);
  const selectedDayKey = useChallengeStore((s) => s.selectedDayKey);
  const initializeChallenge = useChallengeStore((s) => s.initializeChallenge);
  const setSelectedDay = useChallengeStore((s) => s.setSelectedDay);
  const addTask = useChallengeStore((s) => s.addTask);
  const updateTaskPoints = useChallengeStore((s) => s.updateTaskPoints);
  const updateTaskName = useChallengeStore((s) => s.updateTaskName);
  const updateTask = useChallengeStore((s) => s.updateTask);
  const deleteTask = useChallengeStore((s) => s.deleteTask);
  const deleteTasksForTemplateFromDay = useChallengeStore((s) => s.deleteTasksForTemplateFromDay);
  const linkTaskToTemplate = useChallengeStore((s) => s.linkTaskToTemplate);
  const seedFromTemplates = useChallengeStore((s) => s.seedFromTemplates);
  const getScores = useChallengeStore((s) => s.getScores);

  // Recurring store
  const templates = useRecurringStore((s) => s.templates);
  const skipRecords = useRecurringStore((s) => s.skipRecords);
  const loadRecurringSample = useRecurringStore((s) => s.loadSampleData);
  const addTemplate = useRecurringStore((s) => s.addTemplate);
  const updateTemplate = useRecurringStore((s) => s.updateTemplate);
  const deleteTemplate = useRecurringStore((s) => s.deleteTemplate);

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      // Load sample data for development
      loadHouseholdSample();
      loadRecurringSample();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Initialize challenge when household is ready, or reinitialize when weekStartDay changes
  useEffect(() => {
    if (household && templates.length > 0) {
      // Initialize if no challenge, or reinitialize if weekStartDay changed
      const needsInit = !challenge || challengeWeekStartDay !== household.weekStartDay;
      if (needsInit) {
        initializeChallenge(
          household.timezone,
          household.weekStartDay,
          templates,
          skipRecords
        );
        setChallengeWeekStartDay(household.weekStartDay);
      }
    }
  }, [household, challenge, templates, challengeWeekStartDay]);

  // Auto-seed tasks when templates change (idempotent - won't create duplicates)
  useEffect(() => {
    if (challenge && templates.length > 0) {
      seedFromTemplates(templates);
    }
  }, [templates, challenge]);

  // Derived state
  const competitors = household?.competitors ?? [];
  const competitorA = competitors[0];
  const competitorB = competitors[1];
  const tasksForDay = tasks.filter((t) => t.dayKey === selectedDayKey);
  const scores = competitors.length > 0 ? getScores(competitors) : null;
  const scoreA = scores?.scores.find((s) => s.competitorId === competitorA?.id)?.total ?? 0;
  const scoreB = scores?.scores.find((s) => s.competitorId === competitorB?.id)?.total ?? 0;

  // Get week day keys using the canonical week window service
  const weekDayKeys = household
    ? getCurrentWeekWindow(household.timezone, household.weekStartDay).dayKeys
    : [];

  // Use household timezone to determine "today"
  const timezone = household?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayKey = getTodayDayKey(timezone);

  // Get repeat days for the task being edited (from its template)
  const editingTaskRepeatDays = editingTask?.templateId
    ? templates.find((t) => t.id === editingTask.templateId)?.repeatDays ?? []
    : [];

  // Handle adding a task from the sheet
  const handleAddTaskSubmit = (
    name: string,
    points: Record<string, number>,
    repeatDays: number[] | null
  ) => {
    // Create the task for today
    const taskId = addTask(name, points);
    
    // If repeat days are set, create template and link task to it
    if (repeatDays && repeatDays.length > 0 && taskId) {
      const template = addTemplate(name, repeatDays);
      linkTaskToTemplate(taskId, template.id);
    }
    
    // Show toast (increment key to force new instance if already visible)
    setToastKey((k) => k + 1);
    setShowToast(true);
  };

  // Handle updating a task from the sheet (edit mode)
  const handleUpdateTask = (
    taskId: string,
    changes: TaskChanges,
    scope: ChangeScope
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isRecurring = task.templateId !== null;

    // Handle name change
    if (changes.name !== undefined && changes.name !== task.name) {
      if (isRecurring && task.templateId) {
        if (scope === 'future') {
          // Update template name + all linked instances
          updateTaskName(taskId, changes.name, true, templates, (templateId, newName) => {
            updateTemplate(templateId, { name: newName });
          });
        } else {
          // Detach and update just this instance
          updateTaskName(taskId, changes.name, false, templates);
        }
      } else {
        // One-off task - just update
        updateTask(taskId, { name: changes.name });
      }
    }

    // Handle points change (always applies to instance)
    if (changes.points !== undefined) {
      updateTask(taskId, { points: changes.points });
    }

    // Handle schedule change
    if (changes.repeatDays !== undefined && isRecurring && task.templateId) {
      if (changes.repeatDays.length === 0) {
        // Converting recurring to one-off: delete template and detach task
        deleteTemplate(task.templateId);
        updateTask(taskId, { templateId: null });
      } else {
        // Just update the template's days
        updateTemplate(task.templateId, { repeatDays: changes.repeatDays });
      }
    }

    // Handle converting one-off to recurring
    if (
      changes.repeatDays !== undefined &&
      changes.repeatDays.length > 0 &&
      !isRecurring
    ) {
      const newTemplate = addTemplate(task.name, changes.repeatDays);
      linkTaskToTemplate(taskId, newTemplate.id);
    }

    // Show toast
    setToastKey((k) => k + 1);
    setShowToast(true);

    // Close sheet
    setEditingTask(null);
    setIsAddSheetVisible(false);
  };

  // Handle deleting a task from the sheet (edit mode)
  const handleDeleteTask = (taskId: string, scope: ChangeScope) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (scope === 'future' && task.templateId) {
      // Delete template and all remaining instances
      deleteTasksForTemplateFromDay(task.templateId, task.dayKey);
      deleteTemplate(task.templateId);
    } else {
      // Delete just this instance
      deleteTask(taskId);
    }

    // Close sheet
    setEditingTask(null);
    setIsAddSheetVisible(false);
  };

  // Handle swipe delete from task list
  const handleSwipeDelete = (task: TaskInstance) => {
    const isRecurring = Boolean(task.templateId);
    if (isRecurring) {
      // Show confirmation modal for recurring tasks
      setSwipeDeleteTask(task);
    } else {
      // Delete one-off task directly
      deleteTask(task.id);
    }
  };

  // Handle swipe delete confirmation selection
  const handleSwipeDeleteConfirm = (optionId: string) => {
    if (!swipeDeleteTask) return;

    if (optionId === 'today') {
      // Delete just this instance
      deleteTask(swipeDeleteTask.id);
    } else if (optionId === 'future' && swipeDeleteTask.templateId) {
      // Delete template and all remaining instances
      deleteTasksForTemplateFromDay(swipeDeleteTask.templateId, swipeDeleteTask.dayKey);
      deleteTemplate(swipeDeleteTask.templateId);
    }

    setSwipeDeleteTask(null);
  };

  // Handle task press - open edit sheet
  const handleTaskPress = (task: TaskInstance) => {
    setEditingTask(task);
    setIsAddSheetVisible(true);
  };

  // Handle sheet close
  const handleSheetClose = () => {
    setIsAddSheetVisible(false);
    setEditingTask(null);
  };

  const handleToastHidden = () => {
    setShowToast(false);
  };

  const handlePointsChange = (
    taskId: string,
    competitorId: string,
    points: number
  ) => {
    updateTaskPoints(taskId, competitorId, points);
  };

  // Loading state
  if (!household || !competitorA || !competitorB) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loading}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateRange = challenge
    ? formatDayKeyRange(challenge.startDayKey, challenge.endDayKey)
    : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <AppHeader
        title="House Cup"
        rightActions={[
          { icon: 'trending-up-outline', onPress: () => router.push('/history') },
          { icon: 'settings-outline', onPress: () => router.push('/settings') },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scoreboard Card */}
        <View style={{ paddingHorizontal: spacing.sm }}>
          <ScoreboardCard
            competitorA={competitorA}
            competitorB={competitorB}
            scoreA={scoreA}
            scoreB={scoreB}
            dateRange={dateRange}
            prize={household?.prize || 'Set a prize!'}
          />
        </View>

        {/* Day Strip */}
        <View style={{ marginTop: spacing.md }}>
          <DayStrip
            dayKeys={weekDayKeys}
            selectedDayKey={selectedDayKey}
            todayDayKey={todayKey}
            onSelectDay={setSelectedDay}
          />
        </View>

        {/* Content Area */}
        {tasksForDay.length > 0 ? (
          <View style={{ marginTop: spacing.md, paddingHorizontal: spacing.sm }}>
            <TaskList
              tasks={tasksForDay}
              competitors={competitors}
              onPointsChange={handlePointsChange}
              onTaskPress={handleTaskPress}
              onTaskDelete={handleSwipeDelete}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <EmptyStateIllustration />
            <Text
              style={[
                typography.headline,
                { color: colors.textPrimary, marginTop: spacing.lg },
              ]}
            >
              Start by adding your first task
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              Tap the + button to get started
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Task Button */}
      <AddTaskButton onPress={() => setIsAddSheetVisible(true)} />

      {/* Add/Edit Task Sheet */}
      <AddTaskSheet
        isVisible={isAddSheetVisible}
        onClose={handleSheetClose}
        onSubmit={handleAddTaskSubmit}
        editingTask={editingTask}
        initialRepeatDays={editingTaskRepeatDays}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        competitors={competitors}
        weekStartDay={household?.weekStartDay ?? 0}
      />

      {/* Task Added Toast */}
      <TaskAddedToast
        key={toastKey}
        visible={showToast}
        onHidden={handleToastHidden}
      />

      {/* Swipe Delete Confirmation Modal */}
      <ConfirmationModal
        visible={swipeDeleteTask !== null}
        title="Delete this task?"
        options={[
          { id: 'today', label: 'Today only' },
          { id: 'future', label: 'Today and future instances', isDestructive: true },
        ]}
        onSelect={handleSwipeDeleteConfirm}
        onCancel={() => setSwipeDeleteTask(null)}
      />
    </SafeAreaView>
  );
}

// Simple placeholder illustration
function EmptyStateIllustration() {
  const { colors } = useTheme();
  return (
    <View style={[styles.illustration, { backgroundColor: colors.primary + '20' }]}>
      <Ionicons name="clipboard-outline" size={64} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  illustration: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
