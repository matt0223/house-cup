import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { useBottomSheet } from '../../hooks/useBottomSheet';
import { BottomSheetContainer } from '../ui/BottomSheetContainer';

export interface AddPrizeSheetProps {
  /** Whether the sheet is visible */
  isVisible: boolean;
  /** Called when sheet should close */
  onClose: () => void;
  /** Called when a prize is saved */
  onSave: (prize: string) => void;
  /** Current prize value (for pre-populating) */
  currentPrize?: string;
}

/** Suggested prizes shown as quick-tap chips */
const PRIZE_SUGGESTIONS = [
  'Gets to assign a chore',
  'No dishes for 3 days',
  'Picks Sat night plans',
  'Gets a half day pass',
];

/** Darkened prize color for accessible text on light gold backgrounds (~5:1 contrast) */
const SELECTED_CHIP_TEXT = '#996B1D';
/** Mid-gray for unselected chips — darker than textSecondary so they look tappable */
const UNSELECTED_CHIP_TEXT = '#6B6B70';

/**
 * Bottom sheet modal for selecting or entering a prize.
 * Input row on top, suggestion chips in a scrollable action bar, checkmark to save.
 */
export function AddPrizeSheet({
  isVisible,
  onClose,
  onSave,
  currentPrize = '',
}: AddPrizeSheetProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const { modalVisible, overlayOpacity, sheetTranslateY, contentBottomPadding, inputRef } =
    useBottomSheet(isVisible);

  // Form state
  const [prizeText, setPrizeText] = useState('');

  // Reset form when sheet opens
  useEffect(() => {
    if (isVisible) {
      setPrizeText(currentPrize);
    }
  }, [isVisible]);

  const handleSave = useCallback(() => {
    if (!prizeText.trim()) return;
    onSave(prizeText.trim());
    onClose();
  }, [prizeText, onSave, onClose]);

  const handleSuggestionTap = useCallback((suggestion: string) => {
    setPrizeText(suggestion);
    inputRef.current?.focus();
  }, []);

  const isSubmitEnabled = prizeText.trim().length > 0;

  return (
    <BottomSheetContainer
      modalVisible={modalVisible}
      overlayOpacity={overlayOpacity}
      sheetTranslateY={sheetTranslateY}
      contentBottomPadding={contentBottomPadding}
      onClose={onClose}
    >
      <View style={[styles.content, { padding: spacing.md }]}>
        {/* Input row */}
        <View style={styles.inputRow}>
          <Ionicons
            name="trophy-outline"
            size={20}
            color={colors.prize}
            style={{ marginRight: spacing.xs, marginTop: 1 }}
          />
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              typography.body,
              { color: colors.textPrimary, flex: 1, letterSpacing: 0 },
            ]}
            placeholder="What does the winner get?"
            placeholderTextColor={colors.textSecondary}
            value={prizeText}
            onChangeText={setPrizeText}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            blurOnSubmit={false}
            maxFontSizeMultiplier={1.2}
          />
        </View>

        {/* Actions row: suggestion chips + save button */}
        <View style={[styles.actionsRow, { marginTop: spacing.sm, minHeight: 44 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.chipsScroll, { gap: spacing.xs }]}
            style={styles.chipsContainer}
            keyboardShouldPersistTaps="handled"
          >
            {PRIZE_SUGGESTIONS.map((suggestion) => {
              const isSelected = prizeText === suggestion;
              return (
                <TouchableOpacity
                  key={suggestion}
                  style={[
                    styles.suggestionChip,
                    {
                      backgroundColor: isSelected
                        ? colors.prize + '25'
                        : colors.background,
                      borderRadius: radius.pill,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: isSelected ? colors.prize + '60' : 'transparent',
                    },
                  ]}
                  onPress={() => handleSuggestionTap(suggestion)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isSelected
                          ? SELECTED_CHIP_TEXT
                          : UNSELECTED_CHIP_TEXT,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: isSubmitEnabled
                  ? colors.primary
                  : colors.border,
                marginLeft: spacing.sm,
              },
            ]}
            onPress={handleSave}
            disabled={!isSubmitEnabled}
            activeOpacity={0.8}
            accessibilityLabel="Save prize"
            accessibilityRole="button"
          >
            <Ionicons
              name="checkmark"
              size={20}
              color={isSubmitEnabled ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetContainer>
  );
}

const SUBMIT_BUTTON_SIZE = 44;

const styles = StyleSheet.create({
  content: {},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    paddingVertical: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipsContainer: {
    flex: 1,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionChip: {},
  submitButton: {
    width: SUBMIT_BUTTON_SIZE,
    height: SUBMIT_BUTTON_SIZE,
    borderRadius: SUBMIT_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

export default AddPrizeSheet;
