import React, { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/useTheme';
import { AppHeader, DayStrip, AddTaskButton, TaskAddedToast } from '../src/components/ui';
import { CollapsibleScoreboard, TaskList, AddTaskSheet, TaskChanges, ChangeScope } from '../src/components/features';
import { ConfirmationModal } from '../src/components/ui';
import {
  useHouseholdStore,
  useChallengeStore,
  useRecurringStore,
} from '../src/store';
import { useFirebase } from '../src/providers/FirebaseProvider';
import { formatDayKeyRange, getTodayDayKey, getCurrentWeekWindow } from '../src/domain/services';
import { TaskInstance } from '../src/domain/models/TaskInstance';
import { shareHouseholdInvite } from '../src/utils/shareInvite';
import * as taskService from '../src/services/firebase/taskService';

/**
 * Challenge screen - Main tab showing scoreboard, day strip, and task list.
 */
export default function ChallengeScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const [isAddSheetVisible, setIsAddSheetVisible] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [toastKey, setToastKey] = React.useState(0);
  const [editingTask, setEditingTask] = React.useState<TaskInstance | null>(null);
  const [swipeDeleteTask, setSwipeDeleteTask] = React.useState<TaskInstance | null>(null);
  // Track the weekStartDay used to create the current challenge
  const [challengeWeekStartDay, setChallengeWeekStartDay] = React.useState<number | null>(null);

  // Animated value for scroll-linked scoreboard collapse
  const scrollY = useRef(new Animated.Value(0)).current;

  // Only re-seed when the set of template IDs actually changes (avoids duplicate seed when
  // Firestore sync fires with same templates after our add, and task subscription had already overwrote store)
  const lastSeededTemplateIdsRef = useRef<string | null>(null);

  // Firebase context for onboarding redirect
  const { isConfigured, isAuthLoading, householdId, userId } = useFirebase();

  // Household store
  const household = useHouseholdStore((s) => s.household);

  // Challenge store - ALL hooks must be called before any conditional returns
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
  const deleteRecurringTaskKeepingPoints = useChallengeStore((s) => s.deleteRecurringTaskKeepingPoints);
  const linkTaskToTemplate = useChallengeStore((s) => s.linkTaskToTemplate);
  const seedFromTemplates = useChallengeStore((s) => s.seedFromTemplates);
  const getScores = useChallengeStore((s) => s.getScores);
  const updateChallengeBoundaries = useChallengeStore((s) => s.updateChallengeBoundaries);
  const syncEnabled = useChallengeStore((s) => s.syncEnabled);
  const householdIdFromStore = useChallengeStore((s) => s.householdId);
  const tasksLoadedForChallengeId = useChallengeStore((s) => s.tasksLoadedForChallengeId);

  // Recurring store
  const templates = useRecurringStore((s) => s.templates);
  const skipRecords = useRecurringStore((s) => s.skipRecords);
  const addTemplate = useRecurringStore((s) => s.addTemplate);
  const updateTemplate = useRecurringStore((s) => s.updateTemplate);
  const deleteTemplate = useRecurringStore((s) => s.deleteTemplate);

  // Note: Sample data loading is handled by FirebaseProvider
  // When Firebase is configured, data comes from Firestore
  // When offline, FirebaseProvider loads sample data

  // Initialize challenge when household is ready, or update boundaries when weekStartDay changes
  useEffect(() => {
    if (household && templates.length > 0) {
      if (!challenge) {
        // No challenge - initialize fresh
        initializeChallenge(
          household.timezone,
          household.weekStartDay,
          templates,
          skipRecords
        );
        setChallengeWeekStartDay(household.weekStartDay);
      } else if (challengeWeekStartDay !== household.weekStartDay) {
        // Challenge exists but week setting changed - update boundaries only (preserves tasks/points)
        updateChallengeBoundaries(household.timezone, household.weekStartDay);
        setChallengeWeekStartDay(household.weekStartDay);
      }
    }
  }, [household, challenge, templates, challengeWeekStartDay]);

  // Auto-seed tasks when templates change. When sync is enabled, wait for initial
  // tasks load from Firestore so we don't seed before existing tasks arrive (which would create duplicates on reload).
  // Only run when the set of template IDs actually changed (prevents second run when Firestore sync
  // sends same templates after our add, which would create duplicates on other days).
  useEffect(() => {
    if (!challenge || templates.length === 0) return;
    const canSeed = !syncEnabled || tasksLoadedForChallengeId === challenge.id;
    if (!canSeed) return;

    const templateIdsKey = [...templates].map((t) => t.id).sort().join(',');
    if (lastSeededTemplateIdsRef.current === templateIdsKey) return;
    lastSeededTemplateIdsRef.current = templateIdsKey;

    seedFromTemplates(templates);
  }, [templates, challenge, syncEnabled, tasksLoadedForChallengeId]);

  // Handle invite button press on ScoreboardCard
  // Note: Must be defined before conditional returns to follow Rules of Hooks
  const handleInvitePress = useCallback(() => {
    if (!household || !household.competitors[0]) return;
    
    // Get pending competitor name (competitorB without userId)
    const pendingCompetitor = household.competitors.find(c => !c.userId);
    
    shareHouseholdInvite(
      household.competitors[0].name,
      pendingCompetitor?.name,
      household.joinCode || ''
    );
  }, [household]);

  // Redirect to onboarding if no household or no user (can't load household without auth)
  if (isConfigured && !isAuthLoading && (!householdId || !userId)) {
    return <Redirect href="/onboarding" />;
  }

  // Show loading while auth is initializing
  if (isConfigured && isAuthLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Derived state
  const competitors = household?.competitors ?? [];
  const competitorA = competitors[0];
  const competitorB = competitors[1]; // May be undefined if housemate hasn't joined
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
    if (repeatDays && repeatDays.length > 0) {
      // Recurring task: create template, then add today's instance with points.
      // seedFromTemplates() will create instances for other days (today already has one).
      const newTemplate = addTemplate(name, repeatDays);
      addTask(name, points, newTemplate.id);
    } else {
      // One-off task: create task directly
      addTask(name, points, null);
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
          // Detach and update just this instance (store persists task + skip record)
          updateTaskName(taskId, changes.name, false, templates);
        }
      } else {
        // One-off task - just update and persist
        updateTask(taskId, { name: changes.name });
        if (syncEnabled && householdIdFromStore) {
          taskService.updateTask(householdIdFromStore, taskId, { name: changes.name }).catch((err) => {
            console.error('Failed to sync task name:', err);
          });
        }
      }
    }

    // Handle points change (always applies to instance)
    if (changes.points !== undefined) {
      updateTask(taskId, { points: changes.points });
      if (syncEnabled && householdIdFromStore) {
        taskService.updateTask(householdIdFromStore, taskId, { points: changes.points }).catch((err) => {
          console.error('Failed to sync task points:', err);
        });
      }
    }

    // Handle schedule change
    if (changes.repeatDays !== undefined && isRecurring && task.templateId) {
      if (changes.repeatDays.length === 0) {
        // Converting recurring to one-off: delete template and detach task
        deleteTemplate(task.templateId);
        updateTask(taskId, { templateId: null });
        if (syncEnabled && householdIdFromStore) {
          taskService.updateTask(householdIdFromStore, taskId, { templateId: null }).catch((err) => {
            console.error('Failed to sync task detach:', err);
          });
        }
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
      // Always delete this task; this week others without points; next week onward all; then remove template
      deleteRecurringTaskKeepingPoints(task.templateId, taskId);
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
      // Always delete this task; this week others without points; next week onward all; then remove template
      deleteRecurringTaskKeepingPoints(swipeDeleteTask.templateId, swipeDeleteTask.id);
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

  // Loading state - only require household and competitorA (competitorB may not have joined yet)
  if (!household || !competitorA) {
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
        title={dateRange || 'This Week'}
        rightActions={[
          { icon: 'trending-up-outline', onPress: () => router.push('/history') },
          { icon: 'settings-outline', onPress: () => router.push('/settings') },
        ]}
      />

      {/* Collapsible Scoreboard - Animates based on scroll */}
      <CollapsibleScoreboard
        scrollY={scrollY}
        competitorA={competitorA}
        competitorB={competitorB}
        scoreA={scoreA}
        scoreB={scoreB}
        prize={household?.prize || 'Set a prize!'}
        onInvitePress={handleInvitePress}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Day Strip */}
        <View style={{ marginTop: spacing.xxxs }}>
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
              templates={templates}
              onPointsChange={handlePointsChange}
              onTaskPress={handleTaskPress}
              onTaskDelete={handleSwipeDelete}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text
              style={[
                typography.headline,
                { color: colors.textPrimary },
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
      </Animated.ScrollView>

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
          { id: 'future', label: 'This and all without points', isDestructive: true },
        ]}
        onSelect={handleSwipeDeleteConfirm}
        onCancel={() => setSwipeDeleteTask(null)}
      />
    </SafeAreaView>
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
    flexGrow: 1,
    paddingBottom: 225,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
});
