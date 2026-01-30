import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

export interface ButtonProps {
  /** Button label text */
  label: string;
  /** Called when button is pressed */
  onPress: () => void;
  /** Optional leading icon name (Ionicons) */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Show loading spinner */
  isLoading?: boolean;
  /** Disable the button */
  isDisabled?: boolean;
  /** Make button full width */
  fullWidth?: boolean;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Additional style */
  style?: ViewStyle;
}

/**
 * Primary call-to-action button.
 * Coral background, white text, pill shape.
 */
export function Button({
  label,
  onPress,
  icon,
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
  variant = 'primary',
  style,
}: ButtonProps) {
  const { colors, spacing, typography, radius } = useTheme();

  const disabled = isDisabled || isLoading;

  const getBackgroundColor = () => {
    if (disabled) {
      return variant === 'primary' 
        ? colors.primary + '80' // 50% opacity
        : 'transparent';
    }
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.surface;
      case 'ghost':
        return 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) {
      return variant === 'primary' ? '#FFFFFF' : colors.textSecondary;
    }
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
      case 'ghost':
        return colors.primary;
    }
  };

  const getBorderStyle = (): ViewStyle => {
    if (variant === 'secondary') {
      return {
        borderWidth: 1,
        borderColor: disabled ? colors.border : colors.primary,
      };
    }
    return {};
  };

  const containerStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    ...(fullWidth && { width: '100%' }),
    ...getBorderStyle(),
  };

  const textStyle: TextStyle = {
    ...typography.button,
    color: getTextColor(),
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[containerStyle, style]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={getTextColor()}
            />
          )}
          <Text style={textStyle}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export default Button;
