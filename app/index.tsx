import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Animated, ScrollView, Easing } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/theme/useTheme';
import { AppHeader, DayStrip, AddTaskButton, TaskAddedToast } from '../src/components/ui';
import { CollapsibleScoreboard, TaskList, AddTaskSheet, TaskChanges, ChangeScope, WeekCelebration } from '../src/components/features';
import { ConfirmationModal } from '../src/components/ui';
import {
  useHouseholdStore,
  useChallengeStore,
  useRecurringStore,
} from '../src/store';
import { useFirebase } from '../src/providers/FirebaseProvider';
import { formatDayKeyRange, getTodayDayKey, getCurrentWeekWindow, generateCelebrationNarrative } from '../src/domain/services';
import { TaskInstance } from '../src/domain/models/TaskInstance';
import { WeekNarrative } from '../src/domain/services/narrativeService';
import { shareHouseholdInvite } from '../src/utils/shareInvite';
import * as taskService from '../src/services/firebase/taskService';

/**
 * Challenge screen - Main tab showing scoreboard, day strip, and task list.
 */
export default function ChallengeScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isAddSheetVisible, setIsAddSheetVisible] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [toastKey, setToastKey] = React.useState(0);
  const [toastMessage, setToastMessage] = React.useState('Task added');
  const [editingTask, setEditingTask] = React.useState<TaskInstance | null>(null);
  const [swipeDeleteTask, setSwipeDeleteTask] = React.useState<TaskInstance | null>(null);
  // Track the weekStartDay used to create the current challenge
  const [challengeWeekStartDay, setChallengeWeekStartDay] = React.useState<number | null>(null);

  // Celebration overlay state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationNarrative, setCelebrationNarrative] = useState<WeekNarrative | null>(null);
  const celebrationCheckedRef = useRef<string | null>(null);

  // Animated value for scroll-linked scoreboard collapse
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const currentScrollOffset = useRef(0);
  const scrollViewHeight = useRef(0);
  const scrollContentHeight = useRef(0);
  const isAnimatingDayChange = useRef(false);

  // Track scroll offset via scrollY listener (captures both native events and Animated.timing)
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      currentScrollOffset.current = value;
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  // Manual scroll handler: blocks scrollY updates during day-change animation
  // to prevent the native scroll clamp (→ 0) from flashing the header to expanded
  const handleScroll = useCallback((event: any) => {
    if (!isAnimatingDayChange.current) {
      scrollY.setValue(event.nativeEvent.contentOffset.y);
    }
  }, [scrollY]);

  // Track scroll view dimensions for day-change scroll logic
  const handleScrollLayout = useCallback((e: any) => {
    scrollViewHeight.current = e.nativeEvent.layout.height;
  }, []);
  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    scrollContentHeight.current = h;
  }, []);

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

  // Detect challenge completion and show celebration overlay (once per challenge)
  useEffect(() => {
    if (!challenge || !challenge.isCompleted) return;
    if (celebrationCheckedRef.current === challenge.id) return;
    celebrationCheckedRef.current = challenge.id;

    const key = `celebration-seen-${challenge.id}`;
    AsyncStorage.getItem(key).then((seen) => {
      if (seen) return; // Already shown for this challenge

      const competitors = household?.competitors ?? [];
      if (competitors.length === 0) return;

      const narrative = generateCelebrationNarrative(challenge, tasks, competitors);
      setCelebrationNarrative(narrative);
      setShowCelebration(true);
      AsyncStorage.setItem(key, 'true').catch(() => {});
    });
  }, [challenge?.id, challenge?.isCompleted, household?.competitors, tasks]);

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

  // Select day: maintain scroll position for long days, smoothly expand for short days.
  // Animation starts immediately with a fast-start easing, then the re-render is deferred
  // by one frame so the animation visually begins before the heavy re-render blocks JS.
  const handleDaySelect = useCallback((dayKey: string) => {
    const savedOffset = currentScrollOffset.current;

    if (savedOffset <= 0) {
      setSelectedDay(dayKey);
      return; // Already at top, nothing to manage
    }

    // Block native scroll events from resetting scrollY during the re-render
    isAnimatingDayChange.current = true;

    // Start expanding immediately with fast-start easing (visible movement on first frame)
    Animated.timing(scrollY, {
      toValue: 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) isAnimatingDayChange.current = false;
    });

    // Defer re-render by one frame so the animation starts before JS gets blocked
    requestAnimationFrame(() => {
      setSelectedDay(dayKey);

      // After re-render: if new content is long enough, cancel expand and restore position
      requestAnimationFrame(() => {
        const maxScroll = Math.max(0, scrollContentHeight.current - scrollViewHeight.current);

        if (maxScroll >= savedOffset) {
          // New day has enough content — cancel expand, restore collapsed position
          scrollY.stopAnimation();
          isAnimatingDayChange.current = false;
          scrollY.setValue(savedOffset);
          scrollViewRef.current?.scrollTo({ y: savedOffset, animated: false });
        }
        // Short content: animation already running, let it finish
      });
    });
  }, [setSelectedDay, scrollY]);

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

    setToastMessage('Invite sent');
    setToastKey((k) => k + 1);
    setShowToast(true);
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
    setToastMessage('Task added');
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
    const hasNameChange = changes.name !== undefined && changes.name !== task.name;
    const hasScheduleChange = changes.repeatDays !== undefined;

    // Handle name change
    if (hasNameChange) {
      if (isRecurring && task.templateId) {
        if (scope === 'future') {
          // Update template name + all linked instances
          updateTaskName(taskId, changes.name!, true, templates, (templateId, newName) => {
            updateTemplate(templateId, { name: newName });
          });
        } else {
          // Detach and update just this instance (store persists task + skip record)
          updateTaskName(taskId, changes.name!, false, templates);
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
    if (hasScheduleChange && isRecurring && task.templateId) {
      if (changes.repeatDays!.length === 0) {
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
        updateTemplate(task.templateId, { repeatDays: changes.repeatDays! });
      }
    }

    // Handle converting one-off to recurring
    if (
      hasScheduleChange &&
      changes.repeatDays!.length > 0 &&
      !isRecurring
    ) {
      const newTemplate = addTemplate(task.name, changes.repeatDays!);
      linkTaskToTemplate(taskId, newTemplate.id);
    }

    // Show toast only for name or schedule changes (not point-only changes)
    if (hasNameChange || hasScheduleChange) {
      setToastMessage('Task updated');
      setToastKey((k) => k + 1);
      setShowToast(true);
    }

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

    // Show toast
    setToastMessage('Task deleted');
    setToastKey((k) => k + 1);
    setShowToast(true);

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
      // Show toast
      setToastMessage('Task deleted');
      setToastKey((k) => k + 1);
      setShowToast(true);
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

    // Show toast
    setToastMessage('Task deleted');
    setToastKey((k) => k + 1);
    setShowToast(true);

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

  // Option A: Header + scoreboard scroll together inside a clipping container
  // Include CollapsibleScoreboard paddingTop (8) so prize circle bottom isn't clipped
  const HEADER_HEIGHT = 52;
  const HEADER_EXIT_SCROLL = 65; // header exits over 65px of scroll (~20% slower than content)
  const EXPANDED_SCOREBOARD_HEIGHT = 140 + 8; // MorphingScoreboard 140 + paddingTop
  const COLLAPSED_SCOREBOARD_HEIGHT = 100 + 8;
  const SCOREBOARD_COLLAPSE_THRESHOLD = 110;
  // Day strip overlay: top padding (12) + chip height (36) + bottom padding (8) so tasks scroll behind
  const DAY_STRIP_ZONE_HEIGHT = spacing.xs + 36 + spacing.xxs;

  // Header exits with subtle parallax: 52px of movement spread over 65px of scroll
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_EXIT_SCROLL],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: 'clamp',
  });

  // Clip height = visible header + scoreboard (both shrink independently)
  // This eliminates the empty gap when the header scrolls out
  const headerVisibleHeight = scrollY.interpolate({
    inputRange: [0, HEADER_EXIT_SCROLL],
    outputRange: [HEADER_HEIGHT, 0],
    extrapolate: 'clamp',
  });
  // Ease the scoreboard height to match the eased MorphingScoreboard structural animations
  const sbDelta = (EXPANDED_SCOREBOARD_HEIGHT - COLLAPSED_SCOREBOARD_HEIGHT) * 0.08;
  const scoreboardAnimatedHeight = scrollY.interpolate({
    inputRange: [0, SCOREBOARD_COLLAPSE_THRESHOLD * 0.15, SCOREBOARD_COLLAPSE_THRESHOLD * 0.85, SCOREBOARD_COLLAPSE_THRESHOLD],
    outputRange: [EXPANDED_SCOREBOARD_HEIGHT, EXPANDED_SCOREBOARD_HEIGHT - sbDelta, COLLAPSED_SCOREBOARD_HEIGHT + sbDelta, COLLAPSED_SCOREBOARD_HEIGHT],
    extrapolate: 'clamp',
  });
  const clipContainerHeight = Animated.add(headerVisibleHeight, scoreboardAnimatedHeight);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Clipping container: header + scoreboard scroll up together; content outside clip is hidden */}
      <Animated.View style={[styles.clipContainer, { height: clipContainerHeight }]}>
        <Animated.View style={[styles.headerScoreboardBlock, { transform: [{ translateY: headerTranslateY }] }]}>
          <AppHeader
            title={dateRange || 'This Week'}
            rightActions={[
              { icon: 'sparkles-outline', onPress: () => router.push('/history') },
              { icon: 'settings-outline', onPress: () => router.push('/settings') },
            ]}
          />
          {/* 16px total less space above scoreboard (move scoreboard and prize circle up) */}
          <View style={styles.scoreboardWrap}>
            <CollapsibleScoreboard
              scrollY={scrollY}
              competitorA={competitorA}
              competitorB={competitorB}
              scoreA={scoreA}
              scoreB={scoreB}
              prize={household?.prize || 'Set a prize!'}
              onInvitePress={handleInvitePress}
            />
          </View>
        </Animated.View>
      </Animated.View>

      {/* Scroll area: day strip overlays top so tasks scroll behind it */}
      <View style={styles.scrollAreaWrap}>
        <View
          style={[
            styles.dayStripOverlay,
            {
              paddingTop: spacing.xs,
              paddingBottom: spacing.xxs,
              backgroundColor: colors.background,
            },
          ]}
          pointerEvents="box-none"
        >
          <DayStrip
            dayKeys={weekDayKeys}
            selectedDayKey={selectedDayKey}
            todayDayKey={todayKey}
            onSelectDay={handleDaySelect}
          />
        </View>
        <Animated.ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: DAY_STRIP_ZONE_HEIGHT, paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
          onScroll={handleScroll}
          onLayout={handleScrollLayout}
          onContentSizeChange={handleContentSizeChange}
          scrollEventThrottle={16}
        >
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
      </View>

      {/* Floating Add Task Button */}
      <AddTaskButton onPress={() => setIsAddSheetVisible(true)} bottom={insets.bottom + 16} />

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

      {/* Toast notification */}
      <TaskAddedToast
        key={toastKey}
        visible={showToast}
        onHidden={handleToastHidden}
        message={toastMessage}
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

      {/* Week Celebration Overlay */}
      {showCelebration && challenge && celebrationNarrative && (
        <WeekCelebration
          challenge={challenge}
          competitors={competitors}
          scoreA={scoreA}
          scoreB={scoreB}
          narrative={celebrationNarrative}
          onViewInsights={() => {
            setShowCelebration(false);
            router.push('/history');
          }}
          onDismiss={() => setShowCelebration(false)}
        />
      )}
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
  clipContainer: {
    overflow: 'hidden',
  },
  headerScoreboardBlock: {
    // No fixed height; children define height (AppHeader + CollapsibleScoreboard)
  },
  scoreboardWrap: {
    marginTop: -16,
  },
  scrollAreaWrap: {
    flex: 1,
    position: 'relative',
  },
  dayStripOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
});
