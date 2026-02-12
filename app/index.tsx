import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
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

// NOTE: Task suggestion chips saved for future use.
// const TASK_SUGGESTIONS = ['Cook dinner','Clean kitchen','Laundry','Exercise','Groceries','Take out trash'];

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

  // Scroll position for collapsible scoreboard animation
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Header height for scroll-based collapse (paddingVertical 12*2 + title ~24 = ~48)
  const HEADER_HEIGHT = 48;
  const COLLAPSE_THRESHOLD = 110; // matches MorphingScoreboard threshold

  // Animate header container height from full to 0 as user scrolls
  const headerHeight = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD * 0.6],
    outputRange: [HEADER_HEIGHT, 0],
    extrapolate: 'clamp',
  });

  // Fade header content out quickly so icons don't visually clip
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD * 0.25],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Reduce gap between prize circle and day strip when collapsed
  const dayStripMarginTop = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD],
    outputRange: [16, 8], // 16 expanded, 8 collapsed (8px reduction when collapsed)
    extrapolate: 'clamp',
  });

  // Firebase context for onboarding redirect and housemate invite
  const { isConfigured, isAuthLoading, userId, householdId, addHousemate, markInviteSent } = useFirebase();

  // Household store
  const household = useHouseholdStore((s) => s.household);
  const updateSettings = useHouseholdStore((s) => s.updateSettings);
  const updateCompetitor = useHouseholdStore((s) => s.updateCompetitor);

  // Challenge store - ALL hooks must be called before any conditional returns
  const challenge = useChallengeStore((s) => s.challenge);
  const tasks = useChallengeStore((s) => s.tasks);
  const tasksLoadedForChallengeId = useChallengeStore((s) => s.tasksLoadedForChallengeId);
  const selectedDayKey = useChallengeStore((s) => s.selectedDayKey);
  const initializeChallenge = useChallengeStore((s) => s.initializeChallenge);
  const updateChallengeBoundaries = useChallengeStore((s) => s.updateChallengeBoundaries);
  const setSelectedDay = useChallengeStore((s) => s.setSelectedDay);
  const addTask = useChallengeStore((s) => s.addTask);
  const updateTaskPoints = useChallengeStore((s) => s.updateTaskPoints);
  const updateTaskName = useChallengeStore((s) => s.updateTaskName);
  const updateTask = useChallengeStore((s) => s.updateTask);
  const deleteTask = useChallengeStore((s) => s.deleteTask);
  const deleteTasksForTemplateFromDay = useChallengeStore((s) => s.deleteTasksForTemplateFromDay);
  const linkTaskToTemplate = useChallengeStore((s) => s.linkTaskToTemplate);
  const seedFromTemplates = useChallengeStore((s) => s.seedFromTemplates);
  const reorderTasks = useChallengeStore((s) => s.reorderTasks);
  const getScores = useChallengeStore((s) => s.getScores);

  // Recurring store
  const templates = useRecurringStore((s) => s.templates);
  const skipRecords = useRecurringStore((s) => s.skipRecords);
  const addTemplate = useRecurringStore((s) => s.addTemplate);
  const updateTemplate = useRecurringStore((s) => s.updateTemplate);
  const deleteTemplate = useRecurringStore((s) => s.deleteTemplate);

  // Initialize challenge when household is ready.
  // When Firebase is configured, Firestore provides the challenge — NEVER overwrite it
  // with a local one. Only use initializeChallenge for offline/dev mode.
  // For weekStartDay changes (settings), update boundaries on the existing challenge.
  useEffect(() => {
    if (!household || templates.length === 0) return;

    if (isConfigured) {
      // Firestore provides the challenge. Only handle weekStartDay boundary changes.
      if (challenge && challengeWeekStartDay !== null && challengeWeekStartDay !== household.weekStartDay) {
        updateChallengeBoundaries(household.timezone, household.weekStartDay);
        setChallengeWeekStartDay(household.weekStartDay);
      } else if (challenge && challengeWeekStartDay === null) {
        // First time seeing the Firestore challenge this session — record weekStartDay
        setChallengeWeekStartDay(household.weekStartDay);
      }
      return;
    }

    // Offline mode: initialize challenge locally
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
  }, [household, challenge, templates, challengeWeekStartDay, isConfigured]);

  // Auto-seed tasks when templates change (idempotent - won't create duplicates).
  // Wait for Firestore to deliver existing tasks before seeding to avoid duplicates.
  useEffect(() => {
    if (challenge && templates.length > 0 && tasksLoadedForChallengeId === challenge.id) {
      seedFromTemplates(templates);
    }
  }, [templates, challenge, tasksLoadedForChallengeId]);

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
  const tasksForDay = tasks
    .filter((t) => t.dayKey === selectedDayKey)
    .sort((a, b) => {
      const aSort = a.sortOrder ?? Infinity;
      const bSort = b.sortOrder ?? Infinity;
      if (aSort !== bSort) return aSort - bSort;
      // Fallback: oldest first for tasks without sortOrder
      return a.createdAt.localeCompare(b.createdAt);
    });
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
    if (repeatDays && repeatDays.length > 0) {
      // Create template first, then task with templateId — avoids race where
      // seeding sees the task with templateId: null and creates a duplicate.
      const template = addTemplate(name, repeatDays);
      addTask(name, points, template.id);
    } else {
      addTask(name, points);
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
      {/* Header — clips and collapses as user scrolls */}
      <Animated.View style={{ height: headerHeight, overflow: 'hidden', opacity: headerOpacity }}>
        <AppHeader
          title={dateRange || 'This Week'}
          rightActions={[
            { icon: 'trending-up-outline', onPress: () => router.push('/history') },
            { icon: 'settings-outline', onPress: () => router.push('/settings') },
          ]}
        />
      </Animated.View>

      {/* Collapsible scoreboard: morphs from expanded to collapsed as user scrolls */}
      <View
        style={{
          marginTop: 0,
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

      {/* Day Strip — always visible, outside ScrollView */}
      <Animated.View style={{ marginTop: dayStripMarginTop, paddingBottom: 16 }}>
        <DayStrip
          dayKeys={weekDayKeys}
          selectedDayKey={selectedDayKey}
          todayDayKey={todayKey}
          onSelectDay={setSelectedDay}
        />
      </Animated.View>

      <View style={{
        flex: 1,
        overflow: 'hidden',
        borderTopLeftRadius: radius.large,
        borderTopRightRadius: radius.large,
        marginHorizontal: spacing.sm,
      }}>
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
        {/* Content Area */}
        {tasksForDay.length > 0 ? (
          <View>
            <TaskList
              tasks={tasksForDay}
              competitors={competitors}
              templates={templates}
              onPointsChange={handlePointsChange}
              onTaskPress={handleTaskPress}
              onTaskDelete={handleSwipeDelete}
              onReorder={reorderTasks}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text
              style={[
                styles.emptyText,
                { color: colors.textSecondary },
              ]}
            >
              What needs doing today?
            </Text>
            <Image
              source={require('../assets/images/arrow.png')}
              style={styles.arrowImage}
              resizeMode="contain"
            />
          </View>
        )}
      </Animated.ScrollView>
      </View>

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
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },
  emptyText: {
    fontFamily: 'Caveat',
    fontSize: 34,
    fontWeight: '400',
    lineHeight: 40,
    textAlign: 'right',
    paddingRight: 75,
    marginBottom: 0,
    transform: [{ rotate: '-1deg' }],
  },
  arrowImage: {
    width: 85,
    height: 100,
    alignSelf: 'flex-end',
    marginRight: 77,
  },
});
