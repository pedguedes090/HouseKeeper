import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/chip';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/feedback';
import { AppHeader, SectionHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { colors, radii, spacing } from '@/theme/tokens';

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string) {
  const [year, value] = month.split('-');
  return `Tháng ${Number(value)}/${year}`;
}

function shiftMonth(month: string, amount: number) {
  const [year, value] = month.split('-').map(Number);
  return monthKey(new Date(year, value - 1 + amount, 1));
}

export default function SpendingScreen() {
  const router = useRouter();
  const [month, setMonth] = useState(monthKey(new Date()));
  const overview = useQuery({
    queryKey: queryKeys.spendingOverview(month),
    queryFn: () => housekeeperApi.getSpendingOverview(month),
  });
  const jarChoices = useMemo(
    () => [
      { value: shiftMonth(month, -1), label: monthLabel(shiftMonth(month, -1)) },
      { value: month, label: monthLabel(month) },
      { value: shiftMonth(month, 1), label: monthLabel(shiftMonth(month, 1)) },
    ],
    [month],
  );

  return (
    <Screen
      header={
        <AppHeader
          title="Chi tiêu"
          right={
            <IconButton
              icon="add"
              label="Thêm hũ chi tiêu"
              onPress={() => router.push('/spending/jar-form' as Href)}
            />
          }
        />
      }>
      <View style={styles.intro}>
        <AppText variant="headline">Tiền của bạn đang đi đâu?</AppText>
        <AppText variant="supporting" color={colors.inkMuted}>
          Mỗi khoản chi được ghi vào đúng hũ để bạn nhìn thấy hạn mức còn lại.
        </AppText>
      </View>

      <ChoiceChips
        value={month}
        onChange={setMonth}
        accessibilityLabel="Chọn tháng xem chi tiêu"
        choices={jarChoices}
      />

      <View style={styles.actions}>
        <Button
          label="Thêm khoản chi"
          icon="add-circle-outline"
          onPress={() => router.push('/spending/expense-form' as Href)}
          style={styles.actionButton}
        />
        <Button
          label="Quét hóa đơn đã chi"
          icon="scan-outline"
          variant="secondary"
          onPress={() => router.push('/(tabs)/scan?target=EXPENSE' as Href)}
          style={styles.actionButton}
        />
      </View>

      {overview.isLoading ? <LoadingState label="Đang tải sổ chi tiêu…" /> : null}
      {overview.isError ? (
        <ErrorState message="Không thể tải sổ chi tiêu." onRetry={() => overview.refetch()} />
      ) : null}
      {overview.data ? (
        <>
          <Card tone="soft" style={styles.totalCard}>
            <View style={styles.totalIcon}>
              <Ionicons name="wallet-outline" size={25} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <AppText variant="label" color={colors.inkMuted}>
                Tổng đã chi trong {monthLabel(month).toLowerCase()}
              </AppText>
              {Object.entries(overview.data.currencyTotals).map(([currency, amount]) => (
                <AppText key={currency} variant="display" color={colors.primary}>
                  {formatCurrency(amount, currency)}
                </AppText>
              ))}
              {!Object.keys(overview.data.currencyTotals).length ? (
                <AppText variant="title" color={colors.primary}>
                  Chưa có khoản chi
                </AppText>
              ) : null}
            </View>
          </Card>

          <View style={styles.section}>
            <SectionHeader title="Các hũ chi tiêu" actionLabel="Thêm hũ" onAction={() => router.push('/spending/jar-form' as Href)} />
            <View style={styles.jarGrid}>
              {overview.data.jars.map((jar) => (
                <JarCard
                  key={jar.id}
                  jar={jar}
                  onPress={() => router.push(`/spending/expense-form?jarId=${jar.id}` as Href)}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="Khoản chi gần đây"
              actionLabel="Thêm khoản chi"
              onAction={() => router.push('/spending/expense-form' as Href)}
            />
            {overview.data.recentExpenses.length ? (
              <View style={styles.expenseStack}>
                {overview.data.recentExpenses.map((expense) => (
                  <Card key={expense.id} style={styles.expenseRow}>
                    <View style={styles.expenseIcon}>
                      <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="supportingStrong" numberOfLines={1}>
                        {expense.title}
                      </AppText>
                      <AppText variant="label" color={colors.inkMuted}>
                        {expense.merchant || 'Không có nơi mua'} · {formatDateTime(expense.spentAt)}
                      </AppText>
                    </View>
                    <AppText variant="supportingStrong" color={colors.ink}>
                      {formatCurrency(expense.amount, expense.currency)}
                    </AppText>
                  </Card>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="wallet-outline"
                title="Chưa có khoản chi"
                message="Thêm thủ công hoặc quét một hóa đơn đã thanh toán để phân phối vào hũ."
                actionLabel="Thêm khoản chi"
                onAction={() => router.push('/spending/expense-form' as Href)}
              />
            )}
          </View>
        </>
      ) : null}
      </Screen>
  );
}

function JarCard({
  jar,
  onPress,
}: {
  jar: {
    id: string;
    name: string;
    icon: string;
    color: string;
    currency: string;
    limitAmount: number;
    spentAmount: number;
    remainingAmount: number;
    usagePercent: number;
    state: string;
  };
  onPress: () => void;
}) {
  const progress = Math.min(Math.max(jar.usagePercent, 0), 100);
  const overLimit = jar.state === 'OVER_LIMIT';
  const noLimit = jar.state === 'UNSET';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Thêm khoản chi vào hũ ${jar.name}`} onPress={onPress} style={({ pressed }) => [styles.jarCard, pressed && styles.pressed]}>
      <View style={[styles.jarIcon, { backgroundColor: `${jar.color}18` }]}>
        <Ionicons name={(jar.icon || 'wallet-outline') as keyof typeof Ionicons.glyphMap} size={22} color={jar.color} />
      </View>
      <AppText variant="supportingStrong" numberOfLines={1}>
        {jar.name}
      </AppText>
      <AppText variant="label" color={colors.inkMuted}>
        {formatCurrency(jar.spentAmount, jar.currency)} / {noLimit ? 'Chưa đặt hạn mức' : formatCurrency(jar.limitAmount, jar.currency)}
      </AppText>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { backgroundColor: overLimit ? colors.danger : jar.color, width: `${progress}%` }]} />
      </View>
      <AppText variant="label" color={overLimit ? colors.danger : colors.inkMuted}>
        {overLimit ? 'Đã vượt hạn mức' : noLimit ? 'Chưa đặt hạn mức' : `Còn ${formatCurrency(jar.remainingAmount, jar.currency)}`}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
  totalCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  totalIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.pill, height: 48, justifyContent: 'center', width: 48 },
  flex: { flex: 1 },
  section: { gap: spacing.md },
  jarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  jarCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md, width: '48%' },
  jarIcon: { alignItems: 'center', borderRadius: radii.pill, height: 40, justifyContent: 'center', width: 40 },
  progressTrack: { backgroundColor: colors.borderSoft, borderRadius: radii.pill, height: 6, overflow: 'hidden', width: '100%' },
  progressFill: { borderRadius: radii.pill, height: '100%' },
  expenseStack: { gap: spacing.sm },
  expenseRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  expenseIcon: { alignItems: 'center', backgroundColor: colors.primarySurface, borderRadius: radii.pill, height: 40, justifyContent: 'center', width: 40 },
  pressed: { opacity: 0.7 },
});
