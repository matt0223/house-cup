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
import { AppleSignInButton } from '../../src/components/ui';
import { useAppleAuth } from '../../src/hooks/useAppleAuth';
import { useFirebase } from '../../src/providers/FirebaseProvider';
import {
  trackOnboardingStarted,
  trackAppleSignInStarted,
  trackAppleSignInCompleted,
  trackAppleSignInFailed,
  trackScreenViewed,
} from '../../src/services/analytics';

type ViewState = 'welcome' | 'signing-in';

/**
 * Onboarding welcome screen.
 *
 * Single CTA: Continue with Apple. After sign-in, recover an existing household
 * if one exists; otherwise route to /onboarding/setup where the user picks
 * between creating a new household or joining one with a 6-digit code.
 */
export default function OnboardingWelcomeScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const { householdId, recoverHousehold, setHouseholdId } = useFirebase();
  const {
    error: appleError,
    signIn: signInWithApple,
    clearError: clearAppleError,
  } = useAppleAuth();

  const [viewState, setViewState] = useState<ViewState>('welcome');

  React.useEffect(() => {
    trackScreenViewed({ 'screen name': 'onboarding' });
    trackOnboardingStarted({ 'entry point': 'fresh install' });
  }, []);

  const handleAppleSignIn = async () => {
    if (householdId) {
      setHouseholdId(null);
    }
    clearAppleError?.();
    setViewState('signing-in');

    trackAppleSignInStarted({ flow: 'create' });

    const appleGivenName = await signInWithApple();
    if (appleGivenName === null) {
      trackAppleSignInFailed({ flow: 'create', reason: appleError || 'cancelled' });
      setViewState('welcome');
      return;
    }

    const givenNameSurfaced = Boolean(appleGivenName);
    const recovered = await recoverHousehold();
    if (recovered) {
      trackAppleSignInCompleted({
        flow: 'create',
        'is returning user': true,
        'had existing household': true,
        'apple given name surfaced': givenNameSurfaced,
      });
      router.replace('/');
    } else {
      trackAppleSignInCompleted({
        flow: 'create',
        'is returning user': false,
        'had existing household': false,
        'apple given name surfaced': givenNameSurfaced,
      });
      router.replace({
        pathname: '/onboarding/setup',
        params: { givenName: appleGivenName || '' },
      });
    }
  };

  const renderWelcome = () => (
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
      </View>
    </View>
  );

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
  loadingContainer: {
    alignItems: 'center',
  },
});
