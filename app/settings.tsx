import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/useTheme';
import {
  AppHeader,
  SettingsSection,
  SettingsRow,
  CompetitorRow,
} from '../src/components/ui';
import { useHouseholdStore } from '../src/store';
import { WeekStartDay } from '../src/domain/models/Household';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { shareHouseholdInvite } from '../src/utils/shareInvite';

/** Day names for display */
const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
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
  const [copied, setCopied] = useState(false);

  // Handle copying join code to clipboard
  const handleCopyCode = async () => {
    if (household?.joinCode) {
      await Clipboard.setStringAsync(household.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle sharing invite
  const handleShareInvite = useCallback(() => {
    if (!household || !household.competitors[0]) return;
    
    shareHouseholdInvite(
      household.competitors[0].name,
      household.pendingHousemateName,
      household.joinCode || ''
    );
  }, [household]);

  // Theme from household store
  const selectedTheme = household?.themePreference ?? 'system';

  const competitorA = household?.competitors[0];
  const competitorB = household?.competitors[1];
  const hasPendingHousemate = !competitorB && household?.pendingHousemateName;

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

      <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
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
              unavailableColors={[competitorB?.color ?? '']}
              showDivider={!!competitorB || !!hasPendingHousemate}
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
            />
          ) : (
            // Pending housemate row with invite button
            <SettingsRow
              label={household?.pendingHousemateName || 'Add housemate'}
              icon="person-add"
              iconColor={colors.primary}
              showDivider={false}
              value="Not joined yet"
              rightElement={
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
                    Invite
                  </Text>
                </TouchableOpacity>
              }
            />
          )}
        </SettingsSection>

        {/* Household Section - Join Code */}
        <SettingsSection title="Household">
          <SettingsRow
            label="Join Code"
            icon="key"
            iconColor="#FF9500"
            value={household?.joinCode || 'Not available'}
            showDivider={false}
            rightElement={
              household?.joinCode ? (
                <TouchableOpacity onPress={handleCopyCode} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons
                    name={copied ? "checkmark" : "copy"}
                    size={20}
                    color={copied ? '#34C759' : colors.textSecondary}
                  />
                </TouchableOpacity>
              ) : null
            }
          />
        </SettingsSection>

        {/* Challenge Section */}
        <SettingsSection title="Challenge">
          <SettingsRow
            label="Prize"
            icon="trophy"
            iconColor="#E9B44C"
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
            iconColor="#5B9BD5"
            showDivider={false}
            value={DAY_NAMES[currentEndDay]}
            onPress={() => setShowEndDayPicker(true)}
          />
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection title="Appearance">
          <SettingsRow
            label="Theme"
            icon="color-palette-outline"
            iconColor="#5C6BC0"
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
            iconColor="#4ECDC4"
            disabled={true}
          />
          <SettingsRow
            label="Sync settings"
            icon="cloud"
            iconColor="#26C6DA"
            showDivider={false}
            disabled={true}
          />
        </SettingsSection>

        {/* Notifications Section (Future) */}
        <SettingsSection title="Notifications">
          <SettingsRow
            label="Daily reminders"
            icon="notifications"
            iconColor="#E57373"
            disabled={true}
          />
          <SettingsRow
            label="Weekly summary"
            icon="mail"
            iconColor="#7CB342"
            showDivider={false}
            disabled={true}
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About">
          <SettingsRow
            label="Version"
            icon="information-circle"
            iconColor="#8E8E93"
            value={appVersion}
          />
          <SettingsRow
            label="Send feedback"
            icon="chatbubble"
            iconColor="#5B9BD5"
            showDivider={false}
            disabled={true}
          />
        </SettingsSection>

        {/* Data Section */}
        <SettingsSection title="Data">
          <SettingsRow
            label="Reset all data"
            icon="trash"
            iconColor="#FF3B30"
            showDivider={false}
            disabled={true}
          />
        </SettingsSection>

          {/* Bottom padding */}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </Pressable>

      {/* End Day Picker Modal */}
      <Modal
        visible={showEndDayPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndDayPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEndDayPicker(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.large,
              },
            ]}
          >
            <Text
              style={[
                typography.headline,
                { color: colors.textPrimary, marginBottom: spacing.sm },
              ]}
            >
              Week ends on
            </Text>
            {DAY_NAMES.map((dayName, index) => (
              <TouchableOpacity
                key={dayName}
                style={[
                  styles.dayOption,
                  {
                    backgroundColor:
                      currentEndDay === index
                        ? colors.primary + '15'
                        : 'transparent',
                    borderRadius: radius.small,
                  },
                ]}
                onPress={() => handleEndDayChange(index)}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      color:
                        currentEndDay === index
                          ? colors.primary
                          : colors.textPrimary,
                      fontWeight: currentEndDay === index ? '600' : '400',
                    },
                  ]}
                >
                  {dayName}
                </Text>
                {currentEndDay === index && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Theme Picker Modal */}
      <Modal
        visible={showThemePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemePicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowThemePicker(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.large,
              },
            ]}
          >
            <Text
              style={[
                typography.headline,
                { color: colors.textPrimary, marginBottom: spacing.sm },
              ]}
            >
              Theme
            </Text>
            {THEME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.dayOption,
                  {
                    backgroundColor:
                      selectedTheme === option.id
                        ? colors.primary + '15'
                        : 'transparent',
                    borderRadius: radius.small,
                  },
                ]}
                onPress={() => {
                  updateSettings({ themePreference: option.id });
                  setShowThemePicker(false);
                }}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      color:
                        selectedTheme === option.id
                          ? colors.primary
                          : colors.textPrimary,
                      fontWeight: selectedTheme === option.id ? '600' : '400',
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {selectedTheme === option.id && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    padding: 20,
  },
  dayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 2,
  },
});
