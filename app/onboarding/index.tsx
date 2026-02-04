import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/useTheme';
import { Button, AppleSignInButton } from '../../src/components/ui';
import { useAppleAuth } from '../../src/hooks/useAppleAuth';
import { useFirebase } from '../../src/providers/FirebaseProvider';

/**
 * Onboarding welcome screen.
 * Entry point for new users - choose to create or join a household.
 */
export default function OnboardingWelcomeScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const { householdId, recoverHousehold } = useFirebase();
  const {
    isAvailable: isAppleAvailable,
    isLoading: isAppleLoading,
    error: appleError,
    signIn: signInWithApple,
  } = useAppleAuth();

  const [showAppleSignIn, setShowAppleSignIn] = useState(false);

  // Handle Apple sign-in for returning users
  const handleAppleSignIn = async () => {
    const success = await signInWithApple();
    if (success) {
      // Try to recover the household for this user
      const recovered = await recoverHousehold();
      if (!recovered) {
        Alert.alert(
          'No Household Found',
          'No household was found linked to this Apple ID. You may need to create a new household or join with a code.',
          [{ text: 'OK' }]
        );
      }
      // If recovered, the app will redirect automatically when householdId is set
    }
  };

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

          {/* Apple Sign In for returning users */}
          {isAppleAvailable && (
            <View style={styles.recoverySection}>
              {!showAppleSignIn ? (
                <TouchableOpacity
                  onPress={() => setShowAppleSignIn(true)}
                  style={styles.joinLink}
                >
                  <Text style={[typography.callout, { color: colors.textSecondary }]}>
                    Already have an account?
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: '100%', gap: spacing.sm }}>
                  <Text
                    style={[
                      typography.callout,
                      { color: colors.textSecondary, textAlign: 'center' },
                    ]}
                  >
                    Sign in to restore your household
                  </Text>
                  {appleError && (
                    <Text
                      style={[
                        typography.callout,
                        { color: colors.error, textAlign: 'center' },
                      ]}
                    >
                      {appleError}
                    </Text>
                  )}
                  {isAppleLoading ? (
                    <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text
                        style={[
                          typography.callout,
                          { color: colors.textSecondary, marginTop: spacing.xs },
                        ]}
                      >
                        Signing in...
                      </Text>
                    </View>
                  ) : (
                    <AppleSignInButton
                      onPress={handleAppleSignIn}
                      mode="sign-in"
                    />
                  )}
                  <TouchableOpacity
                    onPress={() => setShowAppleSignIn(false)}
                    style={styles.joinLink}
                  >
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
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
  recoverySection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
});
