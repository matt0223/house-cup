import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { Card } from '../ui/Card';
import { Competitor, isPendingCompetitor } from '../../domain/models/Competitor';

export interface ScoreboardCardProps {
  /** First competitor (always present) */
  competitorA: Competitor;
  /** Second competitor (optional - may not exist yet) */
  competitorB?: Competitor;
  /** Score for first competitor */
  scoreA: number;
  /** Score for second competitor */
  scoreB: number;
  /** Prize text */
  prize: string;
  /** Callback when add-housemate button is pressed (no competitor B yet) */
  onInvitePress?: () => void;
  /** Callback when share-invite button is pressed (pending competitor B) — opens native share */
  onShareInvitePress?: () => void;
  /** Callback when prize circle is pressed */
  onPrizePress?: () => void;
  /** Callback when competitor name or score is pressed (opens competitor sheet) */
  onCompetitorPress?: (competitorId: string) => void;
}

// Constants for the prize circle
const PRIZE_CIRCLE_SIZE = 150;
const PRIZE_CIRCLE_BORDER_WIDTH = 4;
/** Size of the small circular add buttons (prize + housemate) */
const ADD_BUTTON_SIZE = 44;

/**
 * Card displaying the weekly scoreboard with both competitors' scores
 * and the current prize in a floating center circle.
 *
 * Layout:
 * - Left column: Competitor A name + score
 * - Center: Floating prize circle (extends beyond card)
 * - Right column: Competitor B name + score OR "Housemate" + invite button
 */
export function ScoreboardCard({
  competitorA,
  competitorB,
  scoreA,
  scoreB,
  prize,
  onInvitePress,
  onShareInvitePress,
  onPrizePress,
  onCompetitorPress,
}: ScoreboardCardProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const renderRightColumn = () => {
    if (competitorB) {
      const isPending = isPendingCompetitor(competitorB);
      
      // Show competitor B's name + score; name/score tappable for sheet, paper-plane for share only
      return (
        <View style={[styles.competitorColumn, styles.rightColumn]}>
          <View style={styles.nameRow}>
            {onCompetitorPress ? (
              <TouchableOpacity
                onPress={() => onCompetitorPress(competitorB.id)}
                activeOpacity={0.7}
                accessibilityLabel={competitorB.name}
                accessibilityRole="button"
              >
                <Text style={[typography.callout, { color: colors.textSecondary }]}>
                  {competitorB.name}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[typography.callout, { color: colors.textSecondary }]}>
                {competitorB.name}
              </Text>
            )}
            {isPending && (onShareInvitePress ?? onInvitePress) && (
              <TouchableOpacity
                onPress={onShareInvitePress ?? onInvitePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ marginLeft: spacing.xxs }}
                accessibilityLabel="Send invite"
                accessibilityRole="button"
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={16}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
          {onCompetitorPress ? (
            <TouchableOpacity
              onPress={() => onCompetitorPress(competitorB.id)}
              activeOpacity={0.7}
              accessibilityLabel={`Score ${scoreB}`}
              accessibilityRole="button"
            >
              <Text style={[typography.display, { color: competitorB.color }]}>
                {scoreB}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[typography.display, { color: competitorB.color }]}>
              {scoreB}
            </Text>
          )}
        </View>
      );
    }

    // Fallback: No competitor B at all - "Housemate" and add button both open Add Housemate sheet
    return (
      <View style={[styles.competitorColumn, styles.rightColumn]}>
        <TouchableOpacity
          onPress={onInvitePress}
          activeOpacity={0.7}
          accessibilityLabel="Add housemate"
          accessibilityRole="button"
        >
          <Text style={[typography.callout, { color: colors.textSecondary }]}>
            Housemate
          </Text>
        </TouchableOpacity>
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
          <Ionicons
            name="person-add-outline"
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const hasPrize = !!prize && prize.length > 0;

  return (
    <View style={styles.wrapper}>
      {/* The card with left and right columns */}
      <Card style={{ overflow: 'visible' }} hasShadow={false}>
        <View style={styles.columnsContainer}>
          {/* Left column: Competitor A (tappable name + score) */}
          <View style={[styles.competitorColumn, styles.leftColumn]}>
            {onCompetitorPress ? (
              <TouchableOpacity
                onPress={() => onCompetitorPress(competitorA.id)}
                activeOpacity={0.7}
                style={styles.competitorTouchable}
                accessibilityLabel={`${competitorA.name}, score ${scoreA}`}
                accessibilityRole="button"
              >
                <Text style={[typography.callout, { color: colors.textSecondary }]}>
                  {competitorA.name}
                </Text>
                <Text style={[typography.display, { color: competitorA.color }]}>
                  {scoreA}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={[typography.callout, { color: colors.textSecondary }]}>
                  {competitorA.name}
                </Text>
                <Text style={[typography.display, { color: competitorA.color }]}>
                  {scoreA}
                </Text>
              </>
            )}
          </View>

          {/* Center spacer - leaves room for the floating prize circle */}
          <View style={styles.centerSpacer} />

          {/* Right column: Competitor B or Invite button */}
          {renderRightColumn()}
        </View>
      </Card>

      {/* Floating prize circle - absolutely positioned in center */}
      <TouchableOpacity
        style={[
          styles.prizeCircle,
          {
            width: PRIZE_CIRCLE_SIZE,
            height: PRIZE_CIRCLE_SIZE,
            borderRadius: PRIZE_CIRCLE_SIZE / 2,
            backgroundColor: colors.surface,
            borderWidth: PRIZE_CIRCLE_BORDER_WIDTH,
            borderColor: colors.background,
          },
        ]}
        onPress={onPrizePress}
        activeOpacity={0.7}
        accessibilityLabel={hasPrize ? 'Edit prize' : 'Set a prize'}
        accessibilityRole="button"
      >
        {hasPrize ? (
          <>
            <Ionicons
              name="trophy-outline"
              size={24}
              color={colors.prize}
            />
            <Text
              style={[
                typography.callout,
                {
                  color: colors.textSecondary,
                  marginTop: spacing.xxs,
                  textAlign: 'center',
                  paddingHorizontal: spacing.xs,
                },
              ]}
              numberOfLines={3}
            >
              {prize}
            </Text>
          </>
        ) : (
          <>
            <Ionicons
              name="trophy-outline"
              size={22}
              color={colors.prize}
            />
            <Text
              style={[
                typography.callout,
                {
                  color: colors.textSecondary,
                  textAlign: 'center',
                  paddingHorizontal: spacing.xs,
                  marginTop: spacing.xxxs,
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
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'visible',
    // Just enough margin for the circle protrusion above the card.
    // Card is ~92px tall, circle center is at ~46px, so protrusion = radius - 46.
    marginTop: PRIZE_CIRCLE_SIZE / 2 - 44,
  },
  columnsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 60,
  },
  competitorColumn: {
    justifyContent: 'center',
  },
  competitorTouchable: {
    alignItems: 'flex-start',
  },
  leftColumn: {
    alignItems: 'flex-start',
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerSpacer: {
    flex: 1,
    // Leave space for the floating circle
    minWidth: PRIZE_CIRCLE_SIZE - 20,
  },
  prizeCircle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -(PRIZE_CIRCLE_SIZE / 2),
    marginTop: -(PRIZE_CIRCLE_SIZE / 2),
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
});

export default ScoreboardCard;
