import { useRef, useState, useEffect } from 'react';
import { Animated, Keyboard, Platform, Easing, Dimensions, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OVERLAY_DURATION = 250;
const OPEN_SHEET_DURATION = 350;
const CLOSE_SHEET_DURATION = 300;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface UseBottomSheetOptions {
  /** Whether to auto-focus the inputRef when the sheet opens (default: true) */
  autoFocus?: boolean;
}

export interface UseBottomSheetReturn {
  /** Whether the Modal should be rendered */
  modalVisible: boolean;
  /** Animated opacity for the dark overlay (0-1) */
  overlayOpacity: Animated.Value;
  /** Animated translateY for the sheet (SCREEN_HEIGHT -> 0) */
  sheetTranslateY: Animated.Value;
  /** Bottom padding: keyboard height when open, safe area bottom when closed */
  contentBottomPadding: number;
  /** Ref to attach to the primary TextInput for auto-focus */
  inputRef: React.RefObject<TextInput>;
}

/**
 * Shared logic for bottom sheet modals.
 *
 * Handles:
 * - Modal mount/unmount state
 * - Overlay fade + sheet slide animations (open & close)
 * - Keyboard height tracking (platform-aware)
 * - Auto-focus on open, keyboard dismiss on close
 * - Content bottom padding (keyboard or safe area)
 */
export function useBottomSheet(
  isVisible: boolean,
  options?: UseBottomSheetOptions,
): UseBottomSheetReturn {
  const { autoFocus = true } = options ?? {};
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [modalVisible, setModalVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Keyboard tracking
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Open / close animations
  useEffect(() => {
    if (isVisible) {
      setModalVisible(true);
      sheetTranslateY.stopAnimation();
      overlayOpacity.stopAnimation();
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: OVERLAY_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: OPEN_SHEET_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
      if (autoFocus) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } else {
      Keyboard.dismiss();
      sheetTranslateY.stopAnimation();
      overlayOpacity.stopAnimation();
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: OVERLAY_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_HEIGHT,
          duration: CLOSE_SHEET_DURATION,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    }
  }, [isVisible]);

  const contentBottomPadding = keyboardHeight > 0 ? keyboardHeight - 8 : insets.bottom;

  return {
    modalVisible,
    overlayOpacity,
    sheetTranslateY,
    contentBottomPadding,
    inputRef,
  };
}
