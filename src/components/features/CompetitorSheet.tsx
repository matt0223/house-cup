import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { useBottomSheet } from '../../hooks/useBottomSheet';
import { BottomSheetContainer } from '../ui/BottomSheetContainer';
import { ColorPicker } from '../ui/ColorPicker';
import { Competitor, isPendingCompetitor } from '../../domain/models/Competitor';

export interface CompetitorSheetProps {
  /** Whether the sheet is visible */
  isVisible: boolean;
  /** Called when sheet should close */
  onClose: () => void;
  /** The competitor to edit */
  competitor: Competitor;
  /** Color used by the other competitor (unavailable in picker) */
  otherCompetitorColor?: string;
  /** Called when name changes (fired on save) */
  onNameChange: (name: string) => void;
  /** Called when color changes (fired on save) */
  onColorChange: (color: string) => void;
  /** When competitor is pending, called when user taps Invite (native share) */
  onInvitePress?: () => void;
}

const EXPAND_DURATION = 200;
const COLOR_PICKER_HEIGHT = 52; // 36px swatches + 12px top padding + 4px bottom buffer

/**
 * Bottom sheet to view/edit a competitor's name and color.
 * Mirrors the AddHousemateSheet layout: text input, compact color toggle,
 * Invite + checkmark buttons, expandable color picker row.
 */
export function CompetitorSheet({
  isVisible,
  onClose,
  competitor,
  otherCompetitorColor,
  onNameChange,
  onColorChange,
  onInvitePress,
}: CompetitorSheetProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const { modalVisible, overlayOpacity, sheetTranslateY, contentBottomPadding, inputRef } =
    useBottomSheet(isVisible);

  // Local form state
  const [name, setName] = useState(competitor.name);
  const [color, setColor] = useState(competitor.color);
  const [isColorExpanded, setIsColorExpanded] = useState(false);

  // Animation values for color picker expand/collapse
  const colorPickerHeight = useRef(new Animated.Value(0)).current;
  const colorPickerOpacity = useRef(new Animated.Value(0)).current;

  const isPending = isPendingCompetitor(competitor);

  // Sync local state when competitor prop changes or sheet opens
  useEffect(() => {
    if (isVisible) {
      setName(competitor.name);
      setColor(competitor.color);
      setIsColorExpanded(false);
      colorPickerHeight.setValue(0);
      colorPickerOpacity.setValue(0);
    }
  }, [isVisible, competitor.id]);

  // Animate color picker expand/collapse
  useEffect(() => {
    const targetHeight = isColorExpanded ? COLOR_PICKER_HEIGHT : 0;
    const targetOpacity = isColorExpanded ? 1 : 0;

    Animated.parallel([
      Animated.timing(colorPickerHeight, {
        toValue: targetHeight,
        duration: EXPAND_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(colorPickerOpacity, {
        toValue: targetOpacity,
        duration: EXPAND_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  }, [isColorExpanded]);

  // Save changes and close
  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed !== competitor.name) onNameChange(trimmed);
    if (color !== competitor.color) onColorChange(color);
    onClose();
  }, [name, color, competitor.name, competitor.color, onNameChange, onColorChange, onClose]);

  // Invite and close
  const handleInvite = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== competitor.name) onNameChange(trimmed);
    if (color !== competitor.color) onColorChange(color);
    onInvitePress?.();
    onClose();
  }, [name, color, competitor.name, competitor.color, onNameChange, onColorChange, onInvitePress, onClose]);

  const canSubmit = name.trim().length > 0;

  // Auto-save on dismiss: lightweight settings don't need a confirmation modal
  const handleDismiss = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed) {
      if (trimmed !== competitor.name) onNameChange(trimmed);
      if (color !== competitor.color) onColorChange(color);
    }
    onClose();
  }, [name, color, competitor.name, competitor.color, onNameChange, onColorChange, onClose]);

  return (
    <BottomSheetContainer
      modalVisible={modalVisible}
      overlayOpacity={overlayOpacity}
      sheetTranslateY={sheetTranslateY}
      contentBottomPadding={contentBottomPadding}
      onClose={handleDismiss}
    >
      <View style={[styles.content, { padding: spacing.md }]}>
        {/* Name input row */}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, typography.body, { color: colors.textPrimary, flex: 1 }]}
            placeholder="Enter your housemate's name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            blurOnSubmit={false}
            maxFontSizeMultiplier={1.2}
          />
        </View>

        {/* Actions row: color toggle, invite button, save button */}
        <View style={[styles.actionsRow, { marginTop: spacing.sm }]}>
          {/* Color circle toggle */}
          <TouchableOpacity
            style={[styles.colorToggle, {
              backgroundColor: colors.background,
              borderRadius: 999,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
            }]}
            onPress={() => setIsColorExpanded((e) => !e)}
            activeOpacity={0.7}
            accessibilityLabel="Change color"
          >
            <View style={[styles.colorDot, { backgroundColor: color }]} />
            <Ionicons
              name={isColorExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Invite button (pending competitors only) */}
          {isPending && onInvitePress && canSubmit && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary + '15', marginRight: spacing.xs }]}
              onPress={handleInvite}
              activeOpacity={0.7}
            >
              <Text style={[typography.callout, { color: colors.primary }]}>Invite</Text>
              <Ionicons name="paper-plane-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* Save / checkmark button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: canSubmit ? colors.primary : colors.border }]}
            onPress={handleSave}
            disabled={!canSubmit}
            activeOpacity={0.8}
            accessibilityLabel="Save"
            accessibilityRole="button"
          >
            <Ionicons name="checkmark" size={20} color={canSubmit ? '#FFFFFF' : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Expandable color picker */}
        <Animated.View
          style={{
            height: colorPickerHeight,
            opacity: colorPickerOpacity,
            overflow: 'hidden',
          }}
        >
          <ColorPicker
            selectedColor={color}
            onColorSelect={setColor}
            unavailableColors={otherCompetitorColor ? [otherCompetitorColor] : []}
          />
        </Animated.View>
      </View>
    </BottomSheetContainer>
  );
}

const styles = StyleSheet.create({
  content: {},
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  textInput: { paddingVertical: 8 },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  colorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CompetitorSheet;
