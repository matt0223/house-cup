import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { Button, ColorPicker, OnboardingHeader, AppleSignInButton } from '../../src/components/ui';
import { useFirebase } from '../../src/providers/FirebaseProvider';
import { useAppleAuth } from '../../src/hooks/useAppleAuth';
import { availableCompetitorColors, isPendingCompetitor } from '../../src/domain/models/Competitor';
import { findHouseholdByJoinCode } from '../../src/services/firebase';
import { useStepAnimation } from '../../src/hooks';
import { Household } from '../../src/domain/models/Household';

/**
 * Onboarding join screen.
 * Flow:
 *   Step 1: Enter 6-character code (skipped if code passed via param)
 *   Step 2: Sign in with Apple (if not already signed in)
 *   Step 3: Set up your profile (name pre-filled from invite, pick color)
 */
export default function OnboardingJoinScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { joinHousehold, userId } = useFirebase();
  const {
    isLoading: isAppleLoading,
    error: appleError,
    signIn: signInWithApple,
  } = useAppleAuth();

  // Step state - start at step 1 unless code is provided
  const [step, setStep] = useState(1);
  const [isInitializing, setIsInitializing] = useState(!!params.code);

  // Step 1: Code entry
  const [code, setCode] = useState(params.code || '');
  const [isValidating, setIsValidating] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Validated household data
  const [validatedHousehold, setValidatedHousehold] = useState<Household | null>(null);

  // Step 3: Profile setup
  const [yourName, setYourName] = useState('');
  const [yourColor, setYourColor] = useState(availableCompetitorColors[0].hex);
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [inviterColor, setInviterColor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);

  // Animation for step transitions
  const { fadeAnim, animateStepChange } = useStepAnimation();

  // If code is passed via param, validate it immediately
  useEffect(() => {
    if (params.code && params.code.length === 6) {
      validateCode(params.code);
    }
  }, [params.code]);

  const goToStep = (newStep: number) => {
    animateStepChange(() => setStep(newStep));
  };

  const validateCode = async (codeToValidate: string) => {
    setIsValidating(true);
    setIsInitializing(true);
    setCodeError(null);

    try {
      const household = await findHouseholdByJoinCode(codeToValidate.toUpperCase());
      
      if (!household) {
        setCodeError("That code didn't work. Double-check with your housemate.");
        setIsValidating(false);
        setIsInitializing(false);
        setStep(1);
        return;
      }

      const pendingCompetitor = household.competitors.find(isPendingCompetitor);
      
      if (!pendingCompetitor) {
        const joinedCount = household.competitors.filter(c => c.userId).length;
        if (joinedCount >= 2) {
          setCodeError("This household already has two members.");
        } else {
          setCodeError("No pending invite found for this household.");
        }
        setIsValidating(false);
        setIsInitializing(false);
        setStep(1);
        return;
      }

      // Store validated household data
      setValidatedHousehold(household);
      setCode(codeToValidate.toUpperCase());

      // Find the inviter
      const inviter = household.competitors.find(c => c.userId);
      if (inviter) {
        setInviterName(inviter.name);
        setInviterColor(inviter.color);
      }

      // Pre-fill name and color from pending competitor
      setYourName(pendingCompetitor.name);
      setYourColor(pendingCompetitor.color);

      setIsValidating(false);
      setIsInitializing(false);

      // If already signed in, go straight to profile
      // Otherwise, go to Apple sign-in step
      if (userId) {
        goToStep(3);
        setTimeout(() => nameInputRef.current?.focus(), 200);
      } else {
        goToStep(2);
      }
    } catch (err) {
      console.error('Failed to validate code:', err);
      setCodeError("Something went wrong. Try again.");
      setIsValidating(false);
      setIsInitializing(false);
      setStep(1);
    }
  };

  const handleCodeChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(cleaned);
    setCodeError(null);
  };

  const handleBack = () => {
    if (step === 1) {
      router.back();
    } else if (step === 2) {
      // Go back to code entry
      goToStep(1);
    } else {
      // Go back to sign-in (or code if already signed in)
      goToStep(userId ? 1 : 2);
    }
  };

  const handleValidateCode = async () => {
    if (code.length !== 6) return;
    Keyboard.dismiss();
    await validateCode(code);
  };

  const handleAppleSignIn = async () => {
    const success = await signInWithApple();
    if (success) {
      // Move to profile setup
      goToStep(3);
      setTimeout(() => nameInputRef.current?.focus(), 200);
    }
  };

  const handleJoin = async () => {
    if (yourName.trim().length === 0) return;

    Keyboard.dismiss();
    setIsSubmitting(true);
    setError(null);

    try {
      await joinHousehold(code, yourName.trim(), yourColor);
      router.replace('/');
    } catch (err) {
      console.error('Failed to join household:', err);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setIsSubmitting(false);
    }
  };

  const canValidate = code.length === 6;
  const canJoin = yourName.trim().length > 0;

  // Determine total steps based on auth state
  const totalSteps = userId ? 2 : 3; // Skip sign-in step if already authed
  const displayStep = userId ? (step === 3 ? 2 : step) : step;

  // Show loading while initializing with code param
  if (isInitializing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Validating code...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderStep1 = () => (
    <Animated.View style={[styles.content, { opacity: fadeAnim, paddingHorizontal: spacing.lg }]}>
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
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={() => canValidate && handleValidateCode()}
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
        onPress={handleValidateCode}
        fullWidth
        isDisabled={!canValidate}
        isLoading={isValidating}
      />
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View style={[styles.content, { opacity: fadeAnim, paddingHorizontal: spacing.lg }]}>
      <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        Sign in to continue
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
        {inviterName 
          ? `Sign in with Apple to join ${inviterName}'s household.`
          : 'Sign in with Apple to join this household.'}
      </Text>

      {appleError && (
        <Text
          style={[
            typography.callout,
            { color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
          ]}
        >
          {appleError}
        </Text>
      )}

      {isAppleLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Signing in...
          </Text>
        </View>
      ) : (
        <AppleSignInButton
          onPress={handleAppleSignIn}
          mode="sign-in"
        />
      )}
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View style={[styles.content, { opacity: fadeAnim, paddingHorizontal: spacing.lg }]}>
      <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        Welcome!
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
        {inviterName ? `${inviterName} invited you to join their household.` : 'Almost there! Just a few details.'}
      </Text>

      <View style={[styles.inputContainer, { marginBottom: spacing.lg }]}>
        <Text style={[typography.callout, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Your name
        </Text>
        <TextInput
          ref={nameInputRef}
          style={[
            styles.input,
            typography.body,
            {
              backgroundColor: colors.surface,
              color: colors.textPrimary,
              borderRadius: radius.medium,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              letterSpacing: 0,
            },
          ]}
          value={yourName}
          onChangeText={setYourName}
          placeholder="Enter your name"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => canJoin && handleJoin()}
          maxFontSizeMultiplier={1.2}
        />
      </View>

      <View style={{ marginBottom: spacing.xl }}>
        <Text style={[typography.callout, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          Pick your color
        </Text>
        <ColorPicker
          selectedColor={yourColor}
          onColorSelect={setYourColor}
          unavailableColors={inviterColor ? [inviterColor] : []}
        />
      </View>

      {error && (
        <Text
          style={[
            typography.callout,
            { color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
          ]}
        >
          {error}
        </Text>
      )}

      <Button
        label="Join Household"
        onPress={handleJoin}
        fullWidth
        isDisabled={!canJoin}
        isLoading={isSubmitting}
      />
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <OnboardingHeader 
        onBack={handleBack}
        currentStep={displayStep}
        totalSteps={totalSteps}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
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
  inputContainer: {},
  input: {
    minHeight: 48,
  },
});
