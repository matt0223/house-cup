import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/useTheme';
import { AppHeader, DayStrip, AddTaskButton, TaskAddedToast } from '../src/components/ui';
import { CollapsibleScoreboard, TaskList, AddTaskSheet, AddPrizeSheet, AddHousemateSheet, CompetitorSheet, TaskChanges, ChangeScope } from '../src/components/features';
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

/** Common household task suggestions for the empty state */
const TASK_SUGGESTIONS = [
  'Cook dinner',
  'Clean kitchen',
  'Laundry',
  'Exercise',
  'Groceries',
  'Take out trash',
];

/**
 * Challenge screen - Main tab showing scoreboard, day strip, and task list.
 */
export default function ChallengeScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isAddSheetVisible, setIsAddSheetVisible] = React.useState(false);
  const [isPrizeSheetVisible, setIsPrizeSheetVisible] = React.useState(false);
  const [isHousemateSheetVisible, setIsHousemateSheetVisible] = React.useState(false);
  const [selectedCompetitorId, setSelectedCompetitorId] = React.useState<string | null>(null);
  const [showToast, setShowToast] = React.useState(false);
  const [toastKey, setToastKey] = React.useState(0);
  const [editingTask, setEditingTask] = React.useState<TaskInstance | null>(null);
  const [swipeDeleteTask, setSwipeDeleteTask] = React.useState<TaskInstance | null>(null);
  // Track the weekStartDay used to create the current challenge
  const [challengeWeekStartDay, setChallengeWeekStartDay] = React.useState<number | null>(null);

  // First-time user: show suggestion chips until they create their first task
  const [hasEverCreatedTask, setHasEverCreatedTask] = useState(true); // Default true to avoid flash

  useEffect(() => {
    AsyncStorage.getItem('@housecup/hasEverCreatedTask').then((val) => {
      if (val !== 'true') setHasEverCreatedTask(false);
    });
  }, []);

  // Scroll position for collapsible scoreboard animation
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Firebase context for onboarding redirect and housemate invite
  const { isConfigured, isAuthLoading, userId, householdId, addHousemate, markInviteSent } = useFirebase();

  // Household store
  const household = useHouseholdStore((s) => s.household);
  const updateSettings = useHouseholdStore((s) => s.updateSettings);
  const updateCompetitor = useHouseholdStore((s) => s.updateCompetitor);

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
  const linkTaskToTemplate = useChallengeStore((s) => s.linkTaskToTemplate);
  const seedFromTemplates = useChallengeStore((s) => s.seedFromTemplates);
  const getScores = useChallengeStore((s) => s.getScores);

  // Recurring store
  const templates = useRecurringStore((s) => s.templates);
  const skipRecords = useRecurringStore((s) => s.skipRecords);
  const addTemplate = useRecurringStore((s) => s.addTemplate);
  const updateTemplate = useRecurringStore((s) => s.updateTemplate);
  const deleteTemplate = useRecurringStore((s) => s.deleteTemplate);

  // Note: Sample data loading is handled by FirebaseProvider
  // When Firebase is configured, data comes from Firestore
  // When offline, FirebaseProvider loads sample data

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

  // Redirect to onboarding if Firebase is configured but user is not authenticated
  // or has no household. Also handles stale cached householdId when auth is lost.
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
  const competitorB = competitors[1];
  const tasksForDay = tasks.filter((t) => t.dayKey === selectedDayKey);
  const scores = competitors.length > 0 ? getScores(competitors) : null;
  const scoreA = scores?.scores.find((s) => s.competitorId === competitorA?.id)?.total ?? 0;
  const scoreB = scores?.scores.find((s) => s.competitorId === competitorB?.id)?.total ?? 0;

  // Selected competitor (for competitor sheet)
  const selectedCompetitor = selectedCompetitorId
    ? competitors.find((c) => c.id === selectedCompetitorId) ?? null
    : null;
  const otherCompetitor = selectedCompetitor
    ? competitors.find((c) => c.id !== selectedCompetitor.id) ?? null
    : null;

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
    
    // Mark first task created
    if (!hasEverCreatedTask) {
      setHasEverCreatedTask(true);
      AsyncStorage.setItem('@housecup/hasEverCreatedTask', 'true');
    }

    // Show toast (increment key to force new instance if already visible)
    setToastKey((k) => k + 1);
    setShowToast(true);
  };

  // Handle tapping a suggestion chip in the empty state
  const handleSuggestionTap = (name: string) => {
    addTask(name, {});
    setHasEverCreatedTask(true);
    AsyncStorage.setItem('@housecup/hasEverCreatedTask', 'true');
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

  // Handle prize save from AddPrizeSheet
  const handlePrizeSave = (prize: string) => {
    updateSettings({ prize });
  };

  // Handle housemate save from AddHousemateSheet (add only)
  const handleHousemateSave = async (name: string, color: string) => {
    await addHousemate(name, color);
  };

  // Handle housemate invite (add then share)
  const handleHousemateInvite = async (name: string, color: string) => {
    const newCompetitor = await addHousemate(name, color);
    if (household?.joinCode) {
      const inviterName = household.competitors[0]?.name ?? 'Your housemate';
      const shared = await shareHouseholdInvite(inviterName, name, household.joinCode);
      if (shared) await markInviteSent(newCompetitor.id);
    }
  };

  // Handle share-invite (paper plane) — open native share for existing pending housemate
  const handleShareInvitePress = async () => {
    const compB = household?.competitors?.[1];
    if (!household?.joinCode || !compB) return;
    const inviterName = household.competitors[0]?.name ?? 'Your housemate';
    const shared = await shareHouseholdInvite(inviterName, compB.name, household.joinCode);
    if (shared) await markInviteSent(compB.id);
  };

  // Open competitor sheet when name/score is tapped on scoreboard
  const handleCompetitorPress = (competitorId: string) => {
    setSelectedCompetitorId(competitorId);
  };

  const handlePointsChange = (
    taskId: string,
    competitorId: string,
    points: number
  ) => {
    updateTaskPoints(taskId, competitorId, points);
  };

  // Loading state — only require household and at least one competitor.
  // competitorB is optional (solo user hasn't added a housemate yet).
  if (!household || !competitorA) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const dateRange = challenge
    ? formatDayKeyRange(challenge.startDayKey, challenge.endDayKey)
    : '';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <AppHeader
        title={dateRange || 'This Week'}
        rightActions={[
          { icon: 'trending-up-outline', onPress: () => router.push('/history') },
          { icon: 'settings-outline', onPress: () => router.push('/settings') },
        ]}
      />

      {/* Collapsible scoreboard: morphs from expanded to collapsed as user scrolls */}
      <View
        style={{
          marginTop: -16,
          zIndex: 10,
          elevation: 10,
        }}
      >
        <CollapsibleScoreboard
          scrollY={scrollY}
          competitorA={competitorA}
          competitorB={competitorB}
          scoreA={scoreA}
          scoreB={scoreB}
          prize={household?.prize ?? ''}
          onPrizePress={() => setIsPrizeSheetVisible(true)}
          onInvitePress={() => setIsHousemateSheetVisible(true)}
          onShareInvitePress={handleShareInvitePress}
          onCompetitorPress={handleCompetitorPress}
        />
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom, flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Day Strip */}
        <View style={{ marginTop: spacing.md + 4 }}>
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
        ) : !hasEverCreatedTask ? (
          <View style={styles.emptyState}>
            <Text
              style={[
                typography.headline,
                { color: colors.textPrimary, textAlign: 'center' },
              ]}
            >
              What did you get done today?
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              Tap a suggestion or press + to add your own
            </Text>
            <View style={[styles.chipGrid, { marginTop: spacing.lg }]}>
              {TASK_SUGGESTIONS.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={[
                    styles.suggestionChip,
                    {
                      borderColor: colors.primary + '55',
                      borderRadius: radius.pill,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleSuggestionTap(suggestion)}
                >
                  <Text style={[typography.callout, { color: colors.primary }]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <EmptyStateIllustration />
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
              ]}
            >
              Tap + Add task to get started
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

      {/* Add/Edit Prize Sheet */}
      <AddPrizeSheet
        isVisible={isPrizeSheetVisible}
        onClose={() => setIsPrizeSheetVisible(false)}
        onSave={handlePrizeSave}
        currentPrize={household?.prize ?? ''}
      />

      {/* Add Housemate Sheet */}
      <AddHousemateSheet
        isVisible={isHousemateSheetVisible}
        onClose={() => setIsHousemateSheetVisible(false)}
        onSave={handleHousemateSave}
        onInvite={handleHousemateInvite}
        competitorAColor={competitorA?.color}
      />

      {/* Competitor sheet (tap name/score on scoreboard) */}
      <CompetitorSheet
        isVisible={selectedCompetitorId !== null}
        onClose={() => setSelectedCompetitorId(null)}
        competitor={selectedCompetitor ?? competitorA}
        otherCompetitorColor={otherCompetitor?.color}
        onNameChange={(name) =>
          selectedCompetitor && updateCompetitor(selectedCompetitor.id, { name })
        }
        onColorChange={(color) =>
          selectedCompetitor && updateCompetitor(selectedCompetitor.id, { color })
        }
        onInvitePress={
          selectedCompetitor && !selectedCompetitor.userId
            ? handleShareInvitePress
            : undefined
        }
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

// De-emphasized empty state icon (not button-like; keeps focus on FAB)
function EmptyStateIllustration() {
  const { colors } = useTheme();
  return (
    <View style={styles.illustration}>
      <Ionicons
        name="clipboard-outline"
        size={48}
        color={colors.textSecondary}
        style={{ opacity: 0.35 }}
      />
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
    // paddingBottom is set dynamically via inline style (100 + bottom safe area)
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  suggestionChip: {
    borderWidth: 1.5,
  },
});
