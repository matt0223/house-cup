import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { useBottomSheet } from '../../hooks/useBottomSheet';
import { BottomSheetContainer } from '../ui/BottomSheetContainer';
import { ColorPicker } from '../ui/ColorPicker';
import { availableCompetitorColors } from '../../domain/models/Competitor';

export interface AddHousemateSheetProps {
  /** Whether the sheet is visible */
  isVisible: boolean;
  /** Called when sheet should close */
  onClose: () => void;
  /** Called when user saves (adds housemate) */
  onSave: (name: string, color: string) => void;
  /** Called when user taps Invite (add housemate then share). Returns a
   * promise that resolves once the share sheet has been dismissed; the
   * sheet stays open (as a backdrop) until then so iOS can stack the
   * share sheet on top without a presentation race. */
  onInvite: (name: string, color: string) => Promise<void>;
  /** Color already used by competitor A (unavailable for picker) */
  competitorAColor?: string;
}

const EXPAND_DURATION = 200;
const COLOR_PICKER_HEIGHT = 52; // 36px swatches + 12px top padding + 4px bottom buffer

/**
 * Bottom sheet to add a housemate.
 * Mirrors CompetitorSheet layout: text input, compact color dot + chevron,
 * expandable color picker, Invite + checkmark buttons.
 */
export function AddHousemateSheet({
  isVisible,
  onClose,
  onSave,
  onInvite,
  competitorAColor,
}: AddHousemateSheetProps) {
  const { colors, typography, spacing } = useTheme();
  const { modalVisible, overlayOpacity, sheetTranslateY, contentBottomPadding, inputRef } =
    useBottomSheet(isVisible);

  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(availableCompetitorColors[0].hex);
  const [isColorExpanded, setIsColorExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation values for color picker expand/collapse
  const colorPickerHeight = useRef(new Animated.Value(0)).current;
  const colorPickerOpacity = useRef(new Animated.Value(0)).current;

  // Reset form when sheet opens
  useEffect(() => {
    if (isVisible) {
      setName('');
      setIsColorExpanded(false);
      setIsSubmitting(false);
      colorPickerHeight.setValue(0);
      colorPickerOpacity.setValue(0);
      const next = competitorAColor
        ? availableCompetitorColors.find((c) => c.hex !== competitorAColor)?.hex ?? availableCompetitorColors[0].hex
        : availableCompetitorColors[0].hex;
      setColor(next);
    }
  }, [isVisible, competitorAColor]);

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

  const handleSave = useCallback(() => {
    if (!name.trim() || !color || isSubmitting) return;
    onSave(name.trim(), color);
    onClose();
  }, [name, color, onSave, onClose, isSubmitting]);

  // Await the parent's onInvite — which adds the housemate and presents
  // the iOS share sheet — before closing this bottom sheet. Closing first
  // races with Share.share() and causes iOS to flash and dismiss the
  // share sheet (the freeze symptom).
  const handleInvite = useCallback(async () => {
    if (!name.trim() || !color || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onInvite(name.trim(), color);
    } catch (err) {
      console.error('Invite failed:', err);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  }, [name, color, onInvite, onClose, isSubmitting]);

  const canSubmit = name.trim().length > 0 && color.length > 0;

  // Silent discard on dismiss: one-time action, user knows if they didn't finish
  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

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

          {/* Invite button (visible only when name is entered) */}
          {canSubmit && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary + '15', marginRight: spacing.xs }]}
              onPress={handleInvite}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={[typography.callout, { color: colors.primary }]}>Invite</Text>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="paper-plane-outline" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}

          {/* Save / checkmark button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: canSubmit && !isSubmitting ? colors.primary : colors.border }]}
            onPress={handleSave}
            disabled={!canSubmit || isSubmitting}
            activeOpacity={0.8}
            accessibilityLabel="Save"
            accessibilityRole="button"
          >
            <Ionicons name="checkmark" size={20} color={canSubmit && !isSubmitting ? '#FFFFFF' : colors.textSecondary} />
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
            unavailableColors={competitorAColor ? [competitorAColor] : []}
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

export default AddHousemateSheet;
