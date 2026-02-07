import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { IconButton } from './IconButton';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';

export interface HeaderAction {
  /** Icon name (Ionicons) */
  icon: keyof typeof Ionicons.glyphMap;
  /** Called when action is pressed */
  onPress: () => void;
  /** Accessibility label */
  accessibilityLabel?: string;
}

export interface AppHeaderProps {
  /** Header title */
  title: string;
  /** Optional subtitle displayed below the title */
  subtitle?: string;
  /** Optional left action (e.g., back button) */
  leftAction?: HeaderAction;
  /** Optional array of right-side actions */
  rightActions?: HeaderAction[];
  /** Additional style */
  style?: ViewStyle;
}

/**
 * App header component with title and optional right-side action buttons.
 * Matches the "House Cup" header design with bell and gear icons.
 */
export function AppHeader({
  title,
  subtitle,
  leftAction,
  rightActions = [],
  style,
}: AppHeaderProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.sm }, style]}>
      <View style={styles.leftSection}>
        {leftAction && (
          <IconButton
            icon={leftAction.icon}
            onPress={leftAction.onPress}
            accessibilityLabel={leftAction.accessibilityLabel}
          />
        )}
        <View>
          <Text style={[typography.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        {rightActions.map((action, index) => (
          <IconButton
            key={index}
            icon={action.icon}
            onPress={action.onPress}
            accessibilityLabel={action.accessibilityLabel}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AppHeader;
