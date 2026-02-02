import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { Card } from '../ui/Card';
import { Competitor } from '../../domain/models/Competitor';

export interface ScoreboardCardProps {
  /** First competitor (always present) */
  competitorA: Competitor;
  /** Second competitor (optional - may not have joined yet) */
  competitorB?: Competitor;
  /** Score for first competitor */
  scoreA: number;
  /** Score for second competitor */
  scoreB: number;
  /** Prize text */
  prize: string;
  /** Name of pending housemate (for invite button text) */
  pendingHousemateName?: string;
  /** Callback when invite button is pressed */
  onInvitePress?: () => void;
}

// Constants for the prize circle
const PRIZE_CIRCLE_SIZE = 140;
const PRIZE_CIRCLE_BORDER_WIDTH = 4;

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
  pendingHousemateName,
  onInvitePress,
}: ScoreboardCardProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const renderRightColumn = () => {
    if (competitorB) {
      // Show competitor B's score - mirrors left column structure
      return (
        <View style={[styles.competitorColumn, styles.rightColumn]}>
          <Text style={[typography.callout, { color: colors.textSecondary }]}>
            {competitorB.name}
          </Text>
          <Text style={[typography.display, { color: competitorB.color }]}>
            {scoreB}
          </Text>
        </View>
      );
    }

    // Show "Housemate" label + circular invite button - mirrors left column structure
    return (
      <View style={[styles.competitorColumn, styles.rightColumn]}>
        <Text style={[typography.callout, { color: colors.textSecondary }]}>
          Housemate
        </Text>
        <TouchableOpacity
          style={[
            styles.inviteButton,
            {
              backgroundColor: colors.primary + '15',
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: radius.pill,
              flexDirection: 'row',
              gap: spacing.xxxs,
              marginTop: spacing.xxs,
            },
          ]}
          onPress={onInvitePress}
          activeOpacity={0.7}
        >
          <Ionicons
            name="person-add-outline"
            size={20}
            color={colors.primary}
          />
          <Text style={[typography.callout, { color: colors.primary }]}>
            Add
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      {/* The card with left and right columns */}
      <Card style={{ overflow: 'visible' }} hasShadow={false}>
        <View style={styles.columnsContainer}>
          {/* Left column: Competitor A */}
          <View style={[styles.competitorColumn, styles.leftColumn]}>
            <Text style={[typography.callout, { color: colors.textSecondary }]}>
              {competitorA.name}
            </Text>
            <Text style={[typography.display, { color: competitorA.color }]}>
              {scoreA}
            </Text>
          </View>

          {/* Center spacer - leaves room for the floating prize circle */}
          <View style={styles.centerSpacer} />

          {/* Right column: Competitor B or Invite button */}
          {renderRightColumn()}
        </View>
      </Card>

      {/* Floating prize circle - absolutely positioned in center */}
      <View
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
      >
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  columnsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 60,
  },
  competitorColumn: {
    justifyContent: 'center',
  },
  leftColumn: {
    alignItems: 'flex-start',
  },
  rightColumn: {
    alignItems: 'flex-end',
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
  inviteButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScoreboardCard;
