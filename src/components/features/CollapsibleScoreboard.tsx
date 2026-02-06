import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { MorphingScoreboard } from './MorphingScoreboard';
import { Competitor } from '../../domain/models/Competitor';

export interface CollapsibleScoreboardProps {
  /** Animated scroll Y value from ScrollView */
  scrollY: Animated.Value;
  competitorA: Competitor;
  competitorB?: Competitor;
  scoreA: number;
  scoreB: number;
  prize: string;
  onInvitePress?: () => void;
}

/**
 * Collapsible scoreboard that morphs between expanded and collapsed states
 * based on scroll position. Uses a single component tree so the transition
 * is a seamless transform (shrink/expand, move into place) rather than a fade.
 */
export function CollapsibleScoreboard({
  scrollY,
  competitorA,
  competitorB,
  scoreA,
  scoreB,
  prize,
  onInvitePress,
}: CollapsibleScoreboardProps) {
  const { spacing } = useTheme();

  return (
    <View style={[styles.wrapper, { paddingHorizontal: spacing.sm, paddingTop: spacing.xxs }]}>
      <MorphingScoreboard
        scrollY={scrollY}
        competitorA={competitorA}
        competitorB={competitorB}
        scoreA={scoreA}
        scoreB={scoreB}
        prize={prize}
        onInvitePress={onInvitePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
  },
});

export default CollapsibleScoreboard;
