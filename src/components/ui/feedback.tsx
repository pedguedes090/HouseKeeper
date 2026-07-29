import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { colors, radii, spacing } from '@/theme/tokens';

export function LoadingState({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.state}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="supporting" color={colors.inkMuted}>
        {label}
      </AppText>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View accessibilityLiveRegion="assertive" style={styles.state}>
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
      </View>
      <AppText variant="title" style={styles.centerText}>
        Chưa thể tải dữ liệu
      </AppText>
      <AppText variant="supporting" color={colors.inkMuted} style={styles.centerText}>
        {message}
      </AppText>
      {onRetry ? <Button label="Thử lại" icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <AppText variant="title" style={styles.centerText}>
        {title}
      </AppText>
      <AppText variant="supporting" color={colors.inkMuted} style={styles.centerText}>
        {message}
      </AppText>
      {actionLabel ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

export function Skeleton({ height = 80 }: { height?: number }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 0.6 : 0.42);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.6;
      return;
    }
    opacity.value = withRepeat(withTiming(0.82, { duration: 720 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.skeleton, { height }, animatedStyle]} />;
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 260,
    padding: spacing.xl,
  },
  empty: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  centerText: {
    textAlign: 'center',
  },
  skeleton: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    width: '100%',
  },
});
