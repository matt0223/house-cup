import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

export type IconButtonSize = 'small' | 'medium' | 'large';

export interface IconButtonProps {
  /** Icon name (Ionicons) */
  icon: keyof typeof Ionicons.glyphMap;
  /** Called when button is pressed */
  onPress: () => void;
  /** Button size */
  size?: IconButtonSize;
  /** Icon color (defaults to textSecondary) */
  color?: string;
  /** Disable the button */
  isDisabled?: boolean;
  /** Additional style */
  style?: ViewStyle;
  /** Accessibility label */
  accessibilityLabel?: string;
}

const SIZE_CONFIG = {
  small: { iconSize: 16, hitArea: 32 },
  medium: { iconSize: 20, hitArea: 44 },
  large: { iconSize: 24, hitArea: 48 },
} as const;

/**
 * A tappable icon button with consistent sizing and hit areas.
 * Used in headers, toolbars, and throughout the app.
 */
export function IconButton({
  icon,
  onPress,
  size = 'medium',
  color,
  isDisabled = false,
  style,
  accessibilityLabel,
}: IconButtonProps) {
  const { colors } = useTheme();

  const config = SIZE_CONFIG[size];
  const iconColor = color ?? colors.textSecondary;
  const effectiveColor = isDisabled ? iconColor + '66' : iconColor; // 40% opacity when disabled

  const containerStyle: ViewStyle = {
    width: config.hitArea,
    height: config.hitArea,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.6}
      style={[containerStyle, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Ionicons
        name={icon}
        size={config.iconSize}
        color={effectiveColor}
      />
    </TouchableOpacity>
  );
}

export default IconButton;
