import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Image, ActivityIndicator, Animated, Easing } from 'react-native';
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
import {
  trackScreenViewed,
  trackTaskCreated,
  trackTaskNameChanged,
  trackTaskDeleted,
  trackTaskScored,
  trackTaskReordered,
  trackTaskScheduleChanged,
  trackDaySelected,
  trackPrizeSet,
  trackPrizeCleared,
  trackHousemateAdded,
  trackInviteShared,
  trackChallengeLoaded,
  trackScoreboardTapped,
  trackCompetitorNameChanged,
  trackCompetitorColorChanged,
  incrementUserProperty,
} from '../src/services/analytics';
import { PRIZE_SUGGESTIONS } from '../src/components/features/AddPrizeSheet';

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
  const deleteRecurringTaskKeepingPoints = useChallengeStore((s) => s.deleteRecurringTaskKeepingPoints);
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

  // Track home screen view on mount
  useEffect(() => {
    trackScreenViewed({ 'screen name': 'home' });
  }, []);

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

  // Fade-in + slide-up animation for task list (avoids flash of empty state on load)
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = contentFade.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0], // starts 10px below, slides up to final position
  });
  const tasksReady = tasksLoadedForChallengeId === challenge?.id;

  useEffect(() => {
    if (tasksReady) {
      // Smooth fade in when tasks finish loading
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      // Reset instantly when switching challenges / loading
      contentFade.setValue(0);
    }
  }, [tasksReady]);

  // Track Challenge Loaded once tasks have been delivered from Firestore
  const challengeTrackedRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!tasksReady || !challenge || !household || challengeTrackedRef.current === challenge.id) return;
    challengeTrackedRef.current = challenge.id;

    const result = getScores(household.competitors);
    const todayKeyNow = getTodayDayKey(household.timezone);
    const todayIdx = weekDayKeys.indexOf(todayKeyNow);
    const daysRemaining = todayIdx >= 0 ? weekDayKeys.length - 1 - todayIdx : 0;
    const hasHousemate = household.competitors.filter(c => c.userId).length >= 2;
    const scoreA = result.scores.find(s => s.competitorId === competitorA?.id)?.total ?? 0;
    const scoreB = result.scores.find(s => s.competitorId === competitorB?.id)?.total ?? 0;

    trackChallengeLoaded({
      'competition id': challenge.id,
      'household id': household.id,
      'task count': tasks.length,
      'score a': scoreA,
      'score b': scoreB,
      'days remaining': daysRemaining,
      'has prize': !!household.prize && household.prize.length > 0,
      'has housemate': hasHousemate,
    });
  }, [tasksReady, challenge?.id]);

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
    let templateId: string | null = null;
    if (repeatDays && repeatDays.length > 0) {
      // Create template first, then task with templateId — avoids race where
      // seeding sees the task with templateId: null and creates a duplicate.
      const template = addTemplate(name, repeatDays);
      templateId = template.id;
      addTask(name, points, template.id);
    } else {
      addTask(name, points);
    }

    const hasInitialPoints = Object.values(points).some((p) => p > 0);
    const dayTasks = tasks.filter((t) => t.dayKey === selectedDayKey);
    const todayKey = household ? getTodayDayKey(household.timezone) : selectedDayKey;

    trackTaskCreated({
      'task id': `${Date.now()}`,
      'competition id': challenge?.id ?? '',
      'template id': templateId,
      'task name length': name.length,
      'is recurring': !!templateId,
      'repeat days count': repeatDays?.length ?? 0,
      'has initial points': hasInitialPoints,
      'day key': selectedDayKey,
      'is today': selectedDayKey === todayKey,
      'task count for day': dayTasks.length + 1,
      source: 'add task sheet',
    });

    incrementUserProperty('total tasks created');
    if (templateId) {
      incrementUserProperty('total templates created');
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
      trackTaskNameChanged({
        'task id': taskId,
        'template id': task.templateId ?? null,
        'old name length': task.name.length,
        'new name length': changes.name.length,
        scope,
        'is recurring': isRecurring,
        source: 'edit task sheet',
      });

      if (isRecurring && task.templateId) {
        if (scope === 'future') {
          updateTaskName(taskId, changes.name, true, templates, (templateId, newName) => {
            updateTemplate(templateId, { name: newName });
          });
        } else {
          updateTaskName(taskId, changes.name, false, templates);
        }
      } else {
        updateTask(taskId, { name: changes.name });
      }
    }

    // Handle points change (always applies to instance) - track as Task Scored from edit sheet
    if (changes.points !== undefined) {
      for (const [competitorId, newPoints] of Object.entries(changes.points)) {
        const previousPoints = task.points?.[competitorId] ?? 0;
        if (newPoints !== previousPoints) {
          const isSelf = competitorId === competitorA?.id;
          const todayKeyNow = household ? getTodayDayKey(household.timezone) : selectedDayKey;
          trackTaskScored({
            'task id': taskId,
            'competition id': challenge?.id ?? '',
            'competitor id': competitorId,
            'points value': newPoints,
            'previous points value': previousPoints,
            'is self': isSelf,
            'is recurring': isRecurring,
            'day key': task.dayKey ?? selectedDayKey,
            'is today': (task.dayKey ?? selectedDayKey) === todayKeyNow,
            source: 'edit task sheet',
          });
        }
      }
      updateTask(taskId, { points: changes.points });
    }

    // Handle schedule change
    if (changes.repeatDays !== undefined) {
      const oldRepeatDaysCount = isRecurring
        ? (templates.find(t => t.id === task.templateId)?.repeatDays?.length ?? 0)
        : 0;
      const newRepeatDaysCount = changes.repeatDays.length;

      let direction = 'unchanged';
      if (newRepeatDaysCount > oldRepeatDaysCount) direction = 'added days';
      else if (newRepeatDaysCount < oldRepeatDaysCount) direction = 'removed days';
      else if (newRepeatDaysCount === oldRepeatDaysCount && newRepeatDaysCount > 0) direction = 'shifted days';

      if (isRecurring && task.templateId) {
        if (changes.repeatDays.length === 0) {
          direction = 'converted to one off';
          trackTaskScheduleChanged({
            'task id': taskId,
            'template id': task.templateId,
            'old repeat days count': oldRepeatDaysCount,
            'new repeat days count': 0,
            direction,
            'is recurring': true,
          });
          deleteTemplate(task.templateId);
          updateTask(taskId, { templateId: null });
        } else {
          trackTaskScheduleChanged({
            'task id': taskId,
            'template id': task.templateId,
            'old repeat days count': oldRepeatDaysCount,
            'new repeat days count': newRepeatDaysCount,
            direction,
            'is recurring': true,
          });
          updateTemplate(task.templateId, { repeatDays: changes.repeatDays });
        }
      }

      // Handle converting one-off to recurring
      if (changes.repeatDays.length > 0 && !isRecurring) {
        const newTemplate = addTemplate(task.name, changes.repeatDays);
        linkTaskToTemplate(taskId, newTemplate.id);
        trackTaskScheduleChanged({
          'task id': taskId,
          'template id': newTemplate.id,
          'old repeat days count': 0,
          'new repeat days count': newRepeatDaysCount,
          direction: 'converted to recurring',
          'is recurring': false,
        });
        incrementUserProperty('total templates created');
      }
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

    const hadPoints = Object.values(task.points ?? {}).some((p) => p > 0);

    trackTaskDeleted({
      'task id': taskId,
      'template id': task.templateId ?? null,
      'competition id': challenge?.id ?? '',
      method: 'edit sheet',
      scope,
      'is recurring': !!task.templateId,
      'had points': hadPoints,
    });

    if (scope === 'future' && task.templateId) {
      // Delete this instance + others without points this week; keep scored ones as one-offs
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
      const hadPoints = Object.values(task.points ?? {}).some((p) => p > 0);
      trackTaskDeleted({
        'task id': task.id,
        'template id': task.templateId ?? null,
        'competition id': challenge?.id ?? '',
        method: 'swipe',
        scope: 'this day only',
        'is recurring': false,
        'had points': hadPoints,
      });
      deleteTask(task.id);
    }
  };

  // Handle swipe delete confirmation selection
  const handleSwipeDeleteConfirm = (optionId: string) => {
    if (!swipeDeleteTask) return;

    const hadPoints = Object.values(swipeDeleteTask.points ?? {}).some((p) => p > 0);
    const scope = optionId === 'today' ? 'this day only' : 'future';

    trackTaskDeleted({
      'task id': swipeDeleteTask.id,
      'template id': swipeDeleteTask.templateId ?? null,
      'competition id': challenge?.id ?? '',
      method: 'swipe',
      scope,
      'is recurring': !!swipeDeleteTask.templateId,
      'had points': hadPoints,
    });

    if (optionId === 'today') {
      // Delete just this instance
      deleteTask(swipeDeleteTask.id);
    } else if (optionId === 'future' && swipeDeleteTask.templateId) {
      // Delete this instance + others without points this week; keep scored ones as one-offs
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

  // Handle prize save from AddPrizeSheet
  const handlePrizeSave = (prize: string) => {
    const currentPrize = household?.prize ?? '';
    const oldPrizeLength = currentPrize.length;
    const isFirstPrize = oldPrizeLength === 0;
    const isSuggested = PRIZE_SUGGESTIONS.includes(prize);

    if (prize.length > 0) {
      trackPrizeSet({
        'household id': householdId ?? '',
        'competition id': challenge?.id ?? '',
        'prize length': prize.length,
        'old prize length': oldPrizeLength,
        'is first prize': isFirstPrize,
        'is suggested': isSuggested,
        source: 'prize sheet',
      });
    } else {
      trackPrizeCleared({
        'household id': householdId ?? '',
        'old prize length': oldPrizeLength,
        source: 'prize sheet',
      });
    }

    updateSettings({ prize });
  };

  // Handle housemate save from AddHousemateSheet (add only)
  const handleHousemateSave = async (name: string, color: string) => {
    const newComp = await addHousemate(name, color);
    trackHousemateAdded({
      'household id': householdId ?? '',
      'competitor id': newComp.id,
      source: 'housemate sheet',
      'housemate name length': name.length,
    });
  };

  // Handle housemate invite (add then share)
  const handleHousemateInvite = async (name: string, color: string) => {
    const newCompetitor = await addHousemate(name, color);
    trackHousemateAdded({
      'household id': householdId ?? '',
      'competitor id': newCompetitor.id,
      source: 'housemate sheet invite',
      'housemate name length': name.length,
    });
    if (household?.joinCode) {
      const inviterName = household.competitors[0]?.name ?? 'Your housemate';
      const shared = await shareHouseholdInvite(inviterName, name, household.joinCode);
      if (shared) {
        trackInviteShared({
          'household id': householdId ?? '',
          'competitor id': newCompetitor.id,
          source: 'housemate sheet',
          'is resend': false,
        });
        await markInviteSent(newCompetitor.id);
      }
    }
  };

  // Handle share-invite (paper plane) — open native share for existing pending housemate
  const handleShareInvitePress = async () => {
    const compB = household?.competitors?.[1];
    if (!household?.joinCode || !compB) return;
    const inviterName = household.competitors[0]?.name ?? 'Your housemate';
    const shared = await shareHouseholdInvite(inviterName, compB.name, household.joinCode);
    if (shared) {
      trackInviteShared({
        'household id': householdId ?? '',
        'competitor id': compB.id,
        source: 'header icon',
        'is resend': true,
      });
      await markInviteSent(compB.id);
    }
  };

  // Open competitor sheet when name/score is tapped on scoreboard
  const handleCompetitorPress = (competitorId: string) => {
    const isSelf = competitorId === competitorA?.id;
    const position = competitorId === competitorA?.id ? 'left' : 'right';
    trackScoreboardTapped({
      'competitor id': competitorId,
      'competitor position': position,
      'is self': isSelf,
    });
    setSelectedCompetitorId(competitorId);
  };

  const handlePointsChange = (
    taskId: string,
    competitorId: string,
    points: number
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    const previousPoints = task?.points?.[competitorId] ?? 0;
    const todayKey = household ? getTodayDayKey(household.timezone) : selectedDayKey;
    const isSelf = competitorId === competitorA?.id;

    trackTaskScored({
      'task id': taskId,
      'competition id': challenge?.id ?? '',
      'competitor id': competitorId,
      'points value': points,
      'previous points value': previousPoints,
      'is self': isSelf,
      'is recurring': !!task?.templateId,
      'day key': task?.dayKey ?? selectedDayKey,
      'is today': (task?.dayKey ?? selectedDayKey) === todayKey,
      source: 'task list',
    });

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
          onSelectDay={(dayKey: string) => {
            const todayKeyNow = household ? getTodayDayKey(household.timezone) : selectedDayKey;
            const todayIndex = weekDayKeys.indexOf(todayKeyNow);
            const selectedIndex = weekDayKeys.indexOf(dayKey);
            const daysFromToday = selectedIndex - todayIndex;
            const dayTasks = tasks.filter((t) => t.dayKey === dayKey);

            trackDaySelected({
              'day key': dayKey,
              'is today': dayKey === todayKeyNow,
              'days from today': daysFromToday,
              'task count for day': dayTasks.length,
            });

            setSelectedDay(dayKey);
          }}
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
        {/* Content Area — hidden until tasks finish loading to avoid empty-state flash */}
        <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentSlide }], flex: 1 }}>
          {tasksForDay.length > 0 ? (
            <View>
              <TaskList
                tasks={tasksForDay}
                competitors={competitors}
                templates={templates}
                onPointsChange={handlePointsChange}
                onTaskPress={handleTaskPress}
                onTaskDelete={handleSwipeDelete}
                onReorder={(reorderedTasks: TaskInstance[]) => {
                  if (reorderedTasks.length > 0) {
                    trackTaskReordered({
                      'task id': reorderedTasks[0].id,
                      'competition id': challenge?.id ?? '',
                      'task count for day': reorderedTasks.length,
                    });
                  }
                  reorderTasks(reorderedTasks);
                }}
              />
            </View>
          ) : tasksReady ? (
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
          ) : null}
        </Animated.View>
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
        onNameChange={(name) => {
          if (selectedCompetitor) {
            trackCompetitorNameChanged({
              'competitor id': selectedCompetitor.id,
              'old name length': selectedCompetitor.name.length,
              'new name length': name.length,
              'is self': selectedCompetitor.id === competitorA?.id,
              source: 'competitor sheet',
            });
            updateCompetitor(selectedCompetitor.id, { name });
          }
        }}
        onColorChange={(color) => {
          if (selectedCompetitor) {
            trackCompetitorColorChanged({
              'competitor id': selectedCompetitor.id,
              'old value': selectedCompetitor.color,
              'new value': color,
              'is self': selectedCompetitor.id === competitorA?.id,
              source: 'competitor sheet',
            });
            updateCompetitor(selectedCompetitor.id, { color });
          }
        }}
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
          { id: 'future', label: 'All days without points', isDestructive: true },
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
