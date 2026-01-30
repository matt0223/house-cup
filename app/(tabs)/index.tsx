import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/useTheme';
import { AppHeader, DayStrip, AddTaskButton, TaskAddedToast } from '../../src/components/ui';
import { ScoreboardCard, TaskList, AddTaskSheet } from '../../src/components/features';
import {
  useHouseholdStore,
  useChallengeStore,
  useRecurringStore,
} from '../../src/store';
import { formatDayKeyRange, getTodayDayKey } from '../../src/domain/services';

/**
 * Challenge screen - Main tab showing scoreboard, day strip, and task list.
 */
export default function ChallengeScreen() {
  const { colors, spacing, typography } = useTheme();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAddSheetVisible, setIsAddSheetVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastKey, setToastKey] = useState(0);

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
  const getScores = useChallengeStore((s) => s.getScores);

  // Recurring store
  const templates = useRecurringStore((s) => s.templates);
  const skipRecords = useRecurringStore((s) => s.skipRecords);
  const loadRecurringSample = useRecurringStore((s) => s.loadSampleData);

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      // Load sample data for development
      loadHouseholdSample();
      loadRecurringSample();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Initialize challenge when household is ready
  useEffect(() => {
    if (household && !challenge && templates.length > 0) {
      initializeChallenge(
        household.timezone,
        household.weekStartDay,
        templates,
        skipRecords
      );
    }
  }, [household, challenge, templates]);

  // Derived state
  const competitors = household?.competitors ?? [];
  const competitorA = competitors[0];
  const competitorB = competitors[1];
  const tasksForDay = tasks.filter((t) => t.dayKey === selectedDayKey);
  const scores = competitors.length > 0 ? getScores(competitors) : null;
  const scoreA = scores?.scores.find((s) => s.competitorId === competitorA?.id)?.total ?? 0;
  const scoreB = scores?.scores.find((s) => s.competitorId === competitorB?.id)?.total ?? 0;

  // Get week day keys from challenge
  const weekDayKeys = challenge
    ? getDayKeysFromChallenge(challenge.startDayKey, challenge.endDayKey)
    : getDefaultWeekDayKeys();

  // Use household timezone to determine "today"
  const timezone = household?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayKey = getTodayDayKey(timezone);

  // Handle adding a task from the sheet
  const handleAddTaskSubmit = (
    name: string,
    points: Record<string, number>,
    _repeatDays: number[] | null
  ) => {
    addTask(name, points);
    
    // Show toast (increment key to force new instance if already visible)
    setToastKey((k) => k + 1);
    setShowToast(true);
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
          { icon: 'notifications-outline', onPress: () => console.log('Notifications') },
          { icon: 'settings-outline', onPress: () => console.log('Settings') },
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
            prize={challenge?.prize ?? 'Set a prize!'}
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

      {/* Add Task Sheet */}
      <AddTaskSheet
        isVisible={isAddSheetVisible}
        onClose={() => setIsAddSheetVisible(false)}
        onSubmit={handleAddTaskSubmit}
        competitors={competitors}
      />

      {/* Task Added Toast */}
      <TaskAddedToast
        key={toastKey}
        visible={showToast}
        onHidden={handleToastHidden}
      />
    </SafeAreaView>
  );
}

// Helper to get day keys from challenge
function getDayKeysFromChallenge(startDayKey: string, endDayKey: string): string[] {
  const dayKeys: string[] = [];
  let current = startDayKey;

  while (current <= endDayKey) {
    dayKeys.push(current);
    const date = new Date(current + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + 1);
    current = date.toISOString().split('T')[0];
  }

  return dayKeys;
}

// Default week day keys (current week starting Sunday)
function getDefaultWeekDayKeys(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date.toISOString().split('T')[0];
  });
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
