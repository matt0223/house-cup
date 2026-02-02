import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { Card } from '../ui/Card';
import { Competitor, isPendingCompetitor } from '../../domain/models/Competitor';

export interface MiniScoreboardProps {
  /** First competitor (always present) */
  competitorA: Competitor;
  /** Second competitor (optional - may not have joined yet) */
  competitorB?: Competitor;
  /** Score for first competitor */
  scoreA: number;
  /** Score for second competitor */
  scoreB: number;
  /** Callback when invite button is pressed */
  onInvitePress?: () => void;
}

// Constants for the mini scoreboard
const MINI_CIRCLE_SIZE = 60;
const MINI_CIRCLE_BORDER_WIDTH = 3;

/**
 * Compact scoreboard for collapsed state.
 * 
 * Layout:
 * - Left: Score + Name (e.g., "0 Matt")
 * - Center: Small trophy circle (icon only)
 * - Right: Name + Score OR "+ Add" button
 */
export function MiniScoreboard({
  competitorA,
  competitorB,
  scoreA,
  scoreB,
  onInvitePress,
}: MiniScoreboardProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const renderRightSection = () => {
    if (competitorB) {
      const isPending = isPendingCompetitor(competitorB);
      
      // Show competitor B: Name (with paper-plane if pending) + Score
      return (
        <View style={styles.rightSection}>
          <View style={styles.nameWithIcon}>
            <Text style={[typography.callout, { color: colors.textSecondary }]}>
              {competitorB.name}
            </Text>
            {isPending && onInvitePress && (
              <TouchableOpacity
                onPress={onInvitePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ marginLeft: spacing.xxs }}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={14}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.miniScore, { color: competitorB.color }]}>
            {scoreB}
          </Text>
        </View>
      );
    }

    // Fallback: Show invite button: "+ Add"
    return (
      <TouchableOpacity
        style={[
          styles.miniInviteButton,
          {
            backgroundColor: colors.primary + '15',
            borderRadius: radius.pill,
          },
        ]}
        onPress={onInvitePress}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={[typography.callout, { color: colors.primary }]}>
          Add
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Card
      style={{
        overflow: 'visible',
        borderBottomWidth: 3,
        borderBottomColor: colors.background,
      }}
      hasShadow={false}
    >
      <View style={styles.container}>
        {/* Left section: Score + Name */}
        <View style={styles.leftSection}>
          <Text style={[styles.miniScore, { color: competitorA.color }]}>
            {scoreA}
          </Text>
          <Text style={[typography.callout, { color: colors.textSecondary }]}>
            {competitorA.name}
          </Text>
        </View>

        {/* Center: Mini trophy circle */}
        <View
          style={[
            styles.miniCircle,
            {
              width: MINI_CIRCLE_SIZE,
              height: MINI_CIRCLE_SIZE,
              borderRadius: MINI_CIRCLE_SIZE / 2,
              backgroundColor: colors.surface,
              borderWidth: MINI_CIRCLE_BORDER_WIDTH,
              borderColor: colors.background,
            },
          ]}
        >
          <Ionicons name="trophy-outline" size={20} color={colors.prize} />
        </View>

        {/* Right section: Name + Score OR Invite */}
        {renderRightSection()}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniScore: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  miniCircle: {
    position: 'absolute',
    left: '50%',
    marginLeft: -(MINI_CIRCLE_SIZE / 2),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  miniInviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

export default MiniScoreboard;
