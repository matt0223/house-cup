import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/useTheme';
import { AppHeader } from '../../src/components/ui';

/**
 * History screen - Shows past challenges and winners.
 */
export default function HistoryScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="History" />

      <View style={styles.emptyState}>
        <View style={[styles.illustration, { backgroundColor: colors.prize + '20' }]}>
          <Ionicons name="trophy-outline" size={64} color={colors.prize} />
        </View>
        <Text style={[typography.headline, { color: colors.textPrimary, marginTop: spacing.lg }]}>
          No completed challenges yet
        </Text>
        <Text style={[typography.callout, { color: colors.textSecondary, marginTop: spacing.xxs, textAlign: 'center' }]}>
          Complete your first week to see results here
        </Text>
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
