import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { colors, layout, radii, shadows, spacing } from '@/theme/tokens';

export type ConfirmationSheetStatus = 'confirm' | 'loading' | 'success' | 'error';

interface ConfirmationSheetProps {
  visible: boolean;
  status: ConfirmationSheetStatus;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
  children?: ReactNode;
  cancelLabel?: string;
  loadingTitle?: string;
  loadingDescription?: string;
  successTitle?: string;
  successDescription?: string;
  errorTitle?: string;
  errorDescription?: string;
  retryLabel?: string;
  doneLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'primary' | 'danger';
  confirmVariant?: 'primary' | 'danger';
  testID?: string;
}

const ENTER_DURATION = 200;
const EXIT_DURATION = 150;
const STATE_DURATION = 160;
const easeOutQuint = Easing.bezier(0.22, 1, 0.36, 1);
const useNativeDriver = Platform.OS !== 'web';

export function ConfirmationSheet({
  visible,
  status,
  title,
  description,
  confirmLabel,
  onConfirm,
  onDismiss,
  children,
  cancelLabel = 'Để sau',
  loadingTitle = 'Đang xử lý',
  loadingDescription = 'Vui lòng giữ ứng dụng mở trong giây lát.',
  successTitle = 'Đã hoàn tất',
  successDescription = 'Thay đổi của bạn đã được lưu.',
  errorTitle = 'Chưa thể hoàn tất',
  errorDescription = 'Đã có lỗi xảy ra. Bạn có thể thử lại ngay.',
  retryLabel = 'Thử lại',
  doneLabel = 'Xong',
  icon: confirmIcon = 'checkmark-circle-outline',
  tone: confirmTone = 'primary',
  confirmVariant = 'primary',
  testID,
}: ConfirmationSheetProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [sheetProgress] = useState(() => new Animated.Value(0));
  const [contentProgress] = useState(() => new Animated.Value(1));
  const previousStatus = useRef(status);
  const dismissing = useRef(false);
  const dismissible = status !== 'loading';

  useEffect(() => {
    if (!visible) return;
    dismissing.current = false;
    AccessibilityInfo.announceForAccessibility(`${title}. ${description}`);

    if (reducedMotion) {
      sheetProgress.setValue(1);
      return;
    }

    sheetProgress.setValue(0);
    Animated.timing(sheetProgress, {
      toValue: 1,
      duration: ENTER_DURATION,
      easing: easeOutQuint,
      useNativeDriver,
    }).start();
  }, [description, reducedMotion, sheetProgress, title, visible]);

  useEffect(() => {
    if (!visible || previousStatus.current === status) return;
    previousStatus.current = status;

    const announcement =
      status === 'loading'
        ? loadingTitle
        : status === 'success'
          ? successTitle
          : status === 'error'
            ? `${errorTitle}. ${errorDescription}`
            : title;
    AccessibilityInfo.announceForAccessibility(announcement);

    if (reducedMotion) {
      contentProgress.setValue(1);
      return;
    }

    contentProgress.setValue(0);
    Animated.timing(contentProgress, {
      toValue: 1,
      duration: STATE_DURATION,
      easing: easeOutQuint,
      useNativeDriver,
    }).start();
  }, [
    contentProgress,
    errorDescription,
    errorTitle,
    loadingTitle,
    reducedMotion,
    status,
    successTitle,
    title,
    visible,
  ]);

  useEffect(
    () => () => {
      sheetProgress.stopAnimation();
      contentProgress.stopAnimation();
    },
    [contentProgress, sheetProgress],
  );

  if (!visible) return null;

  const sheetTitle =
    status === 'loading'
      ? loadingTitle
      : status === 'success'
        ? successTitle
        : status === 'error'
          ? errorTitle
          : title;
  const sheetDescription =
    status === 'loading'
      ? loadingDescription
      : status === 'success'
        ? successDescription
        : status === 'error'
          ? errorDescription
          : description;

  const icon = getStateIcon(status, reducedMotion, confirmIcon);
  const tone = getStateTone(status, confirmTone);
  const sheetTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [36, 0],
  });
  const contentTranslateY = contentProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  function dismiss() {
    if (!dismissible || dismissing.current) return;
    dismissing.current = true;

    if (reducedMotion) {
      onDismiss();
      return;
    }

    Animated.timing(sheetProgress, {
      toValue: 0,
      duration: EXIT_DURATION,
      easing: easeOutQuint,
      useNativeDriver,
    }).start(({ finished }) => {
      dismissing.current = false;
      if (finished) onDismiss();
    });
  }

  return (
    <Modal
      animationType="none"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={dismiss}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.modal} testID={testID}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: sheetProgress, pointerEvents: 'none' },
          ]}
        />
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no"
          disabled={!dismissible}
          onPress={dismiss}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={dismiss}
          style={[
            styles.sheet,
            shadows.sheet,
            {
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              opacity: sheetProgress,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}>
          <View accessibilityElementsHidden importantForAccessibility="no" style={styles.handle} />

          <Animated.View
            style={[
              styles.content,
              {
                opacity: contentProgress,
                transform: [{ translateY: contentTranslateY }],
              },
            ]}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[styles.iconCircle, { backgroundColor: tone.backgroundColor }]}>
              {icon === 'spinner' ? (
                <ActivityIndicator color={tone.foregroundColor} />
              ) : (
                <Ionicons name={icon} size={28} color={tone.foregroundColor} />
              )}
            </View>

            <View style={styles.copy}>
              <AppText accessibilityRole="header" variant="title" style={styles.centerText}>
                {sheetTitle}
              </AppText>
              <AppText
                color={colors.inkMuted}
                style={styles.centerText}
                variant="supporting">
                {sheetDescription}
              </AppText>
            </View>

            {status === 'confirm' && children ? (
              <View style={styles.summary}>{children}</View>
            ) : null}

            <View style={styles.actions}>{renderActions()}</View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );

  function renderActions() {
    if (status === 'loading') {
      return (
        <Button
          accessibilityHint="Yêu cầu đang được xử lý"
          disabled
          fullWidth
          label={loadingTitle}
          loading
        />
      );
    }

    if (status === 'success') {
      return (
        <Button
          accessibilityHint="Đóng thông báo"
          fullWidth
          icon="checkmark"
          label={doneLabel}
          onPress={dismiss}
        />
      );
    }

    if (status === 'error') {
      return (
        <>
          <Button
            accessibilityHint="Thử thực hiện lại yêu cầu"
            fullWidth
            icon="refresh"
            label={retryLabel}
            onPress={onConfirm}
          />
          <Button fullWidth label="Đóng" onPress={dismiss} variant="ghost" />
        </>
      );
    }

    return (
      <>
        <Button
          accessibilityHint="Hủy yêu cầu và đóng hộp thoại"
          fullWidth
          label={cancelLabel}
          onPress={dismiss}
          variant="secondary"
        />
        <Button
          accessibilityHint="Xác nhận thực hiện yêu cầu"
          fullWidth
          icon={confirmIcon}
          label={confirmLabel}
          onPress={onConfirm}
          variant={confirmVariant}
        />
      </>
    );
  }
}

function getStateIcon(
  status: ConfirmationSheetStatus,
  reducedMotion: boolean,
  confirmIcon: keyof typeof Ionicons.glyphMap,
): keyof typeof Ionicons.glyphMap | 'spinner' {
  if (status === 'loading') return reducedMotion ? 'time-outline' : 'spinner';
  if (status === 'success') return 'checkmark-circle';
  if (status === 'error') return 'alert-circle';
  return confirmIcon;
}

function getStateTone(
  status: ConfirmationSheetStatus,
  confirmTone: 'primary' | 'danger',
) {
  if (status === 'success') {
    return { backgroundColor: colors.successSoft, foregroundColor: colors.success };
  }
  if (status === 'error') {
    return { backgroundColor: colors.dangerSoft, foregroundColor: colors.danger };
  }
  if (confirmTone === 'danger') {
    return { backgroundColor: colors.dangerSoft, foregroundColor: colors.danger };
  }
  return { backgroundColor: colors.primarySoft, foregroundColor: colors.primary };
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(11, 28, 48, 0.48)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.sm,
    width: '100%',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 4,
    marginBottom: spacing.lg,
    width: 40,
  },
  content: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 440,
  },
  centerText: {
    textAlign: 'center',
  },
  summary: {
    alignSelf: 'stretch',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    width: '100%',
  },
});
