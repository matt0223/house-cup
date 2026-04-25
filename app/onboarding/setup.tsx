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
  ScrollView,
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

type Status = 'idle' | 'creating' | 'joining' | 'error';

/**
 * Onboarding setup (fork) screen.
 *
 * Shown after Apple Sign-In when the user has no recoverable household.
 * Lets them either create a new household or join an existing one by code.
 * The 6-digit code field is exposed directly so joining is one screen, not two.
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

  const inputRef = useRef<TextInput>(null);

  React.useEffect(() => {
    trackScreenViewed({ 'screen name': 'setup' });
  }, []);

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(cleaned);
    if (error) {
      setError(null);
      setStatus('idle');
    }
  };

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

  const handleJoin = async () => {
    if (code.length !== 6) return;
    Keyboard.dismiss();
    setStatus('joining');
    setError(null);

    try {
      const name = givenName || 'You';
      const defaultColor = availableCompetitorColors[0].hex;
      await joinHousehold(code, name, defaultColor);
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

  const isBusy = status === 'creating' || status === 'joining';
  const canJoin = code.length === 6 && !isBusy;

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
                size={48}
                color={colors.prize}
                style={{ marginBottom: spacing.md }}
              />
              <Text style={[typography.title, styles.title, { color: colors.textPrimary }]}>
                {givenName ? `Welcome, ${givenName}` : 'Welcome'}
              </Text>
              <Text
                style={[
                  typography.body,
                  styles.subtitle,
                  { color: colors.textSecondary, marginTop: spacing.xs },
                ]}
              >
                Start fresh or join your housemate.
              </Text>
            </View>

            {/* Create path */}
            <Button
              label="Create new household"
              onPress={handleCreate}
              fullWidth
            />

            {/* Divider */}
            <View style={[styles.dividerContainer, { marginVertical: spacing.lg }]}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[typography.caption, { color: colors.textSecondary, marginHorizontal: spacing.sm }]}>
                or
              </Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            {/* Join path */}
            <Text style={[typography.callout, { color: colors.textPrimary, marginBottom: spacing.xs, fontWeight: '600' }]}>
              Have an invite code?
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Enter the 6-digit code from your housemate.
            </Text>

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
                  marginBottom: spacing.md,
                },
              ]}
              value={code}
              onChangeText={handleCodeChange}
              placeholder="000000"
              placeholderTextColor={colors.textSecondary + '66'}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={() => canJoin && handleJoin()}
              maxFontSizeMultiplier={1.2}
            />

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
              label="Join household"
              onPress={handleJoin}
              variant="secondary"
              fullWidth
              isDisabled={!canJoin}
            />
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
    paddingTop: 32,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    textAlign: 'center',
  },
  subtitle: {
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
  codeInput: {
    width: '100%',
    height: 56,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
