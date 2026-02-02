import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { Button, ColorPicker, OnboardingHeader } from '../../src/components/ui';
import { useFirebase } from '../../src/providers/FirebaseProvider';
import { availableCompetitorColors } from '../../src/domain/models/Competitor';
import { findHouseholdByJoinCode } from '../../src/services/firebase';
import { useStepAnimation } from '../../src/hooks';

/**
 * Onboarding join screen.
 * 2-step flow:
 *   Step 1: Enter 6-character code
 *   Step 2: Set up your profile (name pre-filled from invite, pick color)
 */
export default function OnboardingJoinScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { joinHousehold } = useFirebase();

  // Step state
  const [step, setStep] = useState(1);

  // Step 1: Code entry
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Step 2: Profile setup
  const [yourName, setYourName] = useState('');
  const [yourColor, setYourColor] = useState(availableCompetitorColors[0].hex); // Purple
  const [existingCompetitorColor, setExistingCompetitorColor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);

  // Animation for step transitions
  const { fadeAnim, animateStepChange } = useStepAnimation();

  const goToStep = (newStep: number) => {
    animateStepChange(() => setStep(newStep));
  };

  const handleCodeChange = (text: string) => {
    // Only allow alphanumeric, uppercase, max 6 chars
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(cleaned);
    setCodeError(null);
  };

  const handleBack = () => {
    if (step === 1) {
      router.back();
    } else {
      goToStep(1);
    }
  };

  const handleValidateCode = async () => {
    if (code.length !== 6) return;

    Keyboard.dismiss();
    setIsValidating(true);
    setCodeError(null);

    try {
      // Validate the code by looking up the household
      const household = await findHouseholdByJoinCode(code.toUpperCase());
      
      if (!household) {
        setCodeError("That code didn't work. Double-check with your housemate.");
        setIsValidating(false);
        return;
      }

      // Check if household is full
      if (household.competitors.length >= 2) {
        setCodeError("This household already has two members.");
        setIsValidating(false);
        return;
      }

      // Pre-fill name from pending invite if available
      if (household.pendingHousemateName) {
        setYourName(household.pendingHousemateName);
      }

      // Store existing competitor's color so we can exclude it
      if (household.competitors[0]) {
        setExistingCompetitorColor(household.competitors[0].color);
        // If our default color matches theirs, pick a different one
        if (household.competitors[0].color === yourColor) {
          const altColor = availableCompetitorColors.find(
            (c) => c.hex !== household.competitors[0].color
          );
          if (altColor) {
            setYourColor(altColor.hex);
          }
        }
      }

      // Move to profile setup
      setIsValidating(false);
      goToStep(2);
      
      // Focus name input after animation
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 200);
    } catch (err) {
      console.error('Failed to validate code:', err);
      setCodeError("Something went wrong. Try again.");
      setIsValidating(false);
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
        Set up your profile
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
        Almost there! Just a few details.
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
        />
      </View>

      <View style={{ marginBottom: spacing.xl }}>
        <Text style={[typography.callout, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          Pick your color
        </Text>
        <ColorPicker
          selectedColor={yourColor}
          onColorSelect={setYourColor}
          unavailableColors={existingCompetitorColor ? [existingCompetitorColor] : []}
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
        currentStep={step}
        totalSteps={2}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
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
