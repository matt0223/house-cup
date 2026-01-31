import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../../theme/useTheme';

export interface ConfirmationOption {
  /** Unique identifier for the option */
  id: string;
  /** Display label */
  label: string;
  /** Whether this is a destructive action (shows in red) */
  isDestructive?: boolean;
}

export interface ConfirmationModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Title text (e.g., "Apply name change to:") */
  title: string;
  /** Options to display */
  options: ConfirmationOption[];
  /** Called when an option is selected */
  onSelect: (optionId: string) => void;
  /** Called when modal is dismissed (tapping outside or Cancel) */
  onCancel: () => void;
  /** 
   * If true, renders without Modal wrapper (for embedding inside another Modal).
   * Parent must handle visibility and positioning.
   */
  embedded?: boolean;
}

/**
 * A confirmation modal with a title and tappable options.
 * Used for recurring task edits and deletes.
 */
export function ConfirmationModal({
  visible,
  title,
  options,
  onSelect,
  onCancel,
  embedded = false,
}: ConfirmationModalProps) {
  const { colors, typography, spacing, radius, shadows } = useTheme();

  const content = (
    <TouchableWithoutFeedback onPress={onCancel}>
      <View style={[styles.overlay, embedded && styles.overlayEmbedded]}>
        <TouchableWithoutFeedback>
          <View
            style={[
              styles.container,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.large,
                padding: spacing.lg,
                marginHorizontal: spacing.lg,
                ...shadows.medium,
              },
            ]}
          >
            {/* Title */}
            <Text
              style={[
                typography.headline,
                { color: colors.textPrimary, marginBottom: spacing.md },
              ]}
            >
              {title}
            </Text>

            {/* Options */}
            <View style={[styles.options, { gap: spacing.xs }]}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: colors.background,
                      borderRadius: radius.medium,
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.md,
                    },
                  ]}
                  onPress={() => onSelect(option.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      typography.body,
                      {
                        color: option.isDestructive
                          ? colors.error
                          : colors.textPrimary,
                        textAlign: 'center',
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel button */}
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: spacing.md }]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  typography.body,
                  { color: colors.textSecondary, textAlign: 'center' },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );

  // When embedded, just return the content without Modal wrapper
  if (embedded) {
    if (!visible) return null;
    return content;
  }

  // Standalone mode - use Modal wrapper
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayEmbedded: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: '100%',
    maxWidth: 320,
  },
  options: {
    // gap is set inline
  },
  optionButton: {
    // styles set inline
  },
  cancelButton: {
    paddingVertical: 8,
  },
});

export default ConfirmationModal;
