import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Keyboard,
  Platform,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { PointsChip } from '../ui/PointsChip';
import { RepeatPill } from '../ui/RepeatPill';
import { Competitor } from '../../domain/models/Competitor';

export interface AddTaskSheetProps {
  /** Whether the sheet is visible */
  isVisible: boolean;
  /** Called when sheet should close */
  onClose: () => void;
  /** Called when task is submitted */
  onSubmit: (
    name: string,
    points: Record<string, number>,
    repeatDays: number[] | null
  ) => void;
  /** Competitors to show points chips for */
  competitors: Competitor[];
}

const OVERLAY_DURATION = 250;
const OPEN_SHEET_DURATION = 350; // 250ms keyboard + 100ms settle
const CLOSE_SHEET_DURATION = 300;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Bottom sheet modal for adding new tasks.
 * Sheet slides up with keyboard, settling shortly after for a cascading effect.
 */
export function AddTaskSheet({
  isVisible,
  onClose,
  onSubmit,
  competitors,
}: AddTaskSheetProps) {
  const { colors, typography, spacing, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Keyboard height tracking
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Form state
  const [taskName, setTaskName] = useState('');
  const [points, setPoints] = useState<Record<string, number>>({});
  const [modalVisible, setModalVisible] = useState(false);

  // Track keyboard events
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Handle visibility changes with animations
  useEffect(() => {
    if (isVisible) {
      setModalVisible(true);
      
      // Stop any running animations to prevent native driver conflicts on re-open
      sheetTranslateY.stopAnimation();
      overlayOpacity.stopAnimation();
      
      // Reset animation values
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      overlayOpacity.setValue(0);

      // Start animations
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

      // Focus input to trigger keyboard
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      // Dismiss keyboard immediately
      Keyboard.dismiss();

      // Stop any running animations
      sheetTranslateY.stopAnimation();
      overlayOpacity.stopAnimation();

      // Animate out
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
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [isVisible]);

  // Reset form (but keep sheet open)
  const resetForm = () => {
    setTaskName('');
    setPoints({});
    inputRef.current?.focus();
  };

  // Handle points chip tap - cycle 0→1→2→3→0
  const handlePointsTap = (competitorId: string) => {
    const currentPoints = points[competitorId] ?? 0;
    const newPoints = (currentPoints + 1) % 4;
    setPoints((prev) => ({ ...prev, [competitorId]: newPoints }));
  };

  // Handle submit
  const handleSubmit = () => {
    if (!taskName.trim()) return;

    onSubmit(taskName.trim(), points, null);
    resetForm();
  };

  const isSubmitEnabled = taskName.trim().length > 0;

  if (!modalVisible) return null;

  // Calculate where the content should sit (above keyboard)
  const contentBottomPadding = keyboardHeight > 0 ? keyboardHeight : insets.bottom;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Layer 1: Dark Overlay - fades in place */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.overlay,
              { opacity: overlayOpacity },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Layer 2: Sheet - slides up */}
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
          {/* Content area */}
          <View style={[styles.content, { padding: spacing.md }]}>
            {/* Input row */}
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.textInput,
                  typography.body,
                  { color: colors.textPrimary, flex: 1 },
                ]}
                placeholder="e.g., Take out trash"
                placeholderTextColor={colors.textSecondary}
                value={taskName}
                onChangeText={setTaskName}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                blurOnSubmit={false}
              />

              <View style={styles.chipsRow}>
                {competitors.map((competitor) => (
                  <PointsChip
                    key={competitor.id}
                    competitor={competitor}
                    points={points[competitor.id] ?? 0}
                    onPress={() => handlePointsTap(competitor.id)}
                  />
                ))}
              </View>
            </View>

            {/* Actions row */}
            <View style={[styles.actionsRow, { marginTop: spacing.sm }]}>
              <RepeatPill label="Does not repeat" />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: isSubmitEnabled
                      ? colors.primary
                      : colors.border,
                  },
                ]}
                onPress={handleSubmit}
                disabled={!isSubmitEnabled}
                activeOpacity={0.8}
                accessibilityLabel="Create task"
                accessibilityRole="button"
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={isSubmitEnabled ? '#FFFFFF' : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const SUBMIT_BUTTON_SIZE = 40;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
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
  content: {
    // Content sits at the top of the sheet
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    paddingVertical: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  submitButton: {
    width: SUBMIT_BUTTON_SIZE,
    height: SUBMIT_BUTTON_SIZE,
    borderRadius: SUBMIT_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AddTaskSheet;
