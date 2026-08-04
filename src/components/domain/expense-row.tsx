import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ExpenseRecord } from '@/lib/types';
import { colors, radii, spacing } from '@/theme/tokens';

const sourceLabels = {
  MANUAL: 'Nhập tay',
  BILL_PAYMENT: 'Từ hóa đơn',
  SCAN: 'Từ biên lai',
} as const;

export function ExpenseRow({
  expense,
  onPress,
}: {
  expense: ExpenseRecord;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${expense.title}, ${formatCurrency(expense.amount, expense.currency)}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <Ionicons
          name={expense.sourceType === 'MANUAL' ? 'create-outline' : 'receipt-outline'}
          size={19}
          color={colors.primary}
        />
      </View>
      <View style={styles.content}>
        <AppText
          variant="bodyMedium"
          numberOfLines={1}
          style={expense.excludedFromStats ? styles.excluded : undefined}>
          {expense.title}
        </AppText>
        <AppText variant="label" color={colors.inkMuted} numberOfLines={1}>
          {formatDateTime(expense.spentAt)} · {sourceLabels[expense.sourceType]}
          {expense.excludedFromStats ? ' · Không tính thống kê' : ''}
        </AppText>
      </View>
      <AppText variant="supportingStrong" color={colors.ink}>
        {formatCurrency(expense.amount, expense.currency)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.68,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  content: {
    flex: 1,
  },
  excluded: {
    textDecorationLine: 'line-through',
  },
});
