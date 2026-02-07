import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/useTheme';
import { iconColors } from '../src/theme';
import {
  AppHeader,
  SettingsSection,
  SettingsRow,
  CompetitorRow,
  OptionPickerModal,
} from '../src/components/ui';
import { useHouseholdStore, useUserProfileStore, useThemePreference } from '../src/store';
import { WeekStartDay, ThemePreference } from '../src/domain/models/Household';
import { isPendingCompetitor, hasBeenInvited, availableCompetitorColors } from '../src/domain/models/Competitor';
import { useFirebase } from '../src/providers/FirebaseProvider';
import { useAppleAuth } from '../src/hooks/useAppleAuth';
import { useAuth } from '../src/hooks/useAuth';
import Constants from 'expo-constants';
import { shareHouseholdInvite } from '../src/utils/shareInvite';

/** Day options for picker */
const DAY_OPTIONS: { id: string; label: string }[] = [
  { id: '0', label: 'Sunday' },
  { id: '1', label: 'Monday' },
  { id: '2', label: 'Tuesday' },
  { id: '3', label: 'Wednesday' },
  { id: '4', label: 'Thursday' },
  { id: '5', label: 'Friday' },
  { id: '6', label: 'Saturday' },
];

/** Theme options */
const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

/**
 * Settings screen - Configure competitors, challenge settings, and app preferences.
 */
export default function SettingsScreen() {
  const { colors, typography, spacing, radius, isDark } = useTheme();
  const router = useRouter();
  const { markInviteSent, addHousemate, setHouseholdId, clearAllHouseholdTaskData, isConfigured, userId } = useFirebase();
  const { signOut } = useAuth();

  // Household store
  const household = useHouseholdStore((s) => s.household);
  const updateSettings = useHouseholdStore((s) => s.updateSettings);
  const updateCompetitor = useHouseholdStore((s) => s.updateCompetitor);
  const clearHousehold = useHouseholdStore((s) => s.clearHousehold);

  // Local state for editing
  const [editingCompetitor, setEditingCompetitor] = useState<string | null>(null);
  const [editingPrize, setEditingPrize] = useState(false);
  const [prizeText, setPrizeText] = useState(household?.prize ?? '');
  const [showEndDayPicker, setShowEndDayPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // State for new housemate (when no competitorB exists)
  const competitorAColor = household?.competitors[0]?.color;
  const defaultHousemateColor: string = availableCompetitorColors.find(
    c => c.hex !== competitorAColor
  )?.hex || availableCompetitorColors[0].hex;
  
  const [newHousemateName, setNewHousemateName] = useState('');
  const [newHousemateColor, setNewHousemateColor] = useState<string>(defaultHousemateColor);
  const [isHousemateNameFocused, setIsHousemateNameFocused] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Apple auth state (used for display only - sign-in is required during onboarding)
  useAppleAuth();

  // Sign out state
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);

  // Handle sign out
  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You can sign back in with your Apple ID to recover your household.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            try {
              // Sign out from Firebase
              await signOut();
              // Clear local household data
              clearHousehold();
              // Clear household ID (this clears AsyncStorage too)
              setHouseholdId(null);
              // Navigate to onboarding
              router.replace('/onboarding');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  }, [signOut, clearHousehold, setHouseholdId, router]);

  // Clear all tasks, templates, skip records from Firestore and local state
  const handleClearAllTaskData = useCallback(() => {
    Alert.alert(
      'Clear All Task Data',
      'This will permanently delete all tasks, templates, and skip records from the database and clear them from this device. Your household and competitors are not affected. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setIsClearingData(true);
            try {
              await clearAllHouseholdTaskData();
              Alert.alert('Done', 'All task data has been cleared.');
            } catch (error) {
              console.error('Clear task data error:', error);
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            } finally {
              setIsClearingData(false);
            }
          },
        },
      ]
    );
  }, [clearAllHouseholdTaskData]);

  // Handle sharing invite for existing pending competitor
  const handleShareInvite = useCallback(async () => {
    if (!household || !household.competitors[0]) return;
    
    // Find pending competitor (one without userId)
    const pendingCompetitor = household.competitors.find(c => isPendingCompetitor(c));
    if (!pendingCompetitor) return;
    
    // Mark as invited BEFORE opening share sheet
    // This ensures the UI updates immediately when user taps the button
    if (!hasBeenInvited(pendingCompetitor)) {
      await markInviteSent(pendingCompetitor.id);
    }
    
    // Then open share sheet (result doesn't affect invite status)
    await shareHouseholdInvite(
      household.competitors[0].name,
      pendingCompetitor.name,
      household.joinCode || ''
    );
  }, [household, markInviteSent]);

  // Handle sending invite for new housemate (creates competitor first)
  const handleSendNewInvite = useCallback(async () => {
    if (!household || !newHousemateName.trim()) return;
    
    setIsSendingInvite(true);
    try {
      // Create the competitor first
      const newCompetitor = await addHousemate(newHousemateName.trim(), newHousemateColor);
      
      // Mark as invited immediately after creation
      await markInviteSent(newCompetitor.id);
      
      // Then open share sheet (result doesn't affect invite status)
      await shareHouseholdInvite(
        household.competitors[0].name,
        newHousemateName.trim(),
        household.joinCode || ''
      );
      
      // Clear the input
      setNewHousemateName('');
    } catch (err) {
      console.error('Failed to send invite:', err);
    } finally {
      setIsSendingInvite(false);
    }
  }, [household, newHousemateName, newHousemateColor, addHousemate, markInviteSent]);

  // Auto-save new housemate on blur (when name field loses focus)
  const handleNewHousemateBlur = useCallback(async () => {
    setIsHousemateNameFocused(false);
    
    // Only auto-save if there's a valid name and we're not already sending an invite
    if (!household || !newHousemateName.trim() || isSendingInvite) return;
    
    try {
      // Create the competitor (they'll show as "Not yet invited")
      await addHousemate(newHousemateName.trim(), newHousemateColor);
      
      // Clear the input since competitor now exists
      setNewHousemateName('');
    } catch (err) {
      console.error('Failed to save housemate:', err);
    }
  }, [household, newHousemateName, newHousemateColor, isSendingInvite, addHousemate]);

  // Theme from current user's profile (per-user, not per-household)
  const selectedTheme = useThemePreference();
  const setThemePreference = useUserProfileStore((s) => s.setThemePreference);

  const competitorA = household?.competitors[0];
  const competitorB = household?.competitors[1];
  
  // Check if competitorB exists but is pending (no userId)
  const isPendingHousemate = competitorB ? isPendingCompetitor(competitorB) : false;
  
  // Check if pending housemate has been invited
  const hasInviteBeenSent = competitorB ? hasBeenInvited(competitorB) : false;

  // Calculate competition end day from weekStartDay
  // End day is the day before the start day
  const getEndDay = (weekStartDay: WeekStartDay): number => {
    return (weekStartDay + 6) % 7;
  };

  // Calculate weekStartDay from end day
  // Start day is the day after the end day
  const getWeekStartFromEndDay = (endDay: number): WeekStartDay => {
    return ((endDay + 1) % 7) as WeekStartDay;
  };

  const currentEndDay = household ? getEndDay(household.weekStartDay) : 6;

  // Handle competitor name change
  const handleNameChange = (competitorId: string, name: string) => {
    updateCompetitor(competitorId, { name });
  };

  // Handle competitor color change
  const handleColorChange = (competitorId: string, color: string) => {
    updateCompetitor(competitorId, { color });
  };

  // Handle end day change
  const handleEndDayChange = (endDay: number) => {
    const weekStartDay = getWeekStartFromEndDay(endDay);
    updateSettings({ weekStartDay });
    setShowEndDayPicker(false);
  };

  // Handle prize save
  const handlePrizeSave = () => {
    updateSettings({ prize: prizeText });
    setEditingPrize(false);
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <AppHeader
        title="Settings"
        leftAction={{ icon: 'chevron-back', onPress: () => router.back() }}
      />

      <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: spacing.sm },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        {/* Housemates Section */}
        <SettingsSection title="Housemates">
          {competitorA && (
            <CompetitorRow
              competitor={competitorA}
              onNameChange={(name) => handleNameChange(competitorA.id, name)}
              onColorChange={(color) => handleColorChange(competitorA.id, color)}
              isExpanded={editingCompetitor === competitorA.id}
              onToggleExpand={() =>
                setEditingCompetitor(
                  editingCompetitor === competitorA.id ? null : competitorA.id
                )
              }
              unavailableColors={[competitorB?.color ?? newHousemateColor]}
              showDivider={true}
            />
          )}
          {competitorB ? (
            <CompetitorRow
              competitor={competitorB}
              onNameChange={(name) => handleNameChange(competitorB.id, name)}
              onColorChange={(color) => handleColorChange(competitorB.id, color)}
              isExpanded={editingCompetitor === competitorB.id}
              onToggleExpand={() =>
                setEditingCompetitor(
                  editingCompetitor === competitorB.id ? null : competitorB.id
                )
              }
              unavailableColors={[competitorA?.color ?? '']}
              showDivider={false}
              statusLabel={
                isPendingHousemate
                  ? hasInviteBeenSent
                    ? 'Invite Sent'
                    : 'Not yet invited'
                  : undefined
              }
              actionElement={
                isPendingHousemate ? (
                  <TouchableOpacity
                    onPress={handleShareInvite}
                    style={[
                      styles.inviteButton,
                      {
                        backgroundColor: colors.primary + '15',
                        borderRadius: radius.small,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xxs,
                      },
                    ]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text
                      style={[
                        typography.callout,
                        { color: colors.primary, fontWeight: '600' },
                      ]}
                    >
                      {hasInviteBeenSent ? 'Resend' : 'Send Invite'}
                    </Text>
                  </TouchableOpacity>
                ) : undefined
              }
            />
          ) : (
            /* Empty housemate row - for adding new housemate */
            <CompetitorRow
              competitor={{
                id: 'new-housemate',
                name: newHousemateName,
                color: newHousemateColor,
              }}
              onNameChange={setNewHousemateName}
              onColorChange={setNewHousemateColor}
              isExpanded={editingCompetitor === 'new-housemate'}
              onToggleExpand={() =>
                setEditingCompetitor(
                  editingCompetitor === 'new-housemate' ? null : 'new-housemate'
                )
              }
              unavailableColors={[competitorA?.color ?? '']}
              showDivider={false}
              placeholder="Housemate's name"
              onFocus={() => setIsHousemateNameFocused(true)}
              onBlur={handleNewHousemateBlur}
              statusLabel={undefined}
              actionElement={
                newHousemateName.trim() ? (
                  <TouchableOpacity
                    onPress={handleSendNewInvite}
                    disabled={isSendingInvite}
                    style={[
                      styles.inviteButton,
                      {
                        backgroundColor: colors.primary + '15',
                        borderRadius: radius.small,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xxs,
                        opacity: isSendingInvite ? 0.5 : 1,
                      },
                    ]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text
                      style={[
                        typography.callout,
                        { color: colors.primary, fontWeight: '600' },
                      ]}
                    >
                      {isSendingInvite ? 'Sending...' : 'Send Invite'}
                    </Text>
                  </TouchableOpacity>
                ) : undefined
              }
            />
          )}
        </SettingsSection>

        {/* Challenge Section */}
        <SettingsSection title="Challenge">
          <SettingsRow
            label="Prize"
            icon="trophy"
            iconColor={iconColors.trophy}
            rightElement={
              editingPrize ? (
                <View style={[styles.prizeEditRow, { alignItems: 'center' }]}>
                  <TextInput
                    style={[
                      typography.body,
                      styles.prizeInput,
                      { color: colors.textPrimary, letterSpacing: 0 },
                    ]}
                    value={prizeText}
                    onChangeText={setPrizeText}
                    placeholder="Enter prize"
                    placeholderTextColor={colors.textSecondary}
                    autoFocus
                    onBlur={handlePrizeSave}
                    onSubmitEditing={handlePrizeSave}
                    maxFontSizeMultiplier={1.2}
                  />
                  <Ionicons
                    name="pencil"
                    size={18}
                    color={colors.textSecondary}
                    style={{ marginLeft: spacing.xxs }}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => {
                    setPrizeText(household?.prize ?? '');
                    setEditingPrize(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text
                    style={[
                      typography.body,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {household?.prize || 'Not set'}
                  </Text>
                  <Ionicons
                    name="pencil"
                    size={18}
                    color={colors.textSecondary}
                    style={{ marginLeft: spacing.xxs }}
                  />
                </TouchableOpacity>
              )
            }
            onPress={() => {
              setPrizeText(household?.prize ?? '');
              setEditingPrize(true);
            }}
          />
          <SettingsRow
            label="Week ends on"
            icon="calendar"
            iconColor={iconColors.calendar}
            showDivider={false}
            value={DAY_OPTIONS[currentEndDay].label}
            onPress={() => setShowEndDayPicker(true)}
          />
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection title="Appearance">
          <SettingsRow
            label="Theme"
            icon="color-palette-outline"
            iconColor={iconColors.theme}
            showDivider={false}
            value={THEME_OPTIONS.find((t) => t.id === selectedTheme)?.label}
            onPress={() => setShowThemePicker(true)}
          />
        </SettingsSection>

        {/* Account Section */}
        <SettingsSection title="Account">
          <SettingsRow
            label="Signed in with Apple"
            icon="logo-apple"
            iconColor={isDark ? '#FFFFFF' : '#000000'}
            iconTint={isDark ? '#000000' : '#FFFFFF'}
            showDivider={false}
            rightElement={
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            }
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About">
          <SettingsRow
            label="Version"
            icon="information-circle"
            iconColor={iconColors.info}
            value={appVersion}
            showDivider={false}
          />
        </SettingsSection>

        {/* Data Section - only when Firebase is configured */}
        {isConfigured && (
          <SettingsSection title="Data">
            <SettingsRow
              label="Clear all tasks and templates"
              icon="trash-outline"
              iconColor={colors.error}
              showDivider={false}
              onPress={handleClearAllTaskData}
              disabled={isClearingData}
              rightElement={
                isClearingData ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : undefined
              }
            />
          </SettingsSection>
        )}

        {/* Sign Out Section */}
        <SettingsSection title="">
          <TouchableOpacity
            onPress={handleSignOut}
            disabled={isSigningOut}
            style={[
              styles.signOutButton,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.large,
                paddingVertical: spacing.md,
                opacity: isSigningOut ? 0.5 : 1,
              },
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={colors.error}
                  style={{ marginRight: spacing.sm }}
                />
                <Text
                  style={[
                    typography.body,
                    { color: colors.error, fontWeight: '600' },
                  ]}
                >
                  Sign Out
                </Text>
              </>
            )}
          </TouchableOpacity>
        </SettingsSection>

          {/* Bottom padding */}
          <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* End Day Picker Modal */}
      <OptionPickerModal
        visible={showEndDayPicker}
        title="Week ends on"
        options={DAY_OPTIONS}
        selectedId={String(currentEndDay)}
        onSelect={(id) => {
          handleEndDayChange(parseInt(id, 10));
        }}
        onClose={() => setShowEndDayPicker(false)}
      />

      {/* Theme Picker Modal */}
      <OptionPickerModal
        visible={showThemePicker}
        title="Theme"
        options={THEME_OPTIONS}
        selectedId={selectedTheme}
        onSelect={(id) => {
          setThemePreference(id as ThemePreference, userId ?? null);
          setShowThemePicker(false);
        }}
        onClose={() => setShowThemePicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  prizeEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prizeInput: {
    minWidth: 120,
    textAlign: 'right',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
