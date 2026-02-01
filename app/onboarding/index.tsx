import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/useTheme';
import { Button } from '../../src/components/ui';

/**
 * Onboarding welcome screen.
 * Entry point for new users - choose to create or join a household.
 */
export default function OnboardingWelcomeScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Hero section */}
        <View style={styles.hero}>
          <Ionicons
            name="trophy"
            size={56}
            color={colors.prize}
            style={styles.icon}
          />
          <Text style={[typography.title, styles.title, { color: colors.textPrimary }]}>
            House Cup
          </Text>
          <Text
            style={[
              typography.body,
              styles.subtitle,
              { color: colors.textSecondary },
            ]}
          >
            Track chores together.{'\n'}Compete for the week.
          </Text>
        </View>

        {/* Actions */}
        <View style={[styles.actions, { gap: spacing.md }]}>
          <Button
            label="Get Started"
            onPress={() => router.push('/onboarding/create')}
            fullWidth
          />

          <TouchableOpacity
            onPress={() => router.push('/onboarding/join')}
            style={styles.joinLink}
          >
            <Text style={[typography.callout, { color: colors.textSecondary }]}>
              Have a join code?
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40, // Ensure enough vertical space for capital letters
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    alignItems: 'center',
  },
  joinLink: {
    paddingVertical: 8,
  },
});
