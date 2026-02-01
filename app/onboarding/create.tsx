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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/useTheme';
import { Button, ColorPicker, OnboardingHeader } from '../../src/components/ui';
import { availableCompetitorColors } from '../../src/domain/models/Competitor';
import { useFirebase } from '../../src/providers/FirebaseProvider';

/**
 * Onboarding create flow.
 * 3-step wizard: You → Housemate → Prize
 */
export default function OnboardingCreateScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { createHousehold } = useFirebase();

  // Step state
  const [step, setStep] = useState(1);

  // Form state
  const [yourName, setYourName] = useState('');
  const [yourColor, setYourColor] = useState(availableCompetitorColors[2].hex); // Teal
  const [housemateName, setHousemateName] = useState('');
  const [housemateColor, setHousemateColor] = useState(availableCompetitorColors[0].hex); // Purple
  const [prize, setPrize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (step < 3) {
      animateStepChange(step + 1);
      // Focus next input after animation
      setTimeout(() => {
        if (step === 1) housemateInputRef.current?.focus();
        if (step === 2) prizeInputRef.current?.focus();
      }, 200);
    }
  };

  const handleCreate = async () => {
    Keyboard.dismiss();
    setIsSubmitting(true);
    setError(null);

    try {
      const finalPrize = prize.trim() || 'Winner picks dinner!';
      await createHousehold(
        yourName.trim(),
        yourColor,
        housemateName.trim(),
        housemateColor,
        finalPrize
      );
      // Navigate to home
      router.replace('/');
    } catch (err) {
      console.error('Failed to create household:', err);
      setError('Something went wrong. Try again.');
      setIsSubmitting(false);
    }
  };

  const canContinueStep1 = yourName.trim().length > 0;
  const canContinueStep2 = housemateName.trim().length > 0;

  const renderStep1 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.lg }]}>
        First, you
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
      <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.lg }]}>
        Now, your housemate
      </Text>

      <View style={[styles.inputContainer, { marginBottom: spacing.lg }]}>
        <Text style={[typography.callout, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Their name
        </Text>
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
          placeholder="Enter their name"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => canContinueStep2 && handleContinue()}
        />
      </View>

      <View style={{ marginBottom: spacing.xl }}>
        <Text style={[typography.callout, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          Their color
        </Text>
        <ColorPicker
          selectedColor={housemateColor}
          onColorSelect={setHousemateColor}
          unavailableColors={[yourColor]}
        />
      </View>

      <Button
        label="Continue"
        onPress={handleContinue}
        fullWidth
        isDisabled={!canContinueStep2}
      />
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        The prize
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
        What does the weekly winner get?
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
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <OnboardingHeader
        onBack={handleBack}
        currentStep={step}
        totalSteps={3}
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
          {step === 3 && renderStep3()}
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
});
