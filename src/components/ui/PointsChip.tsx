import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { Competitor, getCompetitorInitial } from '../../domain/models/Competitor';

export interface PointsChipProps {
  /** The competitor this chip represents */
  competitor: Competitor;
  /** Current points (0-3) */
  points: number;
  /** Called when chip is tapped */
  onPress: () => void;
  /** Chip size */
  size?: 'small' | 'medium';
  /** Disable interaction */
  isDisabled?: boolean;
}

const SIZE_CONFIG = {
  small: { chip: 36, dot: 4, dotSpacing: 2 },
  medium: { chip: 44, dot: 5, dotSpacing: 3 },
} as const;

/**
 * A circular points indicator chip with competitor initial and dot states.
 *
 * Visual states:
 * - 0 points: Outline only, initial centered
 * - 1 point: Filled background, initial + ●○○
 * - 2 points: Filled background, initial + ●●○
 * - 3 points: Filled background, initial + ●●●
 */
export function PointsChip({
  competitor,
  points,
  onPress,
  size = 'medium',
  isDisabled = false,
}: PointsChipProps) {
  const { typography } = useTheme();

  const config = SIZE_CONFIG[size];
  const normalizedPoints = Math.max(0, Math.min(3, points));
  const hasPoints = normalizedPoints > 0;
  const initial = getCompetitorInitial(competitor);

  const backgroundColor = hasPoints ? competitor.color : 'transparent';
  const borderColor = competitor.color;
  const textColor = hasPoints ? '#FFFFFF' : competitor.color;

  const containerStyle: ViewStyle = {
    width: config.chip,
    height: config.chip,
    borderRadius: config.chip / 2,
    backgroundColor,
    borderWidth: hasPoints ? 0 : 2,
    borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={containerStyle}
      accessibilityLabel={`${competitor.name}: ${normalizedPoints} points`}
      accessibilityRole="button"
    >
      <View style={styles.content}>
        <Text
          style={[
            typography.caption,
            { color: textColor, fontWeight: '600', marginBottom: hasPoints ? 1 : 0 },
          ]}
        >
          {initial}
        </Text>

        {hasPoints && (
          <View style={[styles.dotsContainer, { gap: config.dotSpacing }]}>
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: config.dot,
                    height: config.dot,
                    backgroundColor:
                      index < normalizedPoints
                        ? '#FFFFFF'
                        : 'rgba(255, 255, 255, 0.4)',
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    borderRadius: 999,
  },
});

export default PointsChip;
