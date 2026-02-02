import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
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
import { useHouseholdStore } from '../src/store';
import { WeekStartDay } from '../src/domain/models/Household';
import { isPendingCompetitor, hasBeenInvited, availableCompetitorColors } from '../src/domain/models/Competitor';
import { useFirebase } from '../src/providers/FirebaseProvider';
import Constants from 'expo-constants';
import { shareHouseholdInvite } from '../src/utils/shareInvite';

/** Day options for picker */
const DAY_OPTIONS = [
  { id: '0', label: 'Sunday' },
  { id: '1', label: 'Monday' },
  { id: '2', label: 'Tuesday' },
  { id: '3', label: 'Wednesday' },
  { id: '4', label: 'Thursday' },
  { id: '5', label: 'Friday' },
  { id: '6', label: 'Saturday' },
] as const;

/** Theme options */
import { ThemePreference } from '../src/domain/models/Household';
const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

/**
 * Settings screen - Configure competitors, challenge settings, and app preferences.
 */
export default function SettingsScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const router = useRouter();
  const { markInviteSent, addHousemate } = useFirebase();

  // Household store
  const household = useHouseholdStore((s) => s.household);
  const updateSettings = useHouseholdStore((s) => s.updateSettings);
  const updateCompetitor = useHouseholdStore((s) => s.updateCompetitor);

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

  // Handle sharing invite for existing pending competitor
  const handleShareInvite = useCallback(async () => {
    if (!household || !household.competitors[0]) return;
    
    // Find pending competitor (one without userId)
    const pendingCompetitor = household.competitors.find(c => isPendingCompetitor(c));
    
    const shared = await shareHouseholdInvite(
      household.competitors[0].name,
      pendingCompetitor?.name,
      household.joinCode || ''
    );
    
    // Mark as invited if share was successful
    if (shared && pendingCompetitor) {
      await markInviteSent(pendingCompetitor.id);
    }
  }, [household, markInviteSent]);

  // Handle sending invite for new housemate (creates competitor first)
  const handleSendNewInvite = useCallback(async () => {
    if (!household || !newHousemateName.trim()) return;
    
    setIsSendingInvite(true);
    try {
      // Create the competitor first
      const newCompetitor = await addHousemate(newHousemateName.trim(), newHousemateColor);
      
      // Then open share sheet
      const shared = await shareHouseholdInvite(
        household.competitors[0].name,
        newHousemateName.trim(),
        household.joinCode || ''
      );
      
      // Mark as invited if share was successful
      if (shared) {
        await markInviteSent(newCompetitor.id);
      }
      
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

  // Theme from household store
  const selectedTheme = household?.themePreference ?? 'system';

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
                      { color: colors.textPrimary },
                    ]}
                    value={prizeText}
                    onChangeText={setPrizeText}
                    placeholder="Enter prize"
                    placeholderTextColor={colors.textSecondary}
                    autoFocus
                    onBlur={handlePrizeSave}
                    onSubmitEditing={handlePrizeSave}
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

        {/* Account Section (Future) */}
        <SettingsSection title="Account">
          <SettingsRow
            label="Sign in"
            icon="person-circle"
            iconColor={iconColors.user}
            disabled={true}
          />
          <SettingsRow
            label="Sync settings"
            icon="cloud"
            iconColor={iconColors.cloud}
            showDivider={false}
            disabled={true}
          />
        </SettingsSection>

        {/* Notifications Section (Future) */}
        <SettingsSection title="Notifications">
          <SettingsRow
            label="Daily reminders"
            icon="notifications"
            iconColor={iconColors.notifications}
            disabled={true}
          />
          <SettingsRow
            label="Weekly summary"
            icon="mail"
            iconColor={iconColors.mail}
            showDivider={false}
            disabled={true}
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About">
          <SettingsRow
            label="Version"
            icon="information-circle"
            iconColor={iconColors.info}
            value={appVersion}
          />
          <SettingsRow
            label="Send feedback"
            icon="chatbubble"
            iconColor={iconColors.feedback}
            showDivider={false}
            disabled={true}
          />
        </SettingsSection>

        {/* Data Section */}
        <SettingsSection title="Data">
          <SettingsRow
            label="Reset all data"
            icon="trash"
            iconColor={iconColors.trash}
            showDivider={false}
            disabled={true}
          />
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
          updateSettings({ themePreference: id });
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
});
