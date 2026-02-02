import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Keyboard,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/useTheme';
import { Button, ColorPicker, OnboardingHeader } from '../../src/components/ui';
import { availableCompetitorColors } from '../../src/domain/models/Competitor';
import { useFirebase } from '../../src/providers/FirebaseProvider';
import { shareHouseholdInvite } from '../../src/utils/shareInvite';

/**
 * Onboarding create flow.
 * 2-step wizard:
 *   Step 1: Your name + color
 *   Step 2: Invite housemate (optional) + Prize
 */
export default function OnboardingCreateScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { createHousehold } = useFirebase();

  // Step state
  const [step, setStep] = useState(1);

  // Form state - Step 1: Your profile
  const [yourName, setYourName] = useState('');
  const [yourColor, setYourColor] = useState(availableCompetitorColors[2].hex); // Teal

  // Form state - Step 2: Invite + Prize
  const [housemateName, setHousemateName] = useState('');
  const [prize, setPrize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSharedInvite, setHasSharedInvite] = useState(false);

  // Refs for inputs
  const housemateInputRef = useRef<TextInput>(null);
  const prizeInputRef = useRef<TextInput>(null);

  // Animation for step transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateStepChange = (newStep: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setStep(newStep);
  };

  const handleBack = () => {
    if (step === 1) {
      router.back();
    } else {
      animateStepChange(step - 1);
    }
  };

  const handleContinue = () => {
    Keyboard.dismiss();
    if (step < 2) {
      animateStepChange(step + 1);
      // Focus housemate input after animation
      setTimeout(() => {
        housemateInputRef.current?.focus();
      }, 200);
    }
  };

  const handleShareInvite = async (joinCode: string) => {
    const shared = await shareHouseholdInvite(
      yourName.trim(),
      housemateName.trim() || undefined,
      joinCode
    );
    if (shared) {
      setHasSharedInvite(true);
    }
  };

  const handleCreate = async () => {
    Keyboard.dismiss();
    setIsSubmitting(true);
    setError(null);

    try {
      const finalPrize = prize.trim() || 'Winner picks dinner!';
      const pendingName = housemateName.trim() || undefined;
      
      // Create household with just your profile
      const joinCode = await createHousehold(
        yourName.trim(),
        yourColor,
        pendingName,
        finalPrize
      );

      // If user entered a housemate name but hasn't shared yet, prompt share
      if (pendingName && !hasSharedInvite && joinCode) {
        await handleShareInvite(joinCode);
      }

      // Navigate to home
      router.replace('/');
    } catch (err) {
      console.error('Failed to create household:', err);
      setError('Something went wrong. Try again.');
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    // Clear housemate name and create without invite
    setHousemateName('');
    Keyboard.dismiss();
    setIsSubmitting(true);
    setError(null);

    try {
      const finalPrize = prize.trim() || 'Winner picks dinner!';
      
      await createHousehold(
        yourName.trim(),
        yourColor,
        undefined, // No pending housemate
        finalPrize
      );

      router.replace('/');
    } catch (err) {
      console.error('Failed to create household:', err);
      setError('Something went wrong. Try again.');
      setIsSubmitting(false);
    }
  };

  const canContinueStep1 = yourName.trim().length > 0;

  const renderStep1 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.lg }]}>
        First, about you
      </Text>

      <View style={[styles.inputContainer, { marginBottom: spacing.lg }]}>
        <Text style={[typography.callout, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Your name
        </Text>
        <TextInput
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
          autoFocus
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => canContinueStep1 && handleContinue()}
        />
      </View>

      <View style={{ marginBottom: spacing.xl }}>
        <Text style={[typography.callout, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          Pick your color
        </Text>
        <ColorPicker
          selectedColor={yourColor}
          onColorSelect={setYourColor}
          unavailableColors={[]}
        />
      </View>

      <Button
        label="Continue"
        onPress={handleContinue}
        fullWidth
        isDisabled={!canContinueStep1}
      />
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      {/* Invite Section */}
      <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        Invite your housemate
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
        Enter their name for a personalized invite
      </Text>

      <View style={[styles.inputContainer, { marginBottom: spacing.xl }]}>
        <TextInput
          ref={housemateInputRef}
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
          value={housemateName}
          onChangeText={setHousemateName}
          placeholder="Their name (optional)"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => prizeInputRef.current?.focus()}
        />
      </View>

      {/* Prize Section */}
      <Text style={[typography.headline, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        Weekly prize
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
        What does the winner get?
      </Text>

      <View style={[styles.inputContainer, { marginBottom: spacing.xl }]}>
        <View style={[styles.prizeInputRow, { backgroundColor: colors.surface, borderRadius: radius.medium }]}>
          <Ionicons
            name="trophy"
            size={20}
            color={colors.prize}
            style={{ marginLeft: spacing.sm }}
          />
          <TextInput
            ref={prizeInputRef}
            style={[
              styles.prizeInput,
              typography.body,
              {
                color: colors.textPrimary,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              },
            ]}
            value={prize}
            onChangeText={setPrize}
            placeholder="Winner picks dinner!"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
        </View>
      </View>

      {error && (
        <Text style={[typography.callout, { color: colors.error, marginBottom: spacing.md, textAlign: 'center' }]}>
          {error}
        </Text>
      )}

      <Button
        label="Start Competing"
        onPress={handleCreate}
        fullWidth
        isLoading={isSubmitting}
      />

      {/* Skip link */}
      <TouchableOpacity
        onPress={handleSkip}
        style={styles.skipLink}
        disabled={isSubmitting}
      >
        <Text style={[typography.callout, { color: colors.textSecondary }]}>
          Skip for now
        </Text>
      </TouchableOpacity>
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 24,
    paddingBottom: 32,
  },
  stepContent: {
    flex: 1,
  },
  inputContainer: {},
  input: {
    minHeight: 48,
  },
  prizeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  prizeInput: {
    flex: 1,
    minHeight: 48,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
});
