import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { ScoreboardCard } from './ScoreboardCard';
import { MiniScoreboard } from './MiniScoreboard';
import { Competitor } from '../../domain/models/Competitor';

export interface CollapsibleScoreboardProps {
  /** Animated scroll Y value from ScrollView */
  scrollY: Animated.Value;
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

// Animation constants
const EXPANDED_HEIGHT = 140;
const COLLAPSED_HEIGHT = 76; // Card padding (16*2) + container height (44)
const COLLAPSE_THRESHOLD = 60; // Scroll distance to fully collapse

/**
 * Collapsible scoreboard that animates between expanded and collapsed states
 * based on scroll position.
 * 
 * - Expanded: Full ScoreboardCard with prize circle and prize text
 * - Collapsed: Compact MiniScoreboard with just scores and trophy icon
 */
export function CollapsibleScoreboard({
  scrollY,
  competitorA,
  competitorB,
  scoreA,
  scoreB,
  prize,
  pendingHousemateName,
  onInvitePress,
}: CollapsibleScoreboardProps) {
  const { spacing } = useTheme();

  // Interpolate container height
  const containerHeight = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD],
    outputRange: [EXPANDED_HEIGHT, COLLAPSED_HEIGHT],
    extrapolate: 'clamp',
  });

  // Expanded content fades out during first half of scroll
  const expandedOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_THRESHOLD * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Collapsed content fades in during second half of scroll
  const collapsedOpacity = scrollY.interpolate({
    inputRange: [COLLAPSE_THRESHOLD * 0.5, COLLAPSE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Scale for pointer events - when opacity is 0, disable touch
  const expandedPointerEvents = expandedOpacity.interpolate({
    inputRange: [0, 0.5],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.wrapper, { paddingHorizontal: spacing.sm, paddingTop: spacing.xxs }]}>
      <Animated.View style={[styles.container, { height: containerHeight }]}>
        {/* Expanded ScoreboardCard */}
        <Animated.View
          style={[
            styles.layer,
            { opacity: expandedOpacity },
          ]}
          pointerEvents={expandedPointerEvents.__getValue() > 0.5 ? 'auto' : 'none'}
        >
          <ScoreboardCard
            competitorA={competitorA}
            competitorB={competitorB}
            scoreA={scoreA}
            scoreB={scoreB}
            prize={prize}
            pendingHousemateName={pendingHousemateName}
            onInvitePress={onInvitePress}
          />
        </Animated.View>

        {/* Collapsed MiniScoreboard */}
        <Animated.View
          style={[
            styles.layer,
            styles.collapsedLayer,
            { opacity: collapsedOpacity },
          ]}
          pointerEvents={collapsedOpacity.__getValue() > 0.5 ? 'auto' : 'none'}
        >
          <MiniScoreboard
            competitorA={competitorA}
            competitorB={competitorB}
            scoreA={scoreA}
            scoreB={scoreB}
            onInvitePress={onInvitePress}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
  },
  container: {
    position: 'relative',
    overflow: 'visible',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  collapsedLayer: {
    // Align collapsed content at bottom of container
    top: undefined,
    bottom: 0,
  },
});

export default CollapsibleScoreboard;
