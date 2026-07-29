import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing } from '@/theme/tokens';

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const tones = {
  success: { background: colors.successSoft, foreground: colors.success },
  warning: { background: colors.warningSoft, foreground: colors.warning },
  danger: { background: colors.dangerSoft, foreground: colors.danger },
  info: { background: colors.primarySoft, foreground: colors.primary },
  neutral: { background: colors.primarySurface, foreground: colors.inkMuted },
};

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: StatusTone;
}) {
  const palette = tones[tone];
  return (
    <View
      accessibilityLabel={`Trạng thái: ${label}`}
      style={[styles.badge, { backgroundColor: palette.background }]}>
      <AppText
        variant="labelStrong"
        color={palette.foreground}
        numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

export function urgencyTone(value: string): StatusTone {
  if (['EXPIRED', 'CRITICAL', 'OVERDUE'].includes(value)) return 'danger';
  if (['WARNING', 'DUE_TODAY', 'DUE_SOON', 'ENDING_SOON'].includes(value)) {
    return 'warning';
  }
  if (['SAFE', 'VALID', 'INACTIVE'].includes(value)) return 'success';
  return 'info';
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
