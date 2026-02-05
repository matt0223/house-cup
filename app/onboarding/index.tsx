import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/useTheme';
import { Button, AppleSignInButton } from '../../src/components/ui';
import { useAppleAuth } from '../../src/hooks/useAppleAuth';
import { useFirebase } from '../../src/providers/FirebaseProvider';
import { findHouseholdByJoinCode } from '../../src/services/firebase';
import { isPendingCompetitor } from '../../src/domain/models/Competitor';

type ViewState = 'welcome' | 'signing-in' | 'choice' | 'join-code';

/**
 * Onboarding welcome screen.
 * Apple Sign-In first approach - identity before actions.
 */
export default function OnboardingWelcomeScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { householdId, recoverHousehold, setHouseholdId } = useFirebase();
  const {
    isLoading: isAppleLoading,
    error: appleError,
    signIn: signInWithApple,
    clearError: clearAppleError,
  } = useAppleAuth();

  // View state
  const [viewState, setViewState] = useState<ViewState>('welcome');
  
  // Join code state
  const [joinCode, setJoinCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  // Handle Apple sign-in (primary action)
  const handleAppleSignIn = async () => {
    // Clear any stale state
    if (householdId) {
      setHouseholdId(null);
    }
    clearAppleError?.();
    setViewState('signing-in');
    
    const success = await signInWithApple();
    if (success) {
      // Try to recover existing household
      const recovered = await recoverHousehold();
      if (recovered) {
        // Returning user - go to main app
        router.replace('/');
      } else {
        // New user - show create/join choice
        setViewState('choice');
      }
    } else {
      // Sign-in failed or cancelled
      setViewState('welcome');
    }
  };

  // Handle join code entry from welcome screen (before sign-in)
  const handleJoinCodePress = () => {
    setViewState('join-code');
    setJoinCode('');
    setCodeError(null);
  };

  // Handle code input change
  const handleCodeChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setJoinCode(cleaned);
    setCodeError(null);
  };

  // Validate code and proceed to Apple sign-in + join
  const handleValidateAndJoin = async () => {
    if (joinCode.length !== 6) return;

    Keyboard.dismiss();
    setIsValidatingCode(true);
    setCodeError(null);

    try {
      // First validate the code exists
      const household = await findHouseholdByJoinCode(joinCode);
      
      if (!household) {
        setCodeError("That code didn't work. Double-check with your housemate.");
        setIsValidatingCode(false);
        return;
      }

      // Check for pending invite
      const pendingCompetitor = household.competitors.find(isPendingCompetitor);
      if (!pendingCompetitor) {
        const joinedCount = household.competitors.filter(c => c.userId).length;
        if (joinedCount >= 2) {
          setCodeError("This household already has two members.");
        } else {
          setCodeError("No pending invite found for this household.");
        }
        setIsValidatingCode(false);
        return;
      }

      // Code is valid - navigate to join flow with the code
      setIsValidatingCode(false);
      router.push(`/onboarding/join?code=${joinCode}`);
    } catch (err) {
      console.error('Failed to validate code:', err);
      setCodeError("Something went wrong. Try again.");
      setIsValidatingCode(false);
    }
  };

  // Handle going back from sub-views
  const handleBack = () => {
    setViewState('welcome');
    setJoinCode('');
    setCodeError(null);
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

        <TouchableOpacity
          onPress={handleJoinCodePress}
          style={styles.joinLink}
        >
          <Text style={[typography.callout, { color: colors.primary }]}>
            Enter a join code
          </Text>
        </TouchableOpacity>
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
          Signing in...
        </Text>
      </View>
    </View>
  );

  // Render create/join choice (after sign-in, no household found)
  const renderChoice = () => (
    <View style={styles.content}>
      <View style={styles.hero}>
        <Ionicons
          name="checkmark-circle"
          size={56}
          color={colors.success}
          style={styles.icon}
        />
        <Text style={[typography.title, styles.title, { color: colors.textPrimary }]}>
          You're signed in!
        </Text>
        <Text
          style={[
            typography.body,
            styles.subtitle,
            { color: colors.textSecondary },
          ]}
        >
          Let's set up your household.
        </Text>
      </View>

      <View style={[styles.actions, { gap: spacing.md }]}>
        <Button
          label="Create a Household"
          onPress={() => router.push('/onboarding/create')}
          fullWidth
        />

        <Button
          label="Join with a Code"
          onPress={() => router.push('/onboarding/join')}
          variant="secondary"
          fullWidth
        />
      </View>
    </View>
  );

  // Render join code entry view
  const renderJoinCode = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoid}
    >
      <View style={styles.content}>
        {/* Back button */}
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backButton, { marginBottom: spacing.lg }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
          Join your household
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
          Enter the 6-character code{'\n'}from your housemate.
        </Text>

        <View style={[styles.codeInputContainer, { marginBottom: spacing.lg }]}>
          <TextInput
            style={[
              styles.codeInput,
              typography.title,
              {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                borderRadius: radius.medium,
                letterSpacing: 8,
              },
            ]}
            value={joinCode}
            onChangeText={handleCodeChange}
            placeholder="ABC123"
            placeholderTextColor={colors.textSecondary + '66'}
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={() => joinCode.length === 6 && handleValidateAndJoin()}
            maxFontSizeMultiplier={1.2}
          />
        </View>

        {codeError && (
          <Text
            style={[
              typography.callout,
              { color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
            ]}
          >
            {codeError}
          </Text>
        )}

        <Button
          label="Continue"
          onPress={handleValidateAndJoin}
          fullWidth
          isDisabled={joinCode.length !== 6}
          isLoading={isValidatingCode}
        />
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {viewState === 'welcome' && renderWelcome()}
      {viewState === 'signing-in' && renderSigningIn()}
      {viewState === 'choice' && renderChoice()}
      {viewState === 'join-code' && renderJoinCode()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
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
  joinLink: {
    paddingVertical: 12,
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
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 8,
  },
  codeInputContainer: {
    alignItems: 'center',
  },
  codeInput: {
    width: '100%',
    height: 56,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
  },
});
