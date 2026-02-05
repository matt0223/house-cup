import React, { useRef, ReactNode } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { ColorPicker } from './ColorPicker';
import { Competitor } from '../../domain/models/Competitor';

export interface CompetitorRowProps {
  /** The competitor data */
  competitor: Competitor;
  /** Called when name changes */
  onNameChange: (name: string) => void;
  /** Called when color changes */
  onColorChange: (color: string) => void;
  /** Whether the color picker is expanded */
  isExpanded: boolean;
  /** Called when avatar is tapped to toggle color picker */
  onToggleExpand: () => void;
  /** Colors that are unavailable (used by other competitor) */
  unavailableColors?: string[];
  /** Show divider below */
  showDivider?: boolean;
  /** Status label to show (e.g., "Invite Sent") */
  statusLabel?: string;
  /** Action element to render (e.g., Resend Invite button) */
  actionElement?: ReactNode;
  /** Placeholder text for name input */
  placeholder?: string;
  /** Called when name input gains focus */
  onFocus?: () => void;
  /** Called when name input loses focus */
  onBlur?: () => void;
}

/**
 * A consolidated competitor row with avatar (color picker trigger) and editable name.
 */
export function CompetitorRow({
  competitor,
  onNameChange,
  onColorChange,
  isExpanded,
  onToggleExpand,
  unavailableColors = [],
  showDivider = true,
  statusLabel,
  actionElement,
  placeholder = 'Enter name',
  onFocus,
  onBlur,
}: CompetitorRowProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const nameInputRef = useRef<TextInput>(null);

  const initial = competitor.name.charAt(0).toUpperCase();

  return (
    <View>
      {/* Main row */}
      <View
        style={[
          styles.row,
          { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
        ]}
      >
        {/* Avatar - tappable color circle */}
        <TouchableOpacity
          style={[
            styles.avatar,
            {
              backgroundColor: competitor.color,
              borderRadius: 20,
            },
          ]}
          onPress={onToggleExpand}
          activeOpacity={0.7}
          accessibilityLabel={`Change ${competitor.name || 'competitor'} color`}
          accessibilityHint="Tap to open color picker"
        >
          {initial ? (
            <Text style={[styles.avatarText, typography.headline]}>
              {initial}
            </Text>
          ) : (
            <Ionicons name="person" size={20} color="#FFFFFF" />
          )}
          {/* Small edit indicator */}
          <View
            style={[
              styles.editBadge,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={10} 
              color={colors.textSecondary} 
            />
          </View>
        </TouchableOpacity>

        {/* Name and status */}
        <View style={styles.nameContainer}>
          <TextInput
            ref={nameInputRef}
            style={[
              typography.body,
              styles.nameInput,
              { color: colors.textPrimary, letterSpacing: 0 },
            ]}
            value={competitor.name}
            onChangeText={onNameChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            onFocus={onFocus}
            onBlur={onBlur}
            maxFontSizeMultiplier={1.2}
          />
          {statusLabel && (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {statusLabel}
            </Text>
          )}
        </View>

        {/* Action element or edit indicator */}
        {actionElement || (
          <TouchableOpacity
            onPress={() => nameInputRef.current?.focus()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="pencil"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Color picker (expanded) */}
      {isExpanded && (
        <View
          style={[
            styles.colorPickerContainer,
            {
              padding: spacing.sm,
              backgroundColor: colors.background,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.divider,
            },
          ]}
        >
          <ColorPicker
            selectedColor={competitor.color}
            onColorSelect={onColorChange}
            unavailableColors={unavailableColors}
          />
        </View>
      )}

      {/* Divider */}
      {showDivider && !isExpanded && (
        <View
          style={[
            styles.divider,
            {
              backgroundColor: colors.divider,
              marginLeft: spacing.sm + 40 + spacing.xs,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  avatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  nameContainer: {
    flex: 1,
    marginLeft: 12,
  },
  nameInput: {
    paddingVertical: 4,
  },
  colorPickerContainer: {},
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});

export default CompetitorRow;
