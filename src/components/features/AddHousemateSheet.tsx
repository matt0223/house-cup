import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  /** Called when user taps Invite (add housemate then share) */
  onInvite: (name: string, color: string) => void;
  /** Color already used by competitor A (unavailable for picker) */
  competitorAColor?: string;
}

export function AddHousemateSheet({
  isVisible,
  onClose,
  onSave,
  onInvite,
  competitorAColor,
}: AddHousemateSheetProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const { modalVisible, overlayOpacity, sheetTranslateY, contentBottomPadding, inputRef } =
    useBottomSheet(isVisible);

  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState(availableCompetitorColors[0].hex);

  // Reset form when sheet opens
  useEffect(() => {
    if (isVisible) {
      setName('');
      const next = competitorAColor
        ? availableCompetitorColors.find((c) => c.hex !== competitorAColor)?.hex ?? availableCompetitorColors[0].hex
        : availableCompetitorColors[0].hex;
      setColor(next);
    }
  }, [isVisible, competitorAColor]);

  const handleSave = useCallback(() => {
    if (!name.trim() || !color) return;
    onSave(name.trim(), color);
    onClose();
  }, [name, color, onSave, onClose]);

  const handleInvite = useCallback(() => {
    if (!name.trim() || !color) return;
    onInvite(name.trim(), color);
    onClose();
  }, [name, color, onInvite, onClose]);

  const canSubmit = name.trim().length > 0 && color.length > 0;

  return (
    <BottomSheetContainer
      modalVisible={modalVisible}
      overlayOpacity={overlayOpacity}
      sheetTranslateY={sheetTranslateY}
      contentBottomPadding={contentBottomPadding}
      onClose={onClose}
    >
      <View style={[styles.content, { padding: spacing.md }]}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, typography.body, { color: colors.textPrimary, flex: 1 }]}
            placeholder="Housemate's name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            blurOnSubmit={false}
            maxFontSizeMultiplier={1.2}
          />
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Color
          </Text>
          <ColorPicker
            selectedColor={color}
            onColorSelect={setColor}
            unavailableColors={competitorAColor ? [competitorAColor] : []}
          />
        </View>
        <View style={[styles.actionsRow, { marginTop: spacing.md }]}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary + '15', flex: 1, marginRight: spacing.xs }]}
            onPress={handleInvite}
            disabled={!canSubmit}
            activeOpacity={0.7}
          >
            <Ionicons name="paper-plane-outline" size={18} color={colors.primary} />
            <Text style={[typography.callout, { color: colors.primary }]}>Invite</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, { backgroundColor: canSubmit ? colors.primary : colors.border }]}
            onPress={handleSave}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={20} color={canSubmit ? '#FFFFFF' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetContainer>
  );
}

const styles = StyleSheet.create({
  content: {},
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  textInput: { paddingVertical: 8 },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveButton: {
    width: 44,
  },
});

export default AddHousemateSheet;
