import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { StatusBadge, urgencyTone } from '@/components/ui/status-badge';
import {
  billCategoryLabels,
  billDueLabels,
  formatCurrency,
  formatDate,
} from '@/lib/format';
import { BillRecord } from '@/lib/types';
import { colors, radii, spacing } from '@/theme/tokens';

const categoryIcon: Record<BillRecord['category'], keyof typeof Ionicons.glyphMap> = {
  ELECTRICITY: 'flash-outline',
  WATER: 'water-outline',
  INTERNET: 'globe-outline',
  SERVICE_FEE: 'receipt-outline',
  SUBSCRIPTION: 'play-circle-outline',
  INSURANCE: 'shield-checkmark-outline',
  RENT: 'home-outline',
  OTHER: 'wallet-outline',
};

export function BillCard({
  bill,
  onPress,
  compact = false,
}: {
  bill: BillRecord;
  onPress?: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${bill.title}, ${formatCurrency(bill.amount, bill.currency)}, ${billDueLabels[bill.dueStatus]}`}
      onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.card, compact && styles.compact, pressed && styles.pressed]}>
          <View style={styles.icon}>
            <Ionicons
              name={categoryIcon[bill.category]}
              size={22}
              color={colors.primary}
            />
          </View>
          <View style={styles.content}>
            <View style={styles.topRow}>
              <AppText variant="bodyMedium" numberOfLines={1} style={styles.title}>
                {bill.title}
              </AppText>
              {!compact ? (
                <StatusBadge
                  label={billDueLabels[bill.dueStatus]}
                  tone={urgencyTone(bill.dueStatus)}
                />
              ) : null}
            </View>
            <View style={styles.bottomRow}>
              <AppText variant="supporting" color={colors.inkMuted}>
                Hạn {formatDate(bill.nextDueDate, true)}
              </AppText>
              <AppText variant="bodyMedium" color={colors.primary}>
                {formatCurrency(bill.amount, bill.currency)}
              </AppText>
            </View>
            {compact ? (
              <AppText variant="label" color={colors.inkMuted}>
                {billCategoryLabels[bill.category]} · {billDueLabels[bill.dueStatus]}
              </AppText>
            ) : null}
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  compact: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.transparent,
  },
  pressed: {
    opacity: 0.78,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
