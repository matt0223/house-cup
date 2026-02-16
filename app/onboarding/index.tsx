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
import { useHouseholdStore } from '../../src/store/useHouseholdStore';
import {
  trackOnboardingStarted,
  trackAppleSignInStarted,
  trackAppleSignInCompleted,
  trackAppleSignInFailed,
  trackJoinCodeEntered,
  trackHouseholdCreated,
  trackScreenViewed,
} from '../../src/services/analytics';

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

  // Track screen view on mount
  React.useEffect(() => {
    trackScreenViewed({ 'screen name': 'onboarding' });
    trackOnboardingStarted({ 'entry point': 'fresh install' });
  }, []);

  // Handle Apple sign-in (primary action)
  const handleAppleSignIn = async () => {
    // Clear any stale state
    if (householdId) {
      setHouseholdId(null);
    }
    clearAppleError?.();
    setViewState('signing-in');
    
    trackAppleSignInStarted({ flow: 'create' });

    // signIn returns givenName on success, null on failure/cancel
    const appleGivenName = await signInWithApple();
    if (appleGivenName !== null) {
      // Try to recover existing household
      const recovered = await recoverHousehold();
      if (recovered) {
        // Returning user - go to main app
        trackAppleSignInCompleted({ flow: 'create', 'is returning user': true, 'had existing household': true });
        router.replace('/');
      } else {
        // New user — auto-create household with Apple name + default color
        trackAppleSignInCompleted({ flow: 'create', 'is returning user': false, 'had existing household': false });
        try {
          const name = appleGivenName || 'You';
          const defaultColor = availableCompetitorColors[0].hex; // Purple
          const defaultPrize = '';
          await createHousehold(name, defaultColor, undefined, undefined, defaultPrize);
          const createdHousehold = useHouseholdStore.getState().household;
          trackHouseholdCreated({
            'household id': createdHousehold?.id ?? '',
            'competitor name': name,
            'competitor color': defaultColor,
          });
          router.replace('/');
        } catch (err) {
          console.error('Failed to auto-create household:', err);
          // Fall back to welcome so user can retry
          setViewState('welcome');
        }
      }
    } else {
      // Sign-in failed or cancelled
      trackAppleSignInFailed({ flow: 'create', reason: appleError || 'cancelled' });
      setViewState('welcome');
    }
  };

  // Navigate to join flow screen
  const handleJoinCodePress = () => {
    trackJoinCodeEntered();
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
