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
import { useHouseholdStore } from '../../src/store';
import { shareHouseholdInvite } from '../../src/utils/shareInvite';
import { updateHousehold } from '../../src/services/firebase/householdService';
import { useStepAnimation } from '../../src/hooks';
import { isPendingCompetitor } from '../../src/domain/models/Competitor';

/**
 * Onboarding create flow.
 * 3-step wizard:
 *   Step 1: Your name + color
 *   Step 2: Housemate name + Send invite
 *   Step 3: Prize
 */
export default function OnboardingCreateScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { createHousehold, householdId, markInviteSent } = useFirebase();

  // Step state
  const [step, setStep] = useState(1);

  // Form state - Step 1: Your profile
  const [yourName, setYourName] = useState('');
  const [yourColor, setYourColor] = useState(availableCompetitorColors[2].hex); // Teal

  // Form state - Step 2: Housemate invite
  const [housemateName, setHousemateName] = useState('');
  const [housemateColor, setHousemateColor] = useState(availableCompetitorColors[0].hex); // Purple (different from default teal)
  const [hasSharedInvite, setHasSharedInvite] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [storedJoinCode, setStoredJoinCode] = useState<string | null>(null);
  const [householdCreated, setHouseholdCreated] = useState(false);

  // Form state - Step 3: Prize
  const [prize, setPrize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for inputs
  const housemateInputRef = useRef<TextInput>(null);
  const prizeInputRef = useRef<TextInput>(null);

  // Animation for step transitions
  const { fadeAnim, animateStepChange } = useStepAnimation();

  const goToStep = (newStep: number) => {
    animateStepChange(() => setStep(newStep));
  };

  const handleBack = () => {
    if (step === 1) {
      router.back();
    } else {
      goToStep(step - 1);
    }
  };

  const handleContinue = () => {
    Keyboard.dismiss();
    if (step < 3) {
      goToStep(step + 1);
      // Focus appropriate input after animation
      setTimeout(() => {
        if (step === 1) {
          housemateInputRef.current?.focus();
        } else if (step === 2) {
          prizeInputRef.current?.focus();
        }
      }, 200);
    }
  };

  const handleSendInvite = async () => {
    Keyboard.dismiss();
    setIsSendingInvite(true);
    setError(null);

    try {
      let joinCode = storedJoinCode;

      // Create household if not already created
      if (!householdCreated) {
        const pendingName = housemateName.trim() || undefined;
        const pendingColor = pendingName ? housemateColor : undefined;
        joinCode = await createHousehold(
          yourName.trim(),
          yourColor,
          pendingName,
          pendingColor,
          'Winner picks dinner!' // Default prize, will be updated in Step 3
        );
        if (joinCode) {
          setStoredJoinCode(joinCode);
          setHouseholdCreated(true);
        }
      }

      // Share the invite
      if (joinCode) {
        const shared = await shareHouseholdInvite(
          yourName.trim(),
          housemateName.trim() || undefined,
          joinCode
        );
        if (shared) {
          setHasSharedInvite(true);
          
          // Mark the pending competitor as invited
          const household = useHouseholdStore.getState().household;
          const pendingCompetitor = household?.competitors.find(isPendingCompetitor);
          if (pendingCompetitor) {
            await markInviteSent(pendingCompetitor.id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to send invite:', err);
      setError('Something went wrong. Try again.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCreate = async () => {
    Keyboard.dismiss();
    setIsSubmitting(true);
    setError(null);

    try {
      const finalPrize = prize.trim() || 'Winner picks dinner!';
      const pendingName = housemateName.trim() || undefined;

      if (householdCreated && householdId) {
        // Household was already created in Step 2, just update the prize
        await updateHousehold(householdId, { prize: finalPrize });
      } else {
        // Create household with all data
        const pendingColor = pendingName ? housemateColor : undefined;
        await createHousehold(
          yourName.trim(),
          yourColor,
          pendingName,
          pendingColor,
          finalPrize
        );
      }

      // Navigate to home
      router.replace('/');
    } catch (err) {
      console.error('Failed to create household:', err);
      setError('Something went wrong. Try again.');
      setIsSubmitting(false);
    }
  };

  const handleSkipInvite = () => {
    // Skip invite step and go to prize - clear housemate data
    setHousemateName('');
    setHousemateColor(availableCompetitorColors[0].hex);
    handleContinue();
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
                letterSpacing: 0,
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
          unavailableColors={housemateColor ? [housemateColor] : []}
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
      <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        Invite your housemate
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
        Enter their name for a personalized invite
      </Text>

      <View style={[styles.inputContainer, { marginBottom: spacing.md }]}>
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
              letterSpacing: 0,
            },
          ]}
          value={housemateName}
          onChangeText={(text) => {
            setHousemateName(text);
            // Reset shared state if name changes
            if (hasSharedInvite) {
              setHasSharedInvite(false);
            }
          }}
          placeholder="Enter their name"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          editable={!isSendingInvite}
          maxFontSizeMultiplier={1.2}
        />
      </View>

      {/* Color picker for housemate - only show when name is entered */}
      {housemateName.trim().length > 0 && (
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.callout, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
            Pick their color
          </Text>
          <ColorPicker
            selectedColor={housemateColor}
            onColorSelect={setHousemateColor}
            unavailableColors={[yourColor]}
          />
        </View>
      )}

      {/* Send Invite Button */}
      {hasSharedInvite ? (
        <View style={[styles.inviteSentContainer, { marginBottom: spacing.xl }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <Text style={[typography.body, { color: colors.success, marginLeft: spacing.xs }]}>
            Invite sent!
          </Text>
        </View>
      ) : (
        <Button
          label="Send Invite"
          onPress={handleSendInvite}
          fullWidth
          variant="secondary"
          isLoading={isSendingInvite}
          isDisabled={!housemateName.trim()}
        />
      )}

      {error && (
        <Text style={[typography.callout, { color: colors.error, marginTop: spacing.md, textAlign: 'center' }]}>
          {error}
        </Text>
      )}

      {/* Continue button - always visible */}
      <View style={{ marginTop: spacing.xl }}>
        <Button
          label="Continue"
          onPress={handleContinue}
          fullWidth
          isDisabled={isSendingInvite}
        />
      </View>

      {/* Skip link */}
      <TouchableOpacity
        onPress={handleSkipInvite}
        style={styles.skipLink}
        disabled={isSendingInvite}
      >
        <Text style={[typography.callout, { color: colors.textSecondary }]}>
          Skip for now
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
      <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        Set the prize
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
                letterSpacing: 0,
              },
            ]}
            value={prize}
            onChangeText={setPrize}
            placeholder="Winner picks dinner!"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            maxFontSizeMultiplier={1.2}
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
  skipLink: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  inviteSentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
