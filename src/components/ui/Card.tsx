import React, { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export type CardPadding = 'none' | 'compact' | 'standard' | 'spacious';

export interface CardProps {
  /** Card content */
  children: ReactNode;
  /** Padding inside the card */
  padding?: CardPadding;
  /** Show shadow */
  hasShadow?: boolean;
  /** Additional style */
  style?: ViewStyle;
}

const PADDING_VALUES: Record<CardPadding, number> = {
  none: 0,
  compact: 12,
  standard: 16,
  spacious: 24,
};

/**
 * A container card with consistent styling, shadow, and corner radius.
 * Used for grouping related content throughout the app.
 */
export function Card({
  children,
  padding = 'standard',
  hasShadow = true,
  style,
}: CardProps) {
  const { colors, radius, shadows } = useTheme();

  const containerStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    padding: PADDING_VALUES[padding],
    overflow: 'hidden',
    ...(hasShadow ? shadows.card : {}),
  };

  return (
    <View style={[containerStyle, style]}>
      {children}
    </View>
  );
}

export default Card;
