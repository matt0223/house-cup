import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../ui/Button';
import { Challenge } from '../../domain/models/Challenge';
import { Competitor } from '../../domain/models/Competitor';
import { WeekNarrative } from '../../domain/services/narrativeService';

export interface WeekCelebrationProps {
  /** The completed challenge */
  challenge: Challenge;
  /** Competitors in the household */
  competitors: Competitor[];
  /** Scores for each competitor (index matches competitors array) */
  scoreA: number;
  scoreB: number;
  /** Generated narrative for this week */
  narrative: WeekNarrative;
  /** Called when user taps "View Insights" */
  onViewInsights: () => void;
  /** Called when user taps "Continue" */
  onDismiss: () => void;
}

/**
 * Full-screen celebration overlay shown when a challenge week completes.
 *
 * Uses the app's existing design system — no gradients, no confetti.
 * Premium feel from spring animation on trophy, staggered text fade-in,
 * and generous whitespace.
 */
export function WeekCelebration({
  challenge,
  competitors,
  scoreA,
  scoreB,
  narrative,
  onViewInsights,
  onDismiss,
}: WeekCelebrationProps) {
  const { colors, spacing, typography } = useTheme();

  const compA = competitors[0];
  const compB = competitors[1];
  const winner = challenge.winnerId
    ? competitors.find((c) => c.id === challenge.winnerId) ?? null
    : null;

  // Animation values
  const trophyScale = useRef(new Animated.Value(0.8)).current;
  const trophyOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const narrativeOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      // Trophy: spring scale + fade in
      Animated.parallel([
        Animated.spring(trophyScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(trophyOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // Title fade in
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Result line fade in
      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Narrative fade in
      Animated.timing(narrativeOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Buttons fade in
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Build score display
  const highScore = Math.max(scoreA, scoreB);
  const lowScore = Math.min(scoreA, scoreB);

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Trophy */}
        <Animated.View
          style={[
            styles.trophyContainer,
            {
              opacity: trophyOpacity,
              transform: [{ scale: trophyScale }],
            },
          ]}
        >
          <Ionicons name="trophy" size={64} color={colors.prize} />
        </Animated.View>

        {/* "Week Complete" */}
        <Animated.Text
          style={[
            typography.headline,
            {
              color: colors.textPrimary,
              marginTop: spacing.lg,
              opacity: titleOpacity,
              textAlign: 'center',
            },
          ]}
        >
          Week Complete
        </Animated.Text>

        {/* Winner / tie line */}
        <Animated.View
          style={[
            styles.resultRow,
            { marginTop: spacing.sm, opacity: resultOpacity },
          ]}
        >
          {challenge.isTie ? (
            <Text style={[typography.body, { color: colors.textPrimary, textAlign: 'center' }]}>
              It's a tie! You both earned{' '}
              <Text style={{ fontWeight: '600' }}>{challenge.prize}</Text>
            </Text>
          ) : winner ? (
            <Text style={[typography.body, { color: colors.textPrimary, textAlign: 'center' }]}>
              <Text style={{ color: winner.color, fontWeight: '600' }}>
                {winner.name}
              </Text>
              {' '}earned{' '}
              <Text style={{ fontWeight: '600' }}>{challenge.prize}</Text>
            </Text>
          ) : null}
        </Animated.View>

        {/* Score */}
        <Animated.Text
          style={[
            typography.callout,
            {
              color: colors.textSecondary,
              marginTop: spacing.xxs,
              opacity: resultOpacity,
              textAlign: 'center',
            },
          ]}
        >
          {highScore} – {lowScore}
        </Animated.Text>

        {/* Narrative */}
        <Animated.Text
          style={[
            typography.callout,
            {
              color: colors.textSecondary,
              marginTop: spacing.lg,
              opacity: narrativeOpacity,
              textAlign: 'center',
              paddingHorizontal: spacing.lg,
            },
          ]}
        >
          {narrative.body}
        </Animated.Text>
      </View>

      {/* Buttons */}
      <Animated.View
        style={[
          styles.buttons,
          {
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xl,
            opacity: buttonsOpacity,
          },
        ]}
      >
        <Button
          label="View Insights"
          onPress={onViewInsights}
          fullWidth
          variant="primary"
        />
        <View style={{ height: spacing.xs }} />
        <Button
          label="Continue"
          onPress={onDismiss}
          fullWidth
          variant="ghost"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  trophyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultRow: {
    alignItems: 'center',
  },
  buttons: {
    width: '100%',
  },
});

export default WeekCelebration;
