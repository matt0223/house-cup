import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Pressable,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/useTheme';
import { Button } from '../../src/components/ui';
import { useFirebase } from '../../src/providers/FirebaseProvider';
import { availableCompetitorColors } from '../../src/domain/models/Competitor';
import { useHouseholdStore } from '../../src/store/useHouseholdStore';
import {
  trackScreenViewed,
  trackHouseholdCreated,
  trackHouseholdJoined,
  trackJoinCodeFailed,
} from '../../src/services/analytics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Status = 'idle' | 'creating' | 'joining' | 'error';

/**
 * Onboarding setup (fork) screen.
 *
 * Shown after Apple Sign-In when the user has no recoverable household.
 * Primary path: create a new household. Secondary path: tap "Have an
 * invite code?" to reveal a 6-digit field that auto-submits when filled.
 */
export default function OnboardingSetupScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ givenName?: string }>();
  const { createHousehold, joinHousehold } = useFirebase();

  const givenName = params.givenName || '';

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showCodeField, setShowCodeField] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const lastSubmittedCode = useRef<string | null>(null);

  useEffect(() => {
    trackScreenViewed({ 'screen name': 'setup' });
  }, []);

  const handleCreate = async () => {
    Keyboard.dismiss();
    setStatus('creating');
    setError(null);

    try {
      const name = givenName || 'You';
      const defaultColor = availableCompetitorColors[0].hex;
      await createHousehold(name, defaultColor, undefined, undefined, '');
      const created = useHouseholdStore.getState().household;
      trackHouseholdCreated({
        'household id': created?.id ?? '',
        'competitor name': name,
        'competitor color': defaultColor,
      });
      router.replace('/');
    } catch (err) {
      console.error('Failed to create household:', err);
      setError('Could not create household. Try again.');
      setStatus('error');
    }
  };

  const handleJoin = async (codeToJoin: string) => {
    if (codeToJoin.length !== 6) return;
    if (status === 'joining') return;
    if (lastSubmittedCode.current === codeToJoin) return;

    lastSubmittedCode.current = codeToJoin;
    Keyboard.dismiss();
    setStatus('joining');
    setError(null);

    try {
      const name = givenName || 'You';
      const defaultColor = availableCompetitorColors[0].hex;
      await joinHousehold(codeToJoin, name, defaultColor);
      const joined = useHouseholdStore.getState().household;
      trackHouseholdJoined({
        'household id': joined?.id ?? '',
        'competitor name': name,
        'competitor color': defaultColor,
      });
      router.replace('/');
    } catch (err) {
      console.error('Failed to join household:', err);
      const message = err instanceof Error ? err.message : '';
      let reason: 'invalid code' | 'household full' | 'no pending invite' | 'exception' = 'exception';
      let display = "That code didn't work. Double-check with your housemate.";
      if (/invalid join code/i.test(message)) {
        reason = 'invalid code';
      } else if (/household is full/i.test(message)) {
        reason = 'household full';
        display = 'This household is already full.';
      } else if (/no pending invite/i.test(message)) {
        reason = 'no pending invite';
        display = 'No pending invite found for this code.';
      }
      trackJoinCodeFailed({ 'error reason': reason });
      setError(display);
      setStatus('error');
    }
  };

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(cleaned);
    // Reset the dedupe guard whenever the code shrinks below 6 — they're editing.
    if (cleaned.length < 6) {
      lastSubmittedCode.current = null;
      if (error) {
        setError(null);
        setStatus('idle');
      }
    }
    if (cleaned.length === 6) {
      handleJoin(cleaned);
    }
  };

  const handleRevealCodeField = () => {
    // Match the layout animation duration to iOS's keyboard slide (~250ms)
    // so the content reflow and keyboard appearance feel like one motion.
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: 'easeOut', property: 'opacity' },
      update: { type: 'easeOut' },
    });
    setShowCodeField(true);
    // Focus is fired by autoFocus on the TextInput; this triggers the
    // keyboard animation in parallel with the layout animation.
  };

  const isBusy = status === 'creating' || status === 'joining';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {isBusy ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
              {status === 'creating' ? 'Setting up your household...' : 'Joining household...'}
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing.lg }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero */}
            <View style={styles.hero}>
              <Ionicons
                name="trophy"
                size={44}
                color={colors.prize}
                style={{ marginBottom: spacing.md }}
              />
              <Text style={[typography.title, styles.title, { color: colors.textPrimary }]}>
                {givenName ? `Welcome, ${givenName}` : 'Welcome'}
              </Text>
            </View>

            {/* Create path */}
            <Button
              label="Create new household"
              onPress={handleCreate}
              fullWidth
            />

            {/* Or divider — quieter, narrower */}
            <View style={[styles.dividerContainer, { marginVertical: spacing.lg }]}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[typography.caption, { color: colors.textSecondary, marginHorizontal: spacing.sm }]}>
                or
              </Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            {/* Join path — progressively disclosed */}
            {!showCodeField ? (
              <Button
                label="Enter invite code"
                onPress={handleRevealCodeField}
                variant="secondary"
                fullWidth
                style={{ backgroundColor: 'transparent' }}
              />
            ) : (
              <View>
                <Text style={[typography.callout, { color: colors.textPrimary, marginBottom: spacing.sm, fontWeight: '600', textAlign: 'center' }]}>
                  Enter your 6-digit code
                </Text>

                <TextInput
                  ref={inputRef}
                  style={[
                    styles.codeInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.textPrimary,
                      borderRadius: radius.medium,
                      borderColor: error ? colors.error : colors.border,
                      borderWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                  value={code}
                  onChangeText={handleCodeChange}
                  placeholder="000000"
                  placeholderTextColor={colors.textSecondary + '55'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  returnKeyType="done"
                  maxFontSizeMultiplier={1.2}
                />

                {error && (
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.error, marginTop: spacing.sm, textAlign: 'center' },
                    ]}
                  >
                    {error}
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
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
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  revealRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  codeInput: {
    width: '100%',
    height: 64,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
