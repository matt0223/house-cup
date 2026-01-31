import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export interface SettingsSectionProps {
  /** Section title */
  title: string;
  /** Section content (SettingsRow components) */
  children: ReactNode;
}

/**
 * A section container for settings with a title header.
 */
export function SettingsSection({ title, children }: SettingsSectionProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={styles.container}>
      <Text
        style={[
          typography.caption,
          {
            color: colors.textSecondary,
            marginBottom: spacing.xxs,
            marginLeft: spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          },
        ]}
      >
        {title}
      </Text>
      <View
        style={[
          styles.content,
          {
            backgroundColor: colors.surface,
            borderRadius: 12,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  content: {
    overflow: 'hidden',
  },
});

export default SettingsSection;
