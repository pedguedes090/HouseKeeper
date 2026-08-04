import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ExpenseRow } from '@/components/domain/expense-row';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { AppHeader, SectionHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { budgetStateLabels, currentMonth, formatMonth } from '@/lib/spending-format';
import { colors, spacing } from '@/theme/tokens';

export default function SpendingJarDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, month: monthParam } = useLocalSearchParams<{
    id: string;
    month?: string;
  }>();
  const month = monthParam ?? currentMonth();
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState('');
  const overview = useQuery({
    queryKey: queryKeys.spendingOverview(month),
    queryFn: () => housekeeperApi.getSpendingOverview(month),
  });
  const expenses = useQuery({
    queryKey: [...queryKeys.spendingExpenses(month, id), page],
    queryFn: () => housekeeperApi.listExpenses(month, id, page, 20),
  });
  const jar = overview.data?.jars.find((item) => item.id === id);

  const updateLimit = useMutation({
    mutationFn: (amount: number) =>
      housekeeperApi.setSpendingMonthlyLimit(id, month, amount),
    onSuccess: refresh,
    onError: (error) =>
      Alert.alert('Chưa thể đổi hạn mức', getApiErrorMessage(error)),
  });
  const removeOverride = useMutation({
    mutationFn: () => housekeeperApi.removeSpendingMonthlyLimit(id, month),
    onSuccess: refresh,
    onError: (error) =>
      Alert.alert('Chưa thể dùng lại hạn mức mặc định', getApiErrorMessage(error)),
  });

  async function refresh() {
    setLimit('');
    await queryClient.invalidateQueries({
      queryKey: queryKeys.spendingOverview(month),
    });
  }

  if (overview.isLoading || expenses.isLoading) {
    return (
      <Screen
        scroll={false}
        bottomInset={false}
        header={<AppHeader back title="Chi tiết hũ" />}>
        <LoadingState />
      </Screen>
    );
  }
  if (overview.isError || expenses.isError || !jar) {
    return (
      <Screen
        scroll={false}
        bottomInset={false}
        header={<AppHeader back title="Chi tiết hũ" />}>
        <ErrorState
          message="Không thể tải dữ liệu của hũ này."
          onRetry={() => {
            void overview.refetch();
            void expenses.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen header={<AppHeader back title={jar.name} />}>
      <Card
        tone={
          jar.state === 'OVER_LIMIT'
            ? 'danger'
            : jar.state === 'NEAR_LIMIT'
              ? 'warning'
              : jar.state === 'NORMAL'
                ? 'success'
                : 'soft'
        }
        style={styles.summary}>
        <AppText variant="label" color={colors.inkMuted}>
          {formatMonth(month)}
        </AppText>
        <AppText variant="headline">
          {formatCurrency(jar.spentAmount, jar.currency)}
        </AppText>
        <AppText variant="supportingStrong">
          {budgetStateLabels[jar.state]}
          {jar.limitAmount > 0
            ? ` · ${Math.round(jar.usagePercent)}% hạn mức`
            : ''}
        </AppText>
        <AppText variant="supporting" color={colors.inkMuted}>
          {jar.limitAmount > 0
            ? `Còn ${formatCurrency(jar.remainingAmount, jar.currency)} trên ${formatCurrency(jar.limitAmount, jar.currency)}`
            : 'Đặt hạn mức để theo dõi mức sử dụng của tháng.'}
        </AppText>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Hạn mức tháng này" />
        <FormField
          label={`Hạn mức riêng (${jar.currency})`}
          value={limit}
          onChangeText={setLimit}
          keyboardType="numeric"
          placeholder={String(jar.limitAmount)}
        />
        <View style={styles.actions}>
          {jar.monthlyOverride ? (
            <Button
              label="Dùng lại mặc định"
              variant="secondary"
              loading={removeOverride.isPending}
              onPress={() => removeOverride.mutate()}
            />
          ) : null}
          <Button
            label="Áp dụng tháng này"
            loading={updateLimit.isPending}
            onPress={() => {
              const amount = Number(limit.replace(/[^\d.]/g, ''));
              if (!Number.isFinite(amount) || amount < 0) {
                Alert.alert('Hạn mức không hợp lệ', 'Hạn mức không thể âm.');
                return;
              }
              updateLimit.mutate(amount);
            }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Các khoản chi" />
        {expenses.data?.items.length ? (
          <View style={styles.expenses}>
            {expenses.data.items.map((expense) => (
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
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="Chưa có khoản chi"
            message="Các khoản chi thuộc hũ này trong tháng sẽ xuất hiện ở đây."
            actionLabel="Thêm khoản chi"
            onAction={() =>
              router.push(`/spending/expense/form?month=${month}`)
            }
          />
        )}
        {page > 0 || expenses.data?.hasMore ? (
          <View style={styles.pagination}>
            <Button
              label="Trang trước"
              variant="ghost"
              disabled={page === 0}
              onPress={() => setPage((value) => Math.max(0, value - 1))}
            />
            <Button
              label="Trang sau"
              variant="ghost"
              disabled={!expenses.data?.hasMore}
              onPress={() => setPage((value) => value + 1)}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  expenses: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
