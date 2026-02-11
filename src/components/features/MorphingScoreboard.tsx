import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { Competitor, isPendingCompetitor } from '../../domain/models/Competitor';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface MorphingScoreboardProps {
  scrollY: Animated.Value;
  competitorA: Competitor;
  competitorB?: Competitor;
  scoreA: number;
  scoreB: number;
  prize: string;
  onInvitePress?: () => void;
  onShareInvitePress?: () => void;
  onPrizePress?: () => void;
  onCompetitorPress?: (competitorId: string) => void;
}

const COLLAPSE_THRESHOLD = 110;

// Wrapper: full area for bulge; circle centered here
const EXPANDED_WRAPPER_HEIGHT = 154;
const COLLAPSED_WRAPPER_HEIGHT = 100; // fit 95px circle with proportional bulge (see below)

// Card (grey rect): shorter than circle so circle bulges evenly
const EXPANDED_CARD_HEIGHT = 112; // 80 content + 32 padding; circle 154 → 21px bulge each side
const COLLAPSED_CARD_HEIGHT = 76; // 44 content + 32 padding; card centered in 84px wrapper

const PRIZE_CIRCLE_EXPANDED = 154;
const PRIZE_CIRCLE_COLLAPSED = 95; // proportional to expanded: 76 * (140/112) ≈ 95, bulge ~9.5px each side
const PRIZE_BORDER_EXPANDED = 4;
const PRIZE_BORDER_COLLAPSED = 3;
const TROPHY_EXPANDED = 24;
const TROPHY_COLLAPSED = 28;

const ROW_HEIGHT_EXPANDED = 80;
const ROW_HEIGHT_COLLAPSED = 44;
const NAME_LINE_HEIGHT = 20; // callout lineHeight
const SCORE_INLINE_LEFT = 36; // ~28pt score width + 8px gap (production)

// Score font sizes: animate directly instead of scale transforms (avoids clipping)
const SCORE_FONT_SIZE_EXPANDED = 48;
const SCORE_FONT_SIZE_COLLAPSED = 28;
const SCORE_LINE_HEIGHT_EXPANDED = 56;
const SCORE_LINE_HEIGHT_COLLAPSED = 34;

// Content wrapper: 76px expanded (name+score block), 44px collapsed; centered in column via flexbox
const CONTENT_WRAPPER_HEIGHT_EXPANDED = 76;
const CONTENT_WRAPPER_HEIGHT_COLLAPSED = 44;
// Expanded: name at 0, score at 20. Collapsed: score at top 5 (centered in 44), name at 12 (centered in 44)
const COLLAPSED_SCORE_TOP = 5;  // (44 - 34) / 2
const COLLAPSED_NAME_TOP = 12;  // (44 - 20) / 2 for callout lineHeight

/** Size of small circular add buttons (prize + housemate) — matches ScoreboardCard */
const ADD_BUTTON_SIZE = 44;

// Stagger: stacked name exits first, then inline name enters
const STACKED_EXIT_END = 0.45;
const INLINE_ENTER_START = 0.25;
const INLINE_ENTER_END = 0.65;

/**
 * Single scoreboard that morphs between expanded and collapsed states.
 * - Expanded: name above score (production layout), 140px center circle bulges past card.
 * - Collapsed: score + name row, 60px circle bulges; vertical center, 8px gap.
 * - Name transition: stacked name moves up and out (clipped); inline name moves up and in (clipped); slight stagger.
 */
export function MorphingScoreboard({
  scrollY,
  competitorA,
  competitorB,
  scoreA,
  scoreB,
  prize,
  onInvitePress,
  onShareInvitePress,
  onPrizePress,
  onCompetitorPress,
}: MorphingScoreboardProps) {
  const { colors, typography, spacing, radius } = useTheme();

  // Linear progress (0-1) used by name stagger and other custom-timed transitions
  const progress = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // --- Ease-in-out helpers for structural animations ---
  // Gentle start (first 15%), smooth middle, gentle landing (last 15%)
  const EASE_FACTOR = 0.08; // 8% of total change at each end
  const easeScrollStops = [0, COLLAPSE_THRESHOLD * 0.15, COLLAPSE_THRESHOLD * 0.85, COLLAPSE_THRESHOLD];
  const easedRange = (from: number, to: number) => {
    const d = (from - to) * EASE_FACTOR;
    return [from, from - d, to + d, to];
  };
  const easeProgressStops = [0, 0.15, 0.85, 1];

  // --- Eased structural animations ---

  const wrapperHeight = scrollY.interpolate({
    inputRange: easeScrollStops,
    outputRange: easedRange(EXPANDED_WRAPPER_HEIGHT, COLLAPSED_WRAPPER_HEIGHT),
    extrapolate: 'clamp',
  });

  const cardHeight = scrollY.interpolate({
    inputRange: easeScrollStops,
    outputRange: easedRange(EXPANDED_CARD_HEIGHT, COLLAPSED_CARD_HEIGHT),
    extrapolate: 'clamp',
  });

  const rowHeight = scrollY.interpolate({
    inputRange: easeScrollStops,
    outputRange: easedRange(ROW_HEIGHT_EXPANDED, ROW_HEIGHT_COLLAPSED),
    extrapolate: 'clamp',
  });

  const contentWrapperHeight = scrollY.interpolate({
    inputRange: easeScrollStops,
    outputRange: easedRange(CONTENT_WRAPPER_HEIGHT_EXPANDED, CONTENT_WRAPPER_HEIGHT_COLLAPSED),
    extrapolate: 'clamp',
  });

  // Nudge expanded name+score block for vertical center (reliable across devices)
  const contentWrapperMarginTop = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD],
    outputRange: [-2, 0],
    extrapolate: 'clamp',
  });

  const circleSize = progress.interpolate({
    inputRange: easeProgressStops,
    outputRange: easedRange(PRIZE_CIRCLE_EXPANDED, PRIZE_CIRCLE_COLLAPSED),
  });

  const circleBorderWidth = progress.interpolate({
    inputRange: easeProgressStops,
    outputRange: easedRange(PRIZE_BORDER_EXPANDED, PRIZE_BORDER_COLLAPSED),
  });

  const trophyScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, TROPHY_COLLAPSED / TROPHY_EXPANDED],
  });

  const prizeTextOpacity = progress.interpolate({
    inputRange: [0, 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Collapse text height to 0 so flex centering keeps trophy centered when text is hidden
  // 80px accommodates both prize text (3 lines) and empty state (text + 44px add button)
  const prizeTextMaxHeight = progress.interpolate({
    inputRange: [0, 0.6],
    outputRange: [80, 0],
    extrapolate: 'clamp',
  });

  // Animate fontSize/lineHeight directly with easing (no scale transform = no clipping)
  const scoreFontSize = scrollY.interpolate({
    inputRange: easeScrollStops,
    outputRange: easedRange(SCORE_FONT_SIZE_EXPANDED, SCORE_FONT_SIZE_COLLAPSED),
    extrapolate: 'clamp',
  });
  const scoreLineHeight = scrollY.interpolate({
    inputRange: easeScrollStops,
    outputRange: easedRange(SCORE_LINE_HEIGHT_EXPANDED, SCORE_LINE_HEIGHT_COLLAPSED),
    extrapolate: 'clamp',
  });

  const scoreTop = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [NAME_LINE_HEIGHT, COLLAPSED_SCORE_TOP],
  });

  const inlineNameClipTop = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, COLLAPSED_NAME_TOP],
  });

  // Stacked name: up and out (clipped)
  const stackedNameTranslateY = progress.interpolate({
    inputRange: [0, STACKED_EXIT_END],
    outputRange: [0, -NAME_LINE_HEIGHT],
    extrapolate: 'clamp',
  });
  const stackedNameOpacity = progress.interpolate({
    inputRange: [0, STACKED_EXIT_END],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Inline name: up and in (clipped), slight stagger after stacked
  const inlineNameTranslateY = progress.interpolate({
    inputRange: [INLINE_ENTER_START, INLINE_ENTER_END],
    outputRange: [NAME_LINE_HEIGHT, 0],
    extrapolate: 'clamp',
  });
  const inlineNameOpacity = progress.interpolate({
    inputRange: [INLINE_ENTER_START, INLINE_ENTER_END],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // When no competitor B: expanded Add button fades out as we collapse
  const expandedInviteOpacity = progress.interpolate({
    inputRange: [0, 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const collapsedBorderWidth = progress.interpolate({
    inputRange: [0.7, 1],
    outputRange: [0, 3],
    extrapolate: 'clamp',
  });

  const shareHandler = onShareInvitePress ?? onInvitePress;
  const hasPrize = !!prize && prize.length > 0;

  const renderRightColumn = () => {
    if (competitorB) {
      const isPending = isPendingCompetitor(competitorB);
      return (
        <TouchableOpacity
          style={[styles.column, styles.rightColumn]}
          activeOpacity={onCompetitorPress ? 0.7 : 1}
          onPress={onCompetitorPress ? () => onCompetitorPress(competitorB.id) : undefined}
          accessibilityLabel={`${competitorB.name}, score ${scoreB}`}
          accessibilityRole="button"
        >
          <Animated.View
            style={[
              styles.contentWrapper,
              { height: contentWrapperHeight, marginTop: contentWrapperMarginTop },
            ]}
          >
            <Animated.View
              style={[
                styles.nameClip,
                {
                  top: 0,
                  height: NAME_LINE_HEIGHT,
                  opacity: stackedNameOpacity,
                  transform: [{ translateY: stackedNameTranslateY }],
                },
              ]}
            >
              <View style={[styles.nameRow, styles.nameRowRight]}>
                <Text style={[typography.callout, { color: colors.textSecondary }]}>
                  {competitorB.name}
                </Text>
                {isPending && shareHandler && (
                  <TouchableOpacity
                    onPress={shareHandler}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ marginLeft: spacing.xxs }}
                  >
                    <Ionicons name="paper-plane-outline" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
            <Animated.View
              style={[styles.scorePosition, styles.scorePositionRight, { top: scoreTop }]}
            >
              <Animated.Text
                style={{
                  fontWeight: '700',
                  color: competitorB.color,
                  fontSize: scoreFontSize,
                  lineHeight: scoreLineHeight,
                }}
              >
                {scoreB}
              </Animated.Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.inlineNameClip,
                styles.inlineNameClipRight,
                {
                  top: inlineNameClipTop,
                  opacity: inlineNameOpacity,
                  transform: [{ translateY: inlineNameTranslateY }],
                },
              ]}
            >
              <View style={[styles.nameRow, styles.nameRowRight]}>
                <Text style={[typography.callout, { color: colors.textSecondary }]}>
                  {competitorB.name}
                </Text>
                {isPending && shareHandler && (
                  <TouchableOpacity
                    onPress={shareHandler}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ marginLeft: spacing.xxs }}
                  >
                    <Ionicons name="paper-plane-outline" size={14} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      );
    }
    return (
      <View style={[styles.column, styles.rightColumn]}>
        <Animated.View
          style={[
            styles.contentWrapper,
            { height: contentWrapperHeight, marginTop: contentWrapperMarginTop },
          ]}
        >
          <Animated.View
            style={[
              styles.nameClip,
              {
                top: 0,
                height: NAME_LINE_HEIGHT,
                opacity: stackedNameOpacity,
                transform: [{ translateY: stackedNameTranslateY }],
              },
            ]}
          >
            <View style={[styles.nameRow, styles.nameRowRight]}>
              <Text style={[typography.callout, { color: colors.textSecondary }]}>
                Housemate
              </Text>
            </View>
          </Animated.View>
          <Animated.View
            style={[
              styles.scorePosition,
              styles.scorePositionRight,
              { top: scoreTop, opacity: expandedInviteOpacity },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor: colors.primary + '15',
                  marginTop: spacing.xxs,
                },
              ]}
              onPress={onInvitePress}
              activeOpacity={0.7}
              accessibilityLabel="Add housemate"
              accessibilityRole="button"
            >
              <Ionicons name="person-add-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </Animated.View>
          {/* Collapsed state: "Housemate" label + add button (no overflow clip) */}
          <Animated.View
            style={[
              styles.collapsedInviteRow,
              {
                top: 0,
                opacity: inlineNameOpacity,
                transform: [{ translateY: inlineNameTranslateY }],
              },
            ]}
          >
            <Text style={[typography.callout, { color: colors.textSecondary, marginRight: spacing.xs }]}>
              Housemate
            </Text>
            <TouchableOpacity
              style={[
                styles.collapsedAddButton,
                { backgroundColor: colors.primary + '15' },
              ]}
              onPress={onInvitePress}
              activeOpacity={0.7}
              accessibilityLabel="Add housemate"
              accessibilityRole="button"
            >
              <Ionicons name="person-add-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.wrapper, { height: wrapperHeight }]}>
      <View style={styles.cardCenter}>
        <Animated.View
          style={[
            styles.card,
            {
              height: cardHeight,
              backgroundColor: colors.surface,
              borderRadius: radius.large,
              padding: spacing.sm,
              borderBottomWidth: collapsedBorderWidth,
              borderBottomColor: colors.background,
            },
          ]}
        >
          <Animated.View style={[styles.row, { height: rowHeight }]}>
            {/* Left column: content wrapper (76→44) centered in column */}
            <TouchableOpacity
              style={[styles.column, styles.leftColumn]}
              activeOpacity={onCompetitorPress ? 0.7 : 1}
              onPress={onCompetitorPress ? () => onCompetitorPress(competitorA.id) : undefined}
              accessibilityLabel={`${competitorA.name}, score ${scoreA}`}
              accessibilityRole="button"
            >
              <Animated.View
                style={[
                  styles.contentWrapper,
                  { height: contentWrapperHeight, marginTop: contentWrapperMarginTop },
                ]}
              >
                <Animated.View
                  style={[
                    styles.nameClip,
                    {
                      top: 0,
                      height: NAME_LINE_HEIGHT,
                      opacity: stackedNameOpacity,
                      transform: [{ translateY: stackedNameTranslateY }],
                    },
                  ]}
                >
                  <Text style={[typography.callout, { color: colors.textSecondary }]}>
                    {competitorA.name}
                  </Text>
                </Animated.View>
                <Animated.View
                  style={[styles.scorePosition, { top: scoreTop }]}
                >
                  <Animated.Text
                    style={{
                      fontWeight: '700',
                      color: competitorA.color,
                      fontSize: scoreFontSize,
                      lineHeight: scoreLineHeight,
                    }}
                  >
                    {scoreA}
                  </Animated.Text>
                </Animated.View>
                <Animated.View
                  style={[
                    styles.inlineNameClip,
                    {
                      top: inlineNameClipTop,
                      opacity: inlineNameOpacity,
                      transform: [{ translateY: inlineNameTranslateY }],
                    },
                  ]}
                >
                  <Text style={[typography.callout, { color: colors.textSecondary }]}>
                    {competitorA.name}
                  </Text>
                </Animated.View>
              </Animated.View>
            </TouchableOpacity>

            {/* Center spacer: room for prize circle (circle is sibling of cardCenter, not in row) */}
            <View style={styles.centerSpacer} />

            {/* Right column */}
            {renderRightColumn()}
          </Animated.View>
        </Animated.View>
      </View>

      {/* Prize circle: sibling of cardCenter, positioned relative to wrapper for bulge */}
      <AnimatedTouchableOpacity
        activeOpacity={0.7}
        onPress={onPrizePress}
        accessibilityLabel={hasPrize ? 'Edit prize' : 'Set a prize'}
        accessibilityRole="button"
        style={[
          styles.prizeCircle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: Animated.divide(circleSize, 2),
            borderWidth: circleBorderWidth,
            backgroundColor: colors.surface,
            borderColor: colors.background,
            marginLeft: Animated.multiply(Animated.divide(circleSize, 2), -1),
            marginTop: Animated.multiply(Animated.divide(circleSize, 2), -1),
          },
        ]}
      >
        {/* Trophy icon (always visible, scales down when collapsed) */}
        <Animated.View style={{ transform: [{ scale: trophyScale }] }}>
          <Ionicons name="trophy-outline" size={TROPHY_EXPANDED} color={colors.prize} />
        </Animated.View>

        {/* Prize text or empty state — fades out when collapsed */}
        <Animated.View
          style={{
            opacity: prizeTextOpacity,
            maxHeight: prizeTextMaxHeight,
            overflow: 'hidden',
            marginTop: 2,
            alignItems: 'center',
          }}
          pointerEvents="none"
        >
          {hasPrize ? (
            <Text
              style={[
                typography.callout,
                {
                  color: colors.textSecondary,
                  textAlign: 'center',
                  paddingHorizontal: spacing.xs,
                },
              ]}
              numberOfLines={3}
            >
              {prize}
            </Text>
          ) : (
            <>
              <Text
                style={[
                  typography.callout,
                  {
                    color: colors.textSecondary,
                    textAlign: 'center',
                    paddingHorizontal: spacing.xs,
                  },
                ]}
              >
                Winner gets...
              </Text>
              <View
                style={[
                  styles.addButton,
                  {
                    backgroundColor: colors.primary + '15',
                    marginTop: spacing.xxs,
                  },
                ]}
              >
                <Ionicons name="add" size={24} color={colors.primary} />
              </View>
            </>
          )}
        </Animated.View>
      </AnimatedTouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'visible',
    justifyContent: 'center',
  },
  cardCenter: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'visible',
  },
  card: {
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  contentWrapper: {
    position: 'relative',
    width: '100%',
  },
  centerSpacer: {
    minWidth: PRIZE_CIRCLE_EXPANDED,
  },
  leftColumn: {
    alignItems: 'flex-start',
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
  nameClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    overflow: 'hidden',
  },
  inlineNameClip: {
    position: 'absolute',
    left: SCORE_INLINE_LEFT,
    top: 0,
    height: NAME_LINE_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  inlineNameClipRight: {
    left: undefined,
    right: SCORE_INLINE_LEFT,
    alignItems: 'flex-end',
  },
  scorePosition: {
    position: 'absolute',
    left: 0,
  },
  scorePositionRight: {
    left: undefined,
    right: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameRowRight: {
    justifyContent: 'flex-end',
  },
  prizeCircle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  addButton: {
    width: ADD_BUTTON_SIZE,
    height: ADD_BUTTON_SIZE,
    borderRadius: ADD_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedInviteRow: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT_COLLAPSED,
    justifyContent: 'flex-end',
  },
  collapsedAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MorphingScoreboard;
