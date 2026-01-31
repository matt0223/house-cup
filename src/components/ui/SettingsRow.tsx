import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

export interface SettingsRowProps {
  /** Row label */
  label: string;
  /** Optional description text */
  description?: string;
  /** Value to display on the right (for display-only rows) */
  value?: string;
  /** Whether this row is tappable */
  onPress?: () => void;
  /** For toggle rows */
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  /** Custom right element */
  rightElement?: ReactNode;
  /** Whether this row is disabled */
  disabled?: boolean;
  /** Show divider below */
  showDivider?: boolean;
  /** Icon name (Ionicons) */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icon color */
  iconColor?: string;
  /** Override label text color */
  labelColor?: string;
}

/**
 * A single row in a settings section.
 * Supports tappable rows, toggle switches, and display-only values.
 */
export function SettingsRow({
  label,
  description,
  value,
  onPress,
  toggleValue,
  onToggleChange,
  rightElement,
  disabled = false,
  showDivider = true,
  icon,
  iconColor,
  labelColor,
}: SettingsRowProps) {
  const { colors, typography, spacing } = useTheme();

  const isToggle = toggleValue !== undefined && onToggleChange;
  const isTappable = onPress && !disabled;

  const content = (
    <View
      style={[
        styles.container,
        { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
      ]}
    >
      <View style={styles.leftSection}>
        {icon && (
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: iconColor || colors.primary,
                marginRight: spacing.xs,
              },
            ]}
          >
            <Ionicons name={icon} size={18} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.labelContainer}>
          <Text
            style={[
              typography.body,
              {
                color: labelColor ?? (disabled ? colors.textSecondary : colors.textPrimary),
              },
            ]}
          >
            {label}
          </Text>
          {description && (
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginTop: 2 },
              ]}
            >
              {description}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        {rightElement}
        {value && !rightElement && (
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginRight: spacing.xxs },
            ]}
          >
            {value}
          </Text>
        )}
        {isToggle && (
          <Switch
            value={toggleValue}
            onValueChange={onToggleChange}
            disabled={disabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        )}
        {isTappable && !isToggle && !rightElement && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        )}
        {disabled && !isToggle && (
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, fontStyle: 'italic' },
            ]}
          >
            Coming soon
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <>
      {isTappable ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
      {showDivider && (
        <View
          style={[
            styles.divider,
            {
              backgroundColor: colors.divider,
              marginLeft: icon ? spacing.sm + 32 + spacing.xs : spacing.sm,
            },
          ]}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});

export default SettingsRow;
