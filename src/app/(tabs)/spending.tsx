import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExpenseRow } from '@/components/domain/expense-row';
import { SpendingJarRow } from '@/components/domain/spending-jar-row';
import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { AppHeader, SectionHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { formatCurrency } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { currentMonth, formatMonth, shiftMonth } from '@/lib/spending-format';
import { syncSpendingThresholdNotifications } from '@/lib/notifications';
import { colors, radii, spacing } from '@/theme/tokens';

export default function SpendingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ month?: string }>();
  const [month, setMonth] = useState(params.month ?? currentMonth());
  const overview = useQuery({
    queryKey: queryKeys.spendingOverview(month),
    queryFn: () => housekeeperApi.getSpendingOverview(month),
  });

  useEffect(() => {
    if (overview.data?.thresholdEvents.length) {
      void syncSpendingThresholdNotifications(overview.data.thresholdEvents);
    }
  }, [overview.data?.thresholdEvents]);

  function moveMonth(delta: number) {
    const next = shiftMonth(month, delta);
    setMonth(next);
    router.setParams({ month: next });
  }

  return (
    <Screen
      header={
        <AppHeader
          title="Hũ chi tiêu"
          right={
            <IconButton
              icon="settings-outline"
              label="Quản lý hũ"
              onPress={() => router.push('/spending/jars')}
            />
          }
        />
      }>
      <AppText accessibilityRole="header" variant="display" style={styles.srHeading}>
        Hũ chi tiêu
      </AppText>
      <View style={styles.monthPicker}>
        <IconButton
          icon="chevron-back"
          label="Tháng trước"
          onPress={() => moveMonth(-1)}
        />
        <View style={styles.monthLabel}>
          <AppText variant="title">{formatMonth(month)}</AppText>
          {month !== currentMonth() ? (
            <AppText variant="label" color={colors.inkMuted}>
              Dữ liệu lịch sử
            </AppText>
          ) : (
            <AppText variant="label" color={colors.success}>
              Tháng hiện tại
            </AppText>
          )}
        </View>
        <IconButton
          icon="chevron-forward"
          label="Tháng sau"
          onPress={() => moveMonth(1)}
        />
      </View>

      {overview.isLoading ? (
        <View style={styles.stack}>
          <Skeleton height={132} />
          <Skeleton height={88} />
          <Skeleton height={88} />
        </View>
      ) : overview.isError ? (
        <ErrorState
          message="Không thể tải thống kê chi tiêu."
          onRetry={() => overview.refetch()}
        />
      ) : overview.data ? (
        <>
          <Card tone="soft" style={styles.summary}>
            <View style={styles.summaryIcon}>
              <Ionicons name="wallet-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.summaryContent}>
              <AppText variant="supporting" color={colors.inkMuted}>
                ĐÃ CHI TRONG THÁNG
              </AppText>
              {Object.entries(overview.data.currencyTotals).map(
                ([currency, total]) => (
                  <AppText key={currency} variant="headline" color={colors.primary}>
                    {formatCurrency(total, currency)}
                  </AppText>
                ),
              )}
              {!Object.keys(overview.data.currencyTotals).length ? (
                <AppText variant="headline" color={colors.primary}>
                  0 ₫
                </AppText>
              ) : null}
              <AppText variant="supporting" color={colors.inkMuted}>
                Chỉ là thống kê — không có tiền thật được giữ trong hũ.
              </AppText>
            </View>
          </Card>

          <View style={styles.section}>
            <SectionHeader
              title="Các hũ của bạn"
              actionLabel="Quản lý"
              onAction={() => router.push('/spending/jars')}
            />
            {overview.data.jars.length ? (
              <View style={styles.list}>
                {overview.data.jars.map((jar) => (
                  <SpendingJarRow
                    key={jar.id}
                    jar={jar}
                    onPress={() =>
                      router.push(`/spending/jar/${jar.id}?month=${month}`)
                    }
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="pie-chart-outline"
                title="Bắt đầu với hũ chi tiêu"
                message="Tạo vài nhóm như Ăn uống, Di chuyển hoặc Cà phê và đặt mức dự kiến cho tháng."
                actionLabel="Thiết lập hũ"
                onAction={() => router.push('/spending/jars')}
              />
            )}
          </View>

          {overview.data.recentExpenses.length ? (
            <View style={styles.section}>
              <SectionHeader title="Chi gần đây" />
              <View style={styles.list}>
                {overview.data.recentExpenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onPress={
                      expense.sourceType === 'MANUAL'
                        ? () =>
                            router.push(
                              `/spending/expense/form?id=${expense.id}&month=${month}`,
                            )
                        : undefined
                    }
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      <Button
        label="Thêm khoản chi"
        icon="add"
        fullWidth
        onPress={() => router.push(`/spending/expense/form?month=${month}`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  srHeading: {
    height: 1,
    opacity: 0,
    position: 'absolute',
    width: 1,
  },
  monthPicker: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthLabel: {
    alignItems: 'center',
  },
  summary: {
    alignItems: 'flex-start',
    borderColor: colors.primarySoft,
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  summaryContent: {
    flex: 1,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },
  stack: {
    gap: spacing.md,
  },
});
