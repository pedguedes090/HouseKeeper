import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BillCard } from '@/components/domain/bill-card';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/chip';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { formatCurrency } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { BillRecord } from '@/lib/types';
import { colors, radii, spacing } from '@/theme/tokens';

type Filter = 'UPCOMING' | 'RECURRING' | 'ALL';

export default function CalendarScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('UPCOMING');
  const bills = useQuery({ queryKey: queryKeys.bills, queryFn: housekeeperApi.listBills });
  const filtered = useMemo(() => {
    if (!bills.data) return [];
    const active = [...bills.data].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
    if (filter === 'UPCOMING') return active.filter((item) => item.dueStatus !== 'INACTIVE');
    if (filter === 'RECURRING') return active.filter((item) => item.recurrence !== 'ONE_TIME');
    return active;
  }, [bills.data, filter]);
  const totals = useMemo(() => {
    return filtered.reduce<Record<string, number>>((acc, item) => {
      acc[item.currency] = (acc[item.currency] ?? 0) + item.amount;
      return acc;
    }, {});
  }, [filtered]);
  const monthLabel = new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <Screen header={<AppHeader title="Hóa đơn & Chi phí" />}>
      <Card tone="soft" style={styles.monthCard}>
        <View style={styles.monthTop}>
          <View>
            <AppText variant="label" color={colors.inkMuted}>
              DỰ KIẾN {monthLabel.toLocaleUpperCase('vi-VN')}
            </AppText>
            {Object.keys(totals).length ? (
              Object.entries(totals).map(([currency, amount]) => (
                <AppText key={currency} variant="headline" color={colors.primary}>
                  {formatCurrency(amount, currency)}
                </AppText>
              ))
            ) : (
              <AppText variant="headline" color={colors.primary}>
                0 ₫
              </AppText>
            )}
          </View>
          <View style={styles.calendarIcon}>
            <Ionicons name="calendar" size={28} color={colors.primary} />
          </View>
        </View>
        <View style={styles.monthMeta}>
          <AppText variant="supporting" color={colors.inkMuted}>
            {filtered.length} khoản trong lịch
          </AppText>
          <AppText variant="supportingStrong" color={colors.success}>
            {filtered.filter((item) => item.dueStatus === 'INACTIVE').length} đã hoàn tất
          </AppText>
        </View>
      </Card>

      <ChoiceChips
        value={filter}
        onChange={setFilter}
        choices={[
          { value: 'UPCOMING', label: 'Sắp tới' },
          { value: 'RECURRING', label: 'Định kỳ' },
          { value: 'ALL', label: 'Tất cả' },
        ]}
      />

      {bills.isLoading ? (
        <View style={styles.list}>
          <Skeleton height={108} />
          <Skeleton height={108} />
          <Skeleton height={108} />
        </View>
      ) : bills.isError ? (
        <ErrorState
          message="Không thể tải lịch thanh toán."
          onRetry={() => bills.refetch()}
        />
      ) : filtered.length ? (
        <View style={styles.list}>
          {groupBills(filtered).map((group) => (
            <View key={group.label} style={styles.group}>
              <View style={styles.groupHeader}>
                <AppText variant="supportingStrong">{group.label}</AppText>
                <View style={styles.line} />
              </View>
              {group.items.map((bill) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onPress={() => router.push(`/bills/${bill.id}`)}
                />
              ))}
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="calendar-outline"
          title="Lịch đang trống"
          message="Thêm hóa đơn hoặc dịch vụ định kỳ để không bỏ lỡ ngày thanh toán."
          actionLabel="Thêm hóa đơn"
          onAction={() => router.push('/bills/form')}
        />
      )}

      <Button
        label="Thêm khoản thanh toán"
        icon="add"
        fullWidth
        onPress={() => router.push('/bills/form')}
      />
    </Screen>
  );
}

function groupBills(bills: BillRecord[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const groups = new Map<string, BillRecord[]>();

  bills.forEach((bill) => {
    const due = new Date(`${bill.nextDueDate}T12:00:00`);
    const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
    const label =
      days < 0
        ? 'Đã quá hạn'
        : days === 0
          ? 'Hôm nay'
          : days <= 7
            ? '7 ngày tới'
            : due.getMonth() === now.getMonth()
              ? 'Cuối tháng này'
              : 'Sau đó';
    groups.set(label, [...(groups.get(label) ?? []), bill]);
  });

  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

const styles = StyleSheet.create({
  monthCard: {
    borderColor: colors.primarySoft,
    gap: spacing.lg,
  },
  monthTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  monthMeta: {
    alignItems: 'center',
    borderTopColor: colors.borderSoft,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  list: {
    gap: spacing.xl,
  },
  group: {
    gap: spacing.md,
  },
  groupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  line: {
    backgroundColor: colors.borderSoft,
    flex: 1,
    height: 1,
  },
});
