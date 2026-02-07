import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { Card } from '../ui/Card';
import { Challenge, getChallengeDayKeys } from '../../domain/models/Challenge';
import { TaskInstance } from '../../domain/models/TaskInstance';
import { Competitor } from '../../domain/models/Competitor';
import { WeekNarrative } from '../../domain/services/narrativeService';
import { calculateDailyScores } from '../../domain/services/scoring';
import { formatDayKeyRange, getDayOfWeek } from '../../domain/services/dayKey';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Day-of-week short labels */
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface WeekStoryCardProps {
  challenge: Challenge;
  tasks: TaskInstance[];
  scoreA: number;
  scoreB: number;
  narrative: WeekNarrative;
  competitors: Competitor[];
}

/**
 * A card showing a completed week's narrative story.
 *
 * Visual hierarchy (top to bottom):
 *   1. Date range — timeline anchor (headline, textPrimary)
 *   2. Narrative — the story of what made this week interesting (callout, textPrimary)
 *      Hidden when narrative is a generic fallback.
 *   3. Result line — who earned what + score (callout, trophy icon, winner color, score secondary)
 *
 * Tapping expands to reveal a day-by-day score breakdown.
 */
export function WeekStoryCard({
  challenge,
  tasks,
  scoreA,
  scoreB,
  narrative,
  competitors,
}: WeekStoryCardProps) {
  const { colors, spacing, typography, radius } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const compA = competitors[0];
  const compB = competitors[1];
  const winner = challenge.winnerId
    ? competitors.find((c) => c.id === challenge.winnerId) ?? null
    : null;

  const dateRange = formatDayKeyRange(challenge.startDayKey, challenge.endDayKey);
  const highScore = Math.max(scoreA, scoreB);
  const lowScore = Math.min(scoreA, scoreB);

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        250,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
    setIsExpanded((prev) => !prev);
  }, []);

  // Day-by-day breakdown data (only computed when needed)
  const dayKeys = isExpanded ? getChallengeDayKeys(challenge) : [];
  const dailyA = isExpanded && compA
    ? calculateDailyScores(tasks, compA.id)
    : new Map<string, number>();
  const dailyB = isExpanded && compB
    ? calculateDailyScores(tasks, compB.id)
    : new Map<string, number>();

  let maxDayTotal = 1;
  if (isExpanded) {
    for (const dk of dayKeys) {
      const dayTotal = (dailyA.get(dk) ?? 0) + (dailyB.get(dk) ?? 0);
      if (dayTotal > maxDayTotal) maxDayTotal = dayTotal;
    }
  }

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handleToggle}>
      <Card padding="spacious">
        {/* Tier 1: Date — timeline anchor (bold callout, not full headline) */}
        <Text
          style={[
            typography.callout,
            { color: colors.textPrimary, fontWeight: '600' },
          ]}
        >
          {dateRange}
        </Text>

        {/* Tier 2: Narrative — the story (hidden for generic fallbacks) */}
        {!narrative.isFallback && (
          <Text
            style={[
              typography.callout,
              {
                color: colors.textPrimary,
                marginTop: spacing.xxs,
                lineHeight: 21,
              },
            ]}
          >
            {narrative.body}
          </Text>
        )}

        {/* Tier 3: Result — metadata line (smallest, lightest) */}
        <View
          style={[
            styles.resultRow,
            { marginTop: spacing.xs },
          ]}
        >
          <Ionicons
            name="trophy"
            size={12}
            color={colors.prize}
            style={{ marginRight: 4 }}
          />
          {challenge.isTie ? (
            <Text
              style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}
              numberOfLines={1}
            >
              Tied {'\u2014'} {challenge.prize}
            </Text>
          ) : winner ? (
            <Text
              style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}
              numberOfLines={1}
            >
              <Text style={{ color: winner.color, fontWeight: '600' }}>
                {winner.name}
              </Text>
              {' '}won {challenge.prize}
            </Text>
          ) : (
            <Text
              style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}
              numberOfLines={1}
            >
              {challenge.prize}
            </Text>
          )}
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginLeft: spacing.xs },
            ]}
          >
            {highScore} {'\u2013'} {lowScore}
          </Text>
        </View>

        {/* Insight tip (if present) */}
        {narrative.insightTip && (
          <View
            style={[
              styles.tipRow,
              {
                marginTop: spacing.sm,
                paddingTop: spacing.xs,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.divider,
              },
            ]}
          >
            <Ionicons
              name="bulb-outline"
              size={13}
              color={colors.prize}
              style={{ marginRight: 6, marginTop: 1 }}
            />
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, flex: 1 },
              ]}
            >
              {narrative.insightTip}
            </Text>
          </View>
        )}

        {/* Expanded: day-by-day breakdown */}
        {isExpanded && (
          <View
            style={{
              marginTop: spacing.sm,
              paddingTop: spacing.sm,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.divider,
            }}
          >
            {dayKeys.map((dk) => {
              const dA = dailyA.get(dk) ?? 0;
              const dB = dailyB.get(dk) ?? 0;
              const dayOfWeek = getDayOfWeek(dk);
              const dayLabel = SHORT_DAY_NAMES[dayOfWeek];

              return (
                <View key={dk} style={[styles.dayRow, { marginBottom: 6 }]}>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textSecondary, width: 30 },
                    ]}
                  >
                    {dayLabel}
                  </Text>

                  <View style={styles.barsContainer}>
                    {compA && dA > 0 && (
                      <View
                        style={{
                          backgroundColor: compA.color,
                          width: `${(dA / maxDayTotal) * 100}%`,
                          borderRadius: 3,
                          height: 5,
                          marginBottom: 2,
                        }}
                      />
                    )}
                    {compB && dB > 0 && (
                      <View
                        style={{
                          backgroundColor: compB.color,
                          width: `${(dB / maxDayTotal) * 100}%`,
                          borderRadius: 3,
                          height: 5,
                        }}
                      />
                    )}
                    {dA === 0 && dB === 0 && (
                      <View style={{ height: 12 }} />
                    )}
                  </View>

                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textSecondary, width: 36, textAlign: 'right' },
                    ]}
                  >
                    {dA}{'\u2013'}{dB}
                  </Text>
                </View>
              );
            })}

            {/* Legend */}
            <View style={[styles.legendRow, { marginTop: spacing.xxs }]}>
              {compA && (
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: compA.color }]}
                  />
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {compA.name}
                  </Text>
                </View>
              )}
              {compB && (
                <View style={[styles.legendItem, { marginLeft: spacing.sm }]}>
                  <View
                    style={[styles.legendDot, { backgroundColor: compB.color }]}
                  />
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {compB.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barsContainer: {
    flex: 1,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 4,
  },
});

export default WeekStoryCard;
