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
        {/* Competitor A (left side) */}
        <View style={styles.scoreSection}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {competitorA.name}
          </Text>
          <Text style={[typography.display, { color: competitorA.color }]}>
            {scoreA}
          </Text>
        </View>

        {/* Center info */}
        <View style={styles.centerSection}>
          <Text style={[typography.callout, { color: colors.textSecondary }]}>
            {dateRange}
          </Text>
          <View style={styles.prizeRow}>
            <Ionicons name="trophy" size={14} color={colors.prize} />
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginLeft: spacing.xxxs },
              ]}
            >
              {prize}
            </Text>
          </View>
        </View>

        {/* Competitor B (right side) */}
        <View style={[styles.scoreSection, { alignItems: 'flex-end' }]}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
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
    justifyContent: 'space-between',
  },
  scoreSection: {
    alignItems: 'flex-start',
    minWidth: 50,
  },
  centerSection: {
    alignItems: 'center',
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
});

export default ScoreboardCard;
