import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
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
import { RepeatDayPicker } from '../ui/RepeatDayPicker';
import { KebabButton } from '../ui/KebabButton';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { UnsavedChangesModal } from '../ui/UnsavedChangesModal';
import { Competitor } from '../../domain/models/Competitor';
import { TaskInstance } from '../../domain/models/TaskInstance';
import { WeekStartDay } from '../../domain/models/Household';
import { formatRepeatDays } from '../../domain/services';
import { trackUnsavedChangesShown } from '../../services/analytics';

/** Scope for applying changes to recurring tasks */
export type ChangeScope = 'today' | 'future';

/** Changes that can be made to a task */
export interface TaskChanges {
  name?: string;
  points?: Record<string, number>;
  repeatDays?: number[];
}

export interface AddTaskSheetProps {
  /** Whether the sheet is visible */
  isVisible: boolean;
  /** Called when sheet should close */
  onClose: () => void;
  /** Called when a new task is submitted (add mode) */
  onSubmit: (
    name: string,
    points: Record<string, number>,
    repeatDays: number[] | null
  ) => void;
  /** Task being edited (if set, sheet is in edit mode) */
  editingTask?: TaskInstance | null;
  /** Initial repeat days for the task being edited (from template lookup) */
  initialRepeatDays?: number[];
  /** Called when task is updated (edit mode) */
  onUpdate?: (
    taskId: string,
    changes: TaskChanges,
    scope: ChangeScope
  ) => void;
  /** Called when task is deleted (edit mode) */
  onDelete?: (taskId: string, scope: ChangeScope) => void;
  /** Competitors to show points chips for */
  competitors: Competitor[];
  /** Day the week starts (0-6) - determines day picker order */
  weekStartDay?: WeekStartDay;
}

const OVERLAY_DURATION = 250;
const OPEN_SHEET_DURATION = 350;
const CLOSE_SHEET_DURATION = 300;
const EXPAND_DURATION = 200;
const DAY_PICKER_HEIGHT = 66; // 36px chips + ~15px top/bottom gap (centered)
const ACTIONS_AREA_HEIGHT = 66;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type ExpandedArea = 'none' | 'dayPicker' | 'actions';

/**
 * Bottom sheet modal for adding or editing tasks.
 * Supports setting repeat days for recurring tasks.
 */
export function AddTaskSheet({
  isVisible,
  onClose,
  onSubmit,
  editingTask,
  initialRepeatDays = [],
  onUpdate,
  onDelete,
  competitors,
  weekStartDay = 0,
}: AddTaskSheetProps) {
  const { colors, typography, spacing, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const expandedAreaHeight = useRef(new Animated.Value(0)).current;
  const expandedAreaOpacity = useRef(new Animated.Value(0)).current;

  // Keyboard height tracking
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Form state
  const [taskName, setTaskName] = useState('');
  const [points, setPoints] = useState<Record<string, number>>({});
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Expanded area state (day picker or actions menu)
  const [expandedArea, setExpandedArea] = useState<ExpandedArea>('none');

  // Original values for change detection (edit mode)
  const [originalName, setOriginalName] = useState('');
  const [originalRepeatDays, setOriginalRepeatDays] = useState<number[]>([]);

  // Confirmation modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalType, setConfirmModalType] = useState<'name' | 'delete'>('name');

  // Unsaved changes modal state
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Derived state
  const isEditMode = editingTask !== null && editingTask !== undefined;
  const isRecurring = isEditMode && editingTask?.templateId !== null;

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

  // Pre-populate form when editing task changes
  useEffect(() => {
    if (editingTask) {
      setTaskName(editingTask.name);
      setPoints({ ...editingTask.points });
      setRepeatDays([...initialRepeatDays]);
      setOriginalName(editingTask.name);
      setOriginalRepeatDays([...initialRepeatDays]);
    }
  }, [editingTask, initialRepeatDays]);

  // Handle visibility changes with animations
  useEffect(() => {
    if (isVisible) {
      setModalVisible(true);

      // Reset form for add mode, edit mode is handled by editingTask effect
      if (!editingTask) {
        setTaskName('');
        setPoints({});
        setRepeatDays([]);
        setOriginalName('');
        setOriginalRepeatDays([]);
      }

      // Stop any running animations
      sheetTranslateY.stopAnimation();
      overlayOpacity.stopAnimation();

      // Reset animation values
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      overlayOpacity.setValue(0);
      expandedAreaHeight.setValue(0);
      expandedAreaOpacity.setValue(0);
      setExpandedArea('none');

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
        setExpandedArea('none');
        expandedAreaHeight.setValue(0);
        expandedAreaOpacity.setValue(0);
        setConfirmModalVisible(false);
        setShowUnsavedModal(false);
      });
    }
  }, [isVisible, editingTask]);

  // Animate expanded area based on state
  useEffect(() => {
    const targetHeight =
      expandedArea === 'dayPicker'
        ? DAY_PICKER_HEIGHT
        : expandedArea === 'actions'
        ? ACTIONS_AREA_HEIGHT
        : 0;

    Animated.parallel([
      Animated.timing(expandedAreaHeight, {
        toValue: targetHeight,
        duration: EXPAND_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(expandedAreaOpacity, {
        toValue: expandedArea !== 'none' ? 1 : 0,
        duration: EXPAND_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  }, [expandedArea]);

  // Reset form for add mode (but keep sheet open)
  const resetForm = useCallback(() => {
    setTaskName('');
    setPoints({});
    setRepeatDays([]);
    setExpandedArea('none');
    expandedAreaHeight.setValue(0);
    expandedAreaOpacity.setValue(0);
    inputRef.current?.focus();
  }, [expandedAreaHeight, expandedAreaOpacity]);

  // Handle points chip tap - cycle 0→1→2→3→0
  const handlePointsTap = (competitorId: string) => {
    const currentPoints = points[competitorId] ?? 0;
    const newPoints = (currentPoints + 1) % 4;
    setPoints((prev) => ({ ...prev, [competitorId]: newPoints }));
  };

  // Handle repeat pill tap - toggle day picker
  const handleRepeatPillPress = () => {
    setExpandedArea((prev) => (prev === 'dayPicker' ? 'none' : 'dayPicker'));
  };

  // Handle kebab button tap - toggle actions area
  const handleKebabPress = () => {
    setExpandedArea((prev) => (prev === 'actions' ? 'none' : 'actions'));
  };

  // Check if name has changed
  const hasNameChanged = taskName.trim() !== originalName;

  // Check if schedule has changed
  const hasScheduleChanged = (() => {
    const sorted1 = [...repeatDays].sort();
    const sorted2 = [...originalRepeatDays].sort();
    if (sorted1.length !== sorted2.length) return true;
    return sorted1.some((v, i) => v !== sorted2[i]);
  })();

  // Check if points have changed (edit mode only)
  const hasPointsChanged = isEditMode && editingTask
    ? (() => {
        const orig = editingTask.points ?? {};
        const allIds = new Set([...Object.keys(orig), ...Object.keys(points)]);
        for (const id of allIds) {
          if ((orig[id] ?? 0) !== (points[id] ?? 0)) return true;
        }
        return false;
      })()
    : false;

  // Whether the form has any unsaved edits (edit mode) or any content (add mode)
  const hasDirtyState = isEditMode
    ? hasNameChanged || hasPointsChanged || hasScheduleChanged
    : taskName.trim().length > 0;

  // Intercept dismiss — show unsaved modal if dirty, otherwise close
  const handleDismiss = useCallback(() => {
    if (hasDirtyState) {
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  }, [hasDirtyState, onClose]);

  // Unsaved modal callbacks
  const sheetNameForAnalytics = isEditMode ? 'edit task' : 'add task';
  const unsavedAnalyticsProps = {
    'sheet name': sheetNameForAnalytics,
    'has name change': hasNameChanged,
    'has points change': hasPointsChanged,
    'has schedule change': hasScheduleChanged,
  };

  const handleUnsavedDiscard = useCallback(() => {
    trackUnsavedChangesShown({ ...unsavedAnalyticsProps, 'action taken': 'discard' });
    setShowUnsavedModal(false);
    onClose();
  }, [unsavedAnalyticsProps, onClose]);

  const handleUnsavedKeepEditing = useCallback(() => {
    trackUnsavedChangesShown({ ...unsavedAnalyticsProps, 'action taken': 'keep editing' });
    setShowUnsavedModal(false);
  }, [unsavedAnalyticsProps]);

  const handleUnsavedSave = useCallback(() => {
    trackUnsavedChangesShown({ ...unsavedAnalyticsProps, 'action taken': 'save' });
    setShowUnsavedModal(false);
    handleSubmit();
  }, [unsavedAnalyticsProps]);

  // Handle submit (add or edit)
  const handleSubmit = () => {
    if (!taskName.trim()) return;

    if (isEditMode && editingTask) {
      // Edit mode
      if (isRecurring && hasNameChanged) {
        // Need to ask user about scope for name change
        setConfirmModalType('name');
        setConfirmModalVisible(true);
      } else {
        // No name change on recurring, or one-off task - just save
        applyChanges('today');
      }
    } else {
      // Add mode
      onSubmit(
        taskName.trim(),
        points,
        repeatDays.length > 0 ? repeatDays : null
      );
      resetForm();
    }
  };

  // Apply changes with the given scope
  const applyChanges = (scope: ChangeScope) => {
    if (!editingTask || !onUpdate) return;

    const changes: TaskChanges = {};

    // Name change
    if (hasNameChanged) {
      changes.name = taskName.trim();
    }

    // Points always go to instance
    changes.points = points;

    // Schedule changes always go to template
    if (hasScheduleChanged) {
      changes.repeatDays = repeatDays;
    }

    onUpdate(editingTask.id, changes, scope);
    setConfirmModalVisible(false);
    onClose();
  };

  // Handle delete action
  const handleDeletePress = () => {
    if (isRecurring) {
      setConfirmModalType('delete');
      setConfirmModalVisible(true);
    } else {
      // One-off task - just delete
      if (editingTask && onDelete) {
        onDelete(editingTask.id, 'today');
        onClose();
      }
    }
  };

  // Handle confirmation modal selection
  const handleConfirmSelect = (optionId: string) => {
    if (optionId === 'today' || optionId === 'future') {
      if (confirmModalType === 'delete') {
        if (editingTask && onDelete) {
          onDelete(editingTask.id, optionId);
          onClose();
        }
      } else {
        applyChanges(optionId);
      }
    }
    setConfirmModalVisible(false);
  };

  const isSubmitEnabled = taskName.trim().length > 0;
  const hasRepeatDays = repeatDays.length > 0;
  const repeatLabel = hasRepeatDays
    ? `Repeats on ${formatRepeatDays(repeatDays, weekStartDay)}`
    : 'Does not repeat';

  // Confirmation modal options
  const confirmOptions =
    confirmModalType === 'delete'
      ? [
          { id: 'today', label: 'Today only' },
          { id: 'future', label: 'This and all without points', isDestructive: true },
        ]
      : [
          { id: 'today', label: 'Today only' },
          { id: 'future', label: 'This and all without points' },
        ];

  const confirmTitle =
    confirmModalType === 'delete'
      ? 'Delete this task?'
      : 'Apply name change to:';

  if (!modalVisible) return null;

  const contentBottomPadding = keyboardHeight > 0 ? keyboardHeight : insets.bottom;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
        <View style={styles.modalContainer}>
          {/* Layer 1: Dark Overlay */}
          <TouchableWithoutFeedback onPress={handleDismiss}>
            <Animated.View
              style={[styles.overlay, { opacity: overlayOpacity }]}
            />
          </TouchableWithoutFeedback>

          {/* Layer 2: Sheet */}
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
                    { color: colors.textPrimary, flex: 1, letterSpacing: 0 },
                  ]}
                  placeholder="e.g., Take out trash"
                  placeholderTextColor={colors.textSecondary}
                  value={taskName}
                  onChangeText={setTaskName}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  blurOnSubmit={false}
                  maxFontSizeMultiplier={1.2}
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
                <View style={[styles.pillsRow, { gap: spacing.xs }]}>
                  <RepeatPill
                    label={repeatLabel}
                    onPress={handleRepeatPillPress}
                  />
                  {isEditMode && (
                    <KebabButton onPress={handleKebabPress} />
                  )}
                </View>

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
                  accessibilityLabel={isEditMode ? 'Save task' : 'Create task'}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={isEditMode ? 'checkmark' : 'arrow-up'}
                    size={20}
                    color={isSubmitEnabled ? '#FFFFFF' : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Expanded area (day picker OR actions menu) */}
              <Animated.View
                style={[
                  styles.expandedArea,
                  {
                    height: expandedAreaHeight,
                    opacity: expandedAreaOpacity,
                  },
                ]}
              >
                {expandedArea === 'dayPicker' && (
                  <RepeatDayPicker
                    selectedDays={repeatDays}
                    onDaysChange={setRepeatDays}
                    weekStartDay={weekStartDay}
                    todayDay={new Date().getDay()}
                  />
                )}
                {expandedArea === 'actions' && (
                  <View style={styles.actionsMenu}>
                    <TouchableOpacity
                      style={[
                        styles.deleteButton,
                        {
                          backgroundColor: colors.background,
                          borderRadius: radius.medium,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.md,
                        },
                      ]}
                      onPress={handleDeletePress}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.error}
                        style={{ marginRight: spacing.xs }}
                      />
                      <Text style={[typography.body, { color: colors.error }]}>
                        Delete task
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            </View>
          </Animated.View>
          {/* Confirmation Modal - rendered last for highest z-index */}
          <ConfirmationModal
            visible={confirmModalVisible}
            title={confirmTitle}
            options={confirmOptions}
            onSelect={handleConfirmSelect}
            onCancel={() => setConfirmModalVisible(false)}
            embedded
          />
          {/* Unsaved Changes Modal */}
          <UnsavedChangesModal
            visible={showUnsavedModal}
            onDiscard={handleUnsavedDiscard}
            onKeepEditing={handleUnsavedKeepEditing}
            onSave={handleUnsavedSave}
          />
        </View>
      </Modal>
  );
}

const SUBMIT_BUTTON_SIZE = 44;

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
  expandedArea: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButton: {
    width: SUBMIT_BUTTON_SIZE,
    height: SUBMIT_BUTTON_SIZE,
    borderRadius: SUBMIT_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsMenu: {
    alignItems: 'flex-start',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AddTaskSheet;
