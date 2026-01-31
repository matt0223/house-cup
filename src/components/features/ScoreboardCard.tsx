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
  /** Prize text */
  prize: string;
}

/**
 * Card displaying the weekly scoreboard with both competitors' scores
 * and the current prize.
 *
 * Layout (3-column):
 * - Left column: Competitor A name + score (vertically centered)
 * - Center column: Trophy icon + prize name
 * - Right column: Competitor B name + score (vertically centered)
 */
export function ScoreboardCard({
  competitorA,
  competitorB,
  scoreA,
  scoreB,
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

        {/* Center column: Trophy + Prize */}
        <View style={styles.centerColumn}>
          <Ionicons
            name="trophy-outline"
            size={24}
            color={colors.prize}
          />
          <Text
            style={[
              typography.callout,
              { color: colors.textSecondary, marginTop: spacing.xxxs },
            ]}
          >
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
