import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

export interface OptionPickerOption<T extends string> {
  id: T;
  label: string;
}

export interface OptionPickerModalProps<T extends string> {
  /** Whether the modal is visible */
  visible: boolean;
  /** Modal title */
  title: string;
  /** Available options */
  options: OptionPickerOption<T>[];
  /** Currently selected option ID */
  selectedId: T;
  /** Called when an option is selected */
  onSelect: (id: T) => void;
  /** Called when modal is dismissed */
  onClose: () => void;
}

/**
 * Reusable modal for selecting from a list of options.
 * Used for theme picker, day picker, etc.
 */
export function OptionPickerModal<T extends string>({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
}: OptionPickerModalProps<T>) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[
            styles.content,
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
            {title}
          </Text>
          {options.map((option) => {
            const isSelected = selectedId === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.option,
                  {
                    backgroundColor: isSelected
                      ? colors.primary + '15'
                      : 'transparent',
                    borderRadius: radius.small,
                  },
                ]}
                onPress={() => onSelect(option.id)}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      color: isSelected ? colors.primary : colors.textPrimary,
                      fontWeight: isSelected ? '600' : '400',
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    width: '100%',
    maxWidth: 320,
    padding: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 2,
  },
});

export default OptionPickerModal;
