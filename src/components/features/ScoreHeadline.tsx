import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { Competitor, isPendingCompetitor } from '../../domain/models/Competitor';
import {
  buildScoreHeadline,
  prizeLineLabel,
  getWeekNumber,
  formatDayKeyRange,
} from '../../domain/services';

/** Scroll distance over which the headline collapses (matches task list scroll). */
const COLLAPSE_THRESHOLD = 110;

const HEADLINE_FONT_EXPANDED = 28;
const HEADLINE_FONT_COLLAPSED = 17;
const HEADLINE_LINE_EXPANDED = 34;
const HEADLINE_LINE_COLLAPSED = 22;

export interface ScoreHeadlineProps {
  /** Animated scroll Y value from the task ScrollView */
  scrollY: Animated.Value;
  competitorA: Competitor;
  competitorB?: Competitor;
  scoreA: number;
  scoreB: number;
  prize: string;
  /** Challenge week bounds, for the "WEEK 27 · JUL 4 – JUL 10" micro-label */
  startDayKey?: string;
  endDayKey?: string;
  onPrizePress?: () => void;
  onInvitePress?: () => void;
  onShareInvitePress?: () => void;
  onCompetitorPress?: (competitorId: string) => void;
  onHistoryPress?: () => void;
  onSettingsPress?: () => void;
}

/**
 * Home-screen header in document grammar: a tracked micro-label, the score
 * as a headline sentence ("Pri leads, 35–33"), and quiet support lines for
 * the prize and housemate status. Everything left-aligned on one axis.
 *
 * On scroll the headline shrinks in place and the support lines fade and
 * collapse; the micro-label row (with history/settings) stays put.
 */
export function ScoreHeadline({
  scrollY,
  competitorA,
  competitorB,
  scoreA,
  scoreB,
  prize,
  startDayKey,
  endDayKey,
  onPrizePress,
  onInvitePress,
  onShareInvitePress,
  onCompetitorPress,
  onHistoryPress,
  onSettingsPress,
}: ScoreHeadlineProps) {
  const { colors, spacing, typography } = useTheme();

  // Measured natural height of the support lines, for the collapse animation
  const [subHeight, setSubHeight] = useState(0);

  const headlineFontSize = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD],
    outputRange: [HEADLINE_FONT_EXPANDED, HEADLINE_FONT_COLLAPSED],
    extrapolate: 'clamp',
  });
  const headlineLineHeight = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD],
    outputRange: [HEADLINE_LINE_EXPANDED, HEADLINE_LINE_COLLAPSED],
    extrapolate: 'clamp',
  });
  // Support lines fade out in the first half of the collapse, then their
  // space closes. Single-line rows at fixed width, so clipping cannot
  // cause text reflow (see CLAUDE.md animation lessons).
  const subOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const subMaxHeight = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD],
    outputRange: [subHeight || 80, 0],
    extrapolate: 'clamp',
  });

  const onSubLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== subHeight) setSubHeight(h);
  };

  const segments = buildScoreHeadline(
    { competitor: competitorA, score: scoreA },
    competitorB ? { competitor: competitorB, score: scoreB } : null
  );

  const bothScoresZero = scoreA === 0 && scoreB === 0;
  const prizeLabel = prizeLineLabel(prize, bothScoresZero);
  const hasPrize = !!prize && prize.length > 0;

  const shareHandler = onShareInvitePress ?? onInvitePress;
  const showResendLine =
    !!competitorB && isPendingCompetitor(competitorB) && !!shareHandler;
  const showInviteLine = !competitorB && !!onInvitePress;

  const microLabel =
    startDayKey && endDayKey
      ? `WEEK ${getWeekNumber(startDayKey)} · ${formatDayKeyRange(startDayKey, endDayKey).toUpperCase()}`
      : 'THIS WEEK';

  const colorForSegment = (competitorId?: string): string => {
    if (!competitorId) return colors.textPrimary;
    if (competitorId === competitorA.id) return competitorA.color;
    if (competitorB && competitorId === competitorB.id) return competitorB.color;
    return colors.textPrimary;
  };

  return (
    <View style={{ paddingHorizontal: spacing.md }}>
      {/* Micro-label row — stays visible when collapsed */}
      <View style={styles.microRow}>
        <Text
          style={[styles.microLabel, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {microLabel}
        </Text>
        <View style={styles.microActions}>
          {onHistoryPress && (
            <TouchableOpacity
              onPress={onHistoryPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="History and insights"
              accessibilityRole="button"
            >
              <Ionicons name="trending-up-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {onSettingsPress && (
            <TouchableOpacity
              onPress={onSettingsPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginLeft: spacing.md }}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* The score, as a sentence */}
      <Animated.Text
        style={[
          styles.headline,
          {
            color: colors.textPrimary,
            fontSize: headlineFontSize,
            lineHeight: headlineLineHeight,
          },
        ]}
        numberOfLines={2}
        accessibilityRole="header"
      >
        {segments.map((segment, i) =>
          segment.competitorId && onCompetitorPress ? (
            <Text
              key={i}
              style={{ color: colorForSegment(segment.competitorId) }}
              onPress={() => onCompetitorPress(segment.competitorId!)}
              suppressHighlighting
            >
              {segment.text}
            </Text>
          ) : (
            <Text key={i} style={{ color: colorForSegment(segment.competitorId) }}>
              {segment.text}
            </Text>
          )
        )}
      </Animated.Text>

      {/* Support lines — fade and close as the user scrolls */}
      <Animated.View style={{ opacity: subOpacity, maxHeight: subMaxHeight, overflow: 'hidden' }}>
        <View onLayout={onSubLayout}>
          <TouchableOpacity
            style={styles.subRow}
            onPress={onPrizePress}
            disabled={!onPrizePress}
            activeOpacity={0.6}
            accessibilityLabel={hasPrize ? 'Edit prize' : 'Set a prize'}
            accessibilityRole="button"
          >
            <Ionicons
              name="trophy-outline"
              size={15}
              color={hasPrize ? colors.prizeDeep : colors.textSecondary}
            />
            <Text
              style={[
                typography.callout,
                styles.subText,
                styles.subTextShrink,
                { color: hasPrize ? colors.textSecondary : colors.prizeDeep },
              ]}
              numberOfLines={1}
            >
              {prizeLabel}
            </Text>
            {onPrizePress && (
              <Ionicons
                name="chevron-forward"
                size={13}
                color={colors.textSecondary}
                style={styles.subChevron}
              />
            )}
          </TouchableOpacity>

          {showInviteLine && (
            <TouchableOpacity
              style={styles.subRow}
              onPress={onInvitePress}
              activeOpacity={0.6}
              accessibilityLabel="Add housemate"
              accessibilityRole="button"
            >
              <Ionicons name="person-add-outline" size={15} color={colors.primary} />
              <Text
                style={[typography.callout, styles.subText, styles.subEmphasis, { color: colors.primary }]}
                numberOfLines={1}
              >
                Add your housemate
              </Text>
            </TouchableOpacity>
          )}

          {showResendLine && (
            <TouchableOpacity
              style={styles.subRow}
              onPress={shareHandler}
              activeOpacity={0.6}
              accessibilityLabel={`Resend invite to ${competitorB!.name}`}
              accessibilityRole="button"
            >
              <Ionicons name="paper-plane-outline" size={15} color={colors.textSecondary} />
              <Text
                style={[typography.callout, styles.subText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                Waiting for {competitorB!.name} — tap to resend invite
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  microRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  microLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  microActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headline: {
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 10,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  subText: {
    marginLeft: 7,
    fontWeight: '500',
  },
  subTextShrink: {
    flexShrink: 1,
  },
  subChevron: {
    marginLeft: 2,
  },
  subEmphasis: {
    fontWeight: '600',
  },
});
