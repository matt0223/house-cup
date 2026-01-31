import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { Card } from '../ui/Card';
import { Competitor } from '../../domain/models/Competitor';

export interface ScoreboardCardProps {
  /** First competitor */
  competitorA: Competitor;
  /** Second competitor */
  competitorB: Competitor;
  /** Score for first competitor */
  scoreA: number;
  /** Score for second competitor */
  scoreB: number;
  /** Date range text (e.g., "Jan 24 - Jan 30") */
  dateRange: string;
  /** Prize text */
  prize: string;
}

/**
 * Card displaying the weekly scoreboard with both competitors' scores,
 * date range, and the current prize.
 *
 * Layout (3-column):
 * - Left column: Competitor A name + score (vertically centered)
 * - Center column: Date range, trophy, prize (tight vertical stack)
 * - Right column: Competitor B name + score (vertically centered)
 */
export function ScoreboardCard({
  competitorA,
  competitorB,
  scoreA,
  scoreB,
  dateRange,
  prize,
}: ScoreboardCardProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <Card>
      <View style={styles.container}>
        {/* Left column: Competitor A */}
        <View style={styles.competitorColumn}>
          <Text style={[typography.callout, { color: colors.textSecondary }]}>
            {competitorA.name}
          </Text>
          <Text style={[typography.display, { color: competitorA.color }]}>
            {scoreA}
          </Text>
        </View>

        {/* Center column: Date, Trophy, Prize */}
        <View style={styles.centerColumn}>
          <Text style={[typography.callout, { color: colors.textSecondary }]}>
            {dateRange}
          </Text>
          <Ionicons
            name="trophy-outline"
            size={24}
            color={colors.prize}
            style={{ marginVertical: spacing.xxxs }}
          />
          <Text style={[typography.callout, { color: colors.textSecondary }]}>
            {prize}
          </Text>
        </View>

        {/* Right column: Competitor B */}
        <View style={[styles.competitorColumn, { alignItems: 'flex-end' }]}>
          <Text style={[typography.callout, { color: colors.textSecondary }]}>
            {competitorB.name}
          </Text>
          <Text style={[typography.display, { color: competitorB.color }]}>
            {scoreB}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  competitorColumn: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScoreboardCard;
