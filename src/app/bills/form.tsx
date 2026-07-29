/* eslint-disable react-hooks/set-state-in-effect -- hydrate a controlled edit form after the record is fetched */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/chip';
import { ErrorState, LoadingState } from '@/components/ui/feedback';
import { DateField, FormField } from '@/components/ui/form-field';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { SwitchRow } from '@/components/ui/switch-row';
import { billCategoryLabels, recurrenceLabels } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { BillCategory, BillInput, Recurrence } from '@/lib/types';
import { spacing } from '@/theme/tokens';

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

const empty: BillInput = {
  title: '',
  provider: '',
  category: 'OTHER',
  amount: 0,
  currency: 'VND',
  recurrence: 'MONTHLY',
  nextDueDate: defaultDueDate(),
  reminderDaysBefore: 3,
  autoRenew: false,
  active: true,
  notes: '',
  invoiceFileUrl: null,
};

export default function BillFormScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [form, setForm] = useState<BillInput>(empty);
  const [amount, setAmount] = useState('');
  const [reminderDays, setReminderDays] = useState('3');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const existing = useQuery({
    queryKey: queryKeys.bill(id ?? ''),
    queryFn: () => housekeeperApi.getBill(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (existing.data) {
      const {
        title,
        provider,
        category,
        amount: savedAmount,
        currency,
        recurrence,
        nextDueDate,
        reminderDaysBefore,
        autoRenew,
        active,
        notes,
        invoiceFileUrl,
      } = existing.data;
      setForm({
        title,
        provider,
        category,
        amount: savedAmount,
        currency,
        recurrence,
        nextDueDate,
        reminderDaysBefore,
        autoRenew,
        active,
        notes,
        invoiceFileUrl,
      });
      setAmount(String(savedAmount));
      setReminderDays(String(reminderDaysBefore));
    }
  }, [existing.data]);

  const save = useMutation({
    mutationFn: (input: BillInput) =>
      id ? housekeeperApi.updateBill(id, input) : housekeeperApi.createBill(input),
    onSuccess: (bill) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bills });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      router.replace(`/bills/${bill.id}`);
    },
    onError: (error: Error) => Alert.alert('Chưa thể lưu hóa đơn', error.message),
  });

  function submit() {
    const numericAmount = Number(amount.replace(/[^\d.]/g, ''));
    const numericReminder = Number(reminderDays);
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = 'Vui lòng nhập tên khoản thanh toán.';
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      nextErrors.amount = 'Số tiền không hợp lệ.';
    }
    if (!Number.isInteger(numericReminder) || numericReminder < 0 || numericReminder > 365) {
      nextErrors.reminder = 'Số ngày nhắc phải từ 0 đến 365.';
    }
    if (!form.nextDueDate) nextErrors.nextDueDate = 'Vui lòng chọn ngày đến hạn.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    save.mutate({
      ...form,
      title: form.title.trim(),
      amount: numericAmount,
      reminderDaysBefore: numericReminder,
    });
  }

  if (id && existing.isLoading) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Hóa đơn" />}>
        <LoadingState />
      </Screen>
    );
  }
  if (id && existing.isError) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Hóa đơn" />}>
        <ErrorState message="Không thể tải hóa đơn cần sửa." onRetry={() => existing.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen keyboardAware header={<AppHeader back title={id ? 'Sửa hóa đơn' : 'Thêm hóa đơn'} />}>
      <View style={styles.form}>
        <FormField
          label="Tên khoản thanh toán *"
          value={form.title}
          onChangeText={(title) => setForm((current) => ({ ...current, title }))}
          placeholder="Ví dụ: Internet gia đình"
          error={errors.title}
        />
        <FormField
          label="Nhà cung cấp"
          value={form.provider ?? ''}
          onChangeText={(provider) => setForm((current) => ({ ...current, provider }))}
          placeholder="VNPT, EVN, Netflix…"
        />
        <ChoiceChips
          value={form.category}
          onChange={(category) => setForm((current) => ({ ...current, category }))}
          choices={(Object.keys(billCategoryLabels) as BillCategory[]).map((value) => ({
            value,
            label: billCategoryLabels[value],
          }))}
        />
        <View style={styles.inline}>
          <View style={styles.flex}>
            <FormField
              label="Số tiền *"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              error={errors.amount}
            />
          </View>
          <View style={styles.currency}>
            <FormField
              label="Tiền tệ"
              value={form.currency}
              onChangeText={(currency) =>
                setForm((current) => ({ ...current, currency: currency.toUpperCase() }))
              }
              autoCapitalize="characters"
            />
          </View>
        </View>
        <DateField
          label="Ngày đến hạn *"
          value={form.nextDueDate}
          allowEmpty={false}
          onChange={(nextDueDate) =>
            nextDueDate && setForm((current) => ({ ...current, nextDueDate }))
          }
          error={errors.nextDueDate}
        />
        <ChoiceChips
          value={form.recurrence}
          onChange={(recurrence) => setForm((current) => ({ ...current, recurrence }))}
          choices={(Object.keys(recurrenceLabels) as Recurrence[]).map((value) => ({
            value,
            label: recurrenceLabels[value],
          }))}
        />
        <FormField
          label="Nhắc trước (ngày)"
          value={reminderDays}
          onChangeText={setReminderDays}
          keyboardType="number-pad"
          error={errors.reminder}
        />
        <SwitchRow
          label="Tự động gia hạn"
          description="Đánh dấu dịch vụ tiếp tục tính phí sau mỗi kỳ."
          value={form.autoRenew}
          onValueChange={(autoRenew) => setForm((current) => ({ ...current, autoRenew }))}
        />
        <SwitchRow
          label="Đang theo dõi"
          value={form.active}
          onValueChange={(active) => setForm((current) => ({ ...current, active }))}
        />
        <FormField
          label="Ghi chú"
          value={form.notes ?? ''}
          onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
          placeholder="Mã khách hàng, cách thanh toán…"
          multiline
        />
      </View>
      <Button label={id ? 'Lưu thay đổi' : 'Lưu hóa đơn'} fullWidth loading={save.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  inline: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  currency: {
    width: 105,
  },
});
