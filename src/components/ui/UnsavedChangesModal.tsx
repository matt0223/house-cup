import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  Keyboard,
} from 'react-native';
import { useTheme } from '../../theme/useTheme';

export interface UnsavedChangesModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called when user taps "Discard Changes" */
  onDiscard: () => void;
  /** Called when user taps "Keep Editing" */
  onKeepEditing: () => void;
  /** Called when user taps "Save & Close" */
  onSave: () => void;
}

/**
 * Modal shown when the user tries to dismiss a bottom sheet with unsaved edits.
 *
 * - Keyboard is dismissed on mount so the modal is fully visible.
 * - Outside taps are blocked — the user must choose an action.
 * - Layout (top to bottom): Title, body text, Save & Close (primary),
 *   Keep Editing (secondary/outline), Discard Changes (tertiary/red ghost).
 * - 250ms ease-out fade-in entrance animation.
 * - All buttons are disabled after Save & Close is tapped to prevent double-taps.
 */
export function UnsavedChangesModal({
  visible,
  onDiscard,
  onKeepEditing,
  onSave,
}: UnsavedChangesModalProps) {
  const { colors, typography, spacing, radius, shadows } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
      setSaving(false);
      setModalVisible(true);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  if (!modalVisible) return null;

  const handleSave = () => {
    setSaving(true);
    onSave();
  };

  return (
    <Modal visible={modalVisible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity }]}>
        <TouchableWithoutFeedback>
          <View style={styles.overlayFill} />
        </TouchableWithoutFeedback>

        <View style={styles.centerer}>
          <Animated.View
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
                { color: colors.textPrimary, marginBottom: spacing.xs },
              ]}
            >
              Unsaved changes
            </Text>

            {/* Body */}
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginBottom: spacing.lg },
              ]}
            >
              Are you sure you want to leave? Your changes will be lost.
            </Text>

            <View style={[styles.buttons, { gap: spacing.sm }]}>
              {/* Primary: Save & Close */}
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.medium,
                    paddingVertical: spacing.md,
                    opacity: saving ? 0.6 : 1,
                  },
                ]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      color: '#FFFFFF',
                      textAlign: 'center',
                      fontWeight: '600',
                    },
                  ]}
                >
                  Save & Close
                </Text>
              </TouchableOpacity>

              {/* Secondary: Keep Editing (outline/border style) */}
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.medium,
                    paddingVertical: spacing.md,
                    opacity: saving ? 0.4 : 1,
                  },
                ]}
                onPress={onKeepEditing}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.body,
                    { color: colors.textPrimary, textAlign: 'center' },
                  ]}
                >
                  Keep Editing
                </Text>
              </TouchableOpacity>

              {/* Tertiary: Discard Changes (ghost, red text) */}
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: 'transparent',
                    paddingVertical: spacing.md,
                    opacity: saving ? 0.4 : 1,
                  },
                ]}
                onPress={onDiscard}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.body,
                    { color: colors.error, textAlign: 'center' },
                  ]}
                >
                  Discard Changes
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayFill: {
    ...StyleSheet.absoluteFillObject,
  },
  centerer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 320,
  },
  buttons: {},
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default UnsavedChangesModal;
