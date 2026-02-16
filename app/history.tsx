import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/useTheme';
import { AppHeader } from '../src/components/ui';
import { WeekStoryCard } from '../src/components/features';
import {
  useInsightsStore,
  useInsightWeeks,
  useInsightsLoading,
  useInsightsTotalTasks,
  useInsightsTotalWeeks,
  EnrichedChallenge,
} from '../src/store';
import { useHouseholdStore, useCompetitors } from '../src/store';
import { trackScreenViewed, trackInsightExpanded } from '../src/services/analytics';

/**
 * Insights screen — story feed of completed challenge weeks.
 */
export default function InsightsScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();

  const household = useHouseholdStore((s) => s.household);
  const competitors = useCompetitors();
  const weeks = useInsightWeeks();
  const isLoading = useInsightsLoading();
  const totalTasks = useInsightsTotalTasks();
  const totalWeeks = useInsightsTotalWeeks();
  const loadHistory = useInsightsStore((s) => s.loadHistory);

  // Load history when screen mounts
  useEffect(() => {
    trackScreenViewed({ 'screen name': 'insights' });
  }, []);

  useEffect(() => {
    if (household?.id && competitors.length > 0) {
      loadHistory(household.id, competitors);
    }
  }, [household?.id, competitors.length]);

  // Build contextual subtitle
  const subtitle = totalWeeks > 0
    ? `${totalWeeks} week${totalWeeks === 1 ? '' : 's'} together \u2014 ${totalTasks} tasks done`
    : undefined;

  const renderWeek = useCallback(
    ({ item, index }: { item: EnrichedChallenge; index: number }) => (
      <View style={{ paddingHorizontal: spacing.sm, marginBottom: spacing.md }}>
        <WeekStoryCard
          challenge={item.challenge}
          tasks={item.tasks}
          scoreA={item.scoreA}
          scoreB={item.scoreB}
          narrative={item.narrative}
          competitors={competitors}
          onExpand={() => {
            trackInsightExpanded({
              'competition id': item.challenge.id,
              'week start': item.challenge.startDayKey,
              'week end': item.challenge.endDayKey,
              'score a': item.scoreA,
              'score b': item.scoreB,
              'total tasks': item.tasks.length,
              'has narrative': !!item.narrative?.headline,
              'weeks ago': index,
            });
          }}
        />
      </View>
    ),
    [competitors, spacing.sm, spacing.md],
  );

  const keyExtractor = useCallback(
    (item: EnrichedChallenge) => item.challenge.id,
    [],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Insights"
        subtitle={subtitle}
        leftAction={{ icon: 'chevron-back', onPress: () => router.back() }}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : weeks.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.illustration, { backgroundColor: colors.prize + '20' }]}>
            <Ionicons name="sparkles-outline" size={64} color={colors.prize} />
          </View>
          <Text
            style={[
              typography.headline,
              { color: colors.textPrimary, marginTop: spacing.lg },
            ]}
          >
            No insights yet
          </Text>
          <Text
            style={[
              typography.callout,
              {
                color: colors.textSecondary,
                marginTop: spacing.xxs,
                textAlign: 'center',
              },
            ]}
          >
            Complete your first week to see your household's story here
          </Text>
        </View>
      ) : (
        <FlatList
          data={weeks}
          renderItem={renderWeek}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
