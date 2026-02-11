import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/useTheme';
import { Button, AppleSignInButton } from '../../src/components/ui';
import { useAppleAuth } from '../../src/hooks/useAppleAuth';
import { useFirebase } from '../../src/providers/FirebaseProvider';
import { availableCompetitorColors } from '../../src/domain/models/Competitor';

type ViewState = 'welcome' | 'signing-in';

/**
 * Onboarding welcome screen.
 * Zero-screen onboarding: Apple Sign-In → auto-create household → challenge page.
 * No wizard, no choice screen, no name/color form.
 */
export default function OnboardingWelcomeScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { householdId, recoverHousehold, setHouseholdId, createHousehold } = useFirebase();
  const {
    isLoading: isAppleLoading,
    error: appleError,
    signIn: signInWithApple,
    clearError: clearAppleError,
  } = useAppleAuth();

  // View state
  const [viewState, setViewState] = useState<ViewState>('welcome');

  // Handle Apple sign-in (primary action)
  const handleAppleSignIn = async () => {
    // Clear any stale state
    if (householdId) {
      setHouseholdId(null);
    }
    clearAppleError?.();
    setViewState('signing-in');
    
    // signIn returns givenName on success, null on failure/cancel
    const appleGivenName = await signInWithApple();
    if (appleGivenName !== null) {
      // Try to recover existing household
      const recovered = await recoverHousehold();
      if (recovered) {
        // Returning user - go to main app
        router.replace('/');
      } else {
        // New user — auto-create household with Apple name + default color
        try {
          const name = appleGivenName || 'You';
          const defaultColor = availableCompetitorColors[0].hex; // Purple
          const defaultPrize = '';
          await createHousehold(name, defaultColor, undefined, undefined, defaultPrize);
          router.replace('/');
        } catch (err) {
          console.error('Failed to auto-create household:', err);
          // Fall back to welcome so user can retry
          setViewState('welcome');
        }
      }
    } else {
      // Sign-in failed or cancelled
      setViewState('welcome');
    }
  };

  // Navigate to join flow screen
  const handleJoinCodePress = () => {
    router.push('/onboarding/join');
  };

  // Render the welcome view (primary)
  const renderWelcome = () => (
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
        <AppleSignInButton
          onPress={handleAppleSignIn}
          mode="continue"
        />
        
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

        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginHorizontal: spacing.sm }]}>
            or
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </View>

        <Button
          label="Enter a join code"
          onPress={handleJoinCodePress}
          variant="secondary"
          fullWidth
          style={{ height: 50 }}
        />
      </View>
    </View>
  );

  // Render signing-in state
  const renderSigningIn = () => (
    <View style={styles.content}>
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
      </View>
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginTop: spacing.md },
          ]}
        >
          Setting up...
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {viewState === 'welcome' && renderWelcome()}
      {viewState === 'signing-in' && renderSigningIn()}
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
    lineHeight: 40,
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 8,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  loadingContainer: {
    alignItems: 'center',
  },
});
