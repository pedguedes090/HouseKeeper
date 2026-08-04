import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { formatCurrency } from '@/lib/format';
import { budgetStateLabels } from '@/lib/spending-format';
import { SpendingJarSummary } from '@/lib/types';
import { colors, layout, radii, spacing } from '@/theme/tokens';

const stateColor = {
  UNSET: colors.inkMuted,
  NORMAL: colors.success,
  NEAR_LIMIT: colors.warning,
  OVER_LIMIT: colors.danger,
} as const;

export function SpendingJarRow({
  jar,
  onPress,
}: {
  jar: SpendingJarSummary;
  onPress?: () => void;
}) {
  const progress = Math.min(Math.max(jar.usagePercent, 0), 100);
  const color = stateColor[jar.state];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${jar.name}, ${budgetStateLabels[jar.state]}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: `${jar.color}18` }]}>
        <Ionicons
          name={jar.icon as keyof typeof Ionicons.glyphMap}
          size={21}
          color={jar.color}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.top}>
          <View style={styles.titleBlock}>
            <AppText variant="bodyMedium" numberOfLines={1}>
              {jar.name}
            </AppText>
            <AppText variant="label" color={color}>
              {budgetStateLabels[jar.state]}
              {jar.monthlyOverride ? ' · Hạn mức riêng tháng này' : ''}
            </AppText>
          </View>
          <View style={styles.amounts}>
            <AppText variant="supportingStrong">
              {formatCurrency(jar.spentAmount, jar.currency)}
            </AppText>
            <AppText variant="label" color={colors.inkMuted}>
              {jar.limitAmount > 0
                ? `/ ${formatCurrency(jar.limitAmount, jar.currency)}`
                : 'Chưa có hạn mức'}
            </AppText>
          </View>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(progress),
          }}
          style={styles.track}>
          <View style={[styles.fill, { backgroundColor: color, width: `${progress}%` }]} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 76,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.68,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    width: layout.minTouchTarget,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
  top: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
  },
  amounts: {
    alignItems: 'flex-end',
  },
  track: {
    backgroundColor: colors.borderSoft,
    borderRadius: radii.pill,
    height: 6,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radii.pill,
    height: '100%',
  },
});
