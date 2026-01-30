import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/useTheme';
import { AppHeader, Button } from '../../src/components/ui';

/**
 * Recurring screen - Manage recurring task templates.
 */
export default function RecurringScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Recurring" />

      <View style={styles.emptyState}>
        <View style={[styles.illustration, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="repeat-outline" size={64} color={colors.primary} />
        </View>
        <Text style={[typography.headline, { color: colors.textPrimary, marginTop: spacing.lg }]}>
          No recurring tasks yet
        </Text>
        <Text style={[typography.callout, { color: colors.textSecondary, marginTop: spacing.xxs, textAlign: 'center' }]}>
          Create routines that automatically appear each day
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button
            label="Create routine"
            icon="add"
            onPress={() => console.log('Create routine')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
