import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { useTheme } from '../../theme/useTheme';

export interface BottomSheetContainerProps {
  /** Whether the underlying Modal is rendered */
  modalVisible: boolean;
  /** Animated overlay opacity (from useBottomSheet) */
  overlayOpacity: Animated.Value;
  /** Animated sheet translateY (from useBottomSheet) */
  sheetTranslateY: Animated.Value;
  /** Bottom padding for content (keyboard or safe area, from useBottomSheet) */
  contentBottomPadding: number;
  /** Called when the overlay is tapped or Android back is pressed */
  onClose: () => void;
  /** Sheet content */
  children: React.ReactNode;
}

/**
 * Shared JSX wrapper for bottom sheet modals.
 *
 * Renders: Modal > dark overlay (tap to close) > animated sheet surface
 * with rounded top corners, shadow, and keyboard-aware bottom padding.
 *
 * Pair with `useBottomSheet` to get the animated values and modal state.
 */
export function BottomSheetContainer({
  modalVisible,
  overlayOpacity,
  sheetTranslateY,
  contentBottomPadding,
  onClose,
  children,
}: BottomSheetContainerProps) {
  const { colors, radius, shadows } = useTheme();

  if (!modalVisible) return null;

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.large,
              borderTopRightRadius: radius.large,
              paddingBottom: contentBottomPadding,
              transform: [{ translateY: sheetTranslateY }],
              ...shadows.medium,
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default BottomSheetContainer;
