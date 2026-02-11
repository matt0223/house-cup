import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { Button, OnboardingHeader, AppleSignInButton } from '../../src/components/ui';
import { useFirebase } from '../../src/providers/FirebaseProvider';
import { useAppleAuth } from '../../src/hooks/useAppleAuth';
import { isPendingCompetitor, availableCompetitorColors } from '../../src/domain/models/Competitor';
import { findHouseholdByJoinCode } from '../../src/services/firebase';

/**
 * Onboarding join screen.
 * Single-screen flow: Enter code → Continue (triggers Apple Sign-In + validate + join).
 * If code is invalid after sign-in, shows error with fallback to create a new household.
 *
 * Code validation is deferred until after authentication because Firestore
 * security rules require an authenticated user to query households.
 */
export default function OnboardingJoinScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { joinHousehold, createHousehold } = useFirebase();
  const {
    isLoading: isAppleLoading,
    error: appleError,
    signIn: signInWithApple,
  } = useAppleAuth();

  // Code entry
  const [code, setCode] = useState(params.code?.toUpperCase() || '');

  // Flow state
  const [status, setStatus] = useState<'idle' | 'signing-in' | 'joining' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [appleGivenNameRef, setAppleGivenNameRef] = useState<string | undefined>(undefined);

  const inputRef = useRef<TextInput>(null);

  // Validate code and join household (called after authentication)
  const validateAndJoin = async (codeToJoin: string, appleGivenName?: string) => {
    setStatus('joining');
    setError(null);

    try {
      const household = await findHouseholdByJoinCode(codeToJoin.toUpperCase());

      if (!household) {
        setError("That code didn't work. Double-check with your housemate.");
        setStatus('error');
        return;
      }

      const pendingCompetitor = household.competitors.find(isPendingCompetitor);

      if (!pendingCompetitor) {
        const joinedCount = household.competitors.filter(c => c.userId).length;
        if (joinedCount >= 2) {
          setError("This household already has two members.");
        } else {
          setError("No pending invite found for this household.");
        }
        setStatus('error');
        return;
      }

      // Use Apple givenName if available, otherwise fall back to invite placeholder name
      const name = appleGivenName || pendingCompetitor.name || 'You';
      const color = pendingCompetitor.color;

      await joinHousehold(codeToJoin.toUpperCase(), name, color);
      router.replace('/');
    } catch (err) {
      console.error('Failed to validate/join:', err);
      // Always show a friendly message — never expose raw Firebase errors
      setError("That code didn't work. Double-check with your housemate and try again.");
      setStatus('error');
    }
  };

  const handleCodeChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(cleaned);
    if (error) {
      setError(null);
      setStatus('idle');
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Continue = Apple Sign-In → validate → join (all in one tap)
  const handleContinue = async () => {
    if (code.length !== 6) return;
    Keyboard.dismiss();
    setStatus('signing-in');
    setError(null);

    const appleGivenName = await signInWithApple();
    if (appleGivenName !== null) {
      setAppleGivenNameRef(appleGivenName || undefined);
      await validateAndJoin(code, appleGivenName || undefined);
    } else {
      // Sign-in cancelled
      setStatus('idle');
    }
  };

  // Fallback: create a new household instead
  const handleCreateHousehold = async () => {
    setStatus('joining');
    setError(null);

    try {
      const name = appleGivenNameRef || 'You';
      const defaultColor = availableCompetitorColors[0].hex;
      await createHousehold(name, defaultColor, undefined, undefined, '');
      router.replace('/');
    } catch (err) {
      console.error('Failed to create household:', err);
      setError('Failed to create household. Try again.');
      setStatus('error');
    }
  };

  const canContinue = code.length === 6;
  const isBusy = status === 'signing-in' || status === 'joining';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <OnboardingHeader
        onBack={handleBack}
        currentStep={1}
        totalSteps={1}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {isBusy ? (
          // Loading state while signing in or joining
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
              {status === 'signing-in' ? 'Signing in...' : 'Joining household...'}
            </Text>
          </View>
        ) : (
          <View style={[styles.content, { paddingHorizontal: spacing.lg }]}>
            <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
              Join your household
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
              Enter the 6-character code{'\n'}from your housemate.
            </Text>

            <View style={[styles.codeInputContainer, { marginBottom: spacing.lg }]}>
              <TextInput
                ref={inputRef}
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
                value={code}
                onChangeText={handleCodeChange}
                placeholder="ABC123"
                placeholderTextColor={colors.textSecondary + '66'}
                autoFocus={!params.code}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={() => canContinue && handleContinue()}
                maxFontSizeMultiplier={1.2}
              />
            </View>

            {(error || appleError) && (
              <Text
                style={[
                  typography.callout,
                  { color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
                ]}
              >
                {error || appleError}
              </Text>
            )}

            <View style={{ gap: spacing.sm }}>
              <Button
                label="Continue"
                onPress={handleContinue}
                fullWidth
                isDisabled={!canContinue}
              />

              {status === 'error' && (
                <Button
                  label="Start a new household instead"
                  onPress={handleCreateHousehold}
                  variant="secondary"
                  fullWidth
                />
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
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
    paddingTop: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
