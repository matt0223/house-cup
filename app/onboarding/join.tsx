import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { Button, OnboardingHeader } from '../../src/components/ui';
import { useFirebase } from '../../src/providers/FirebaseProvider';

/**
 * Onboarding join screen.
 * Enter a 6-character code to join an existing household.
 */
export default function OnboardingJoinScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const { joinHousehold } = useFirebase();

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  const handleCodeChange = (text: string) => {
    // Only allow alphanumeric, uppercase, max 6 chars
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(cleaned);
    setError(null);
  };

  const handleJoin = async () => {
    if (code.length !== 6) return;

    Keyboard.dismiss();
    setIsSubmitting(true);
    setError(null);

    try {
      await joinHousehold(code);
      router.replace('/');
    } catch (err) {
      console.error('Failed to join household:', err);
      setError("That code didn't work. Double-check with your housemate.");
      setIsSubmitting(false);
    }
  };

  const canJoin = code.length === 6;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <OnboardingHeader onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
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
              autoFocus
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={() => canJoin && handleJoin()}
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
            label="Join"
            onPress={handleJoin}
            fullWidth
            isDisabled={!canJoin}
            isLoading={isSubmitting}
          />
        </View>
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
});
