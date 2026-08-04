/* eslint-disable react-hooks/set-state-in-effect -- hydrate edit form after its page is fetched */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/chip';
import { ErrorState, LoadingState } from '@/components/ui/feedback';
import { DateField, FormField } from '@/components/ui/form-field';
import { AppHeader } from '@/components/ui/header';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { SwitchRow } from '@/components/ui/switch-row';
import { getApiErrorMessage } from '@/lib/api';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { currentMonth } from '@/lib/spending-format';
import { ExpenseInput } from '@/lib/types';
import { colors, layout, spacing } from '@/theme/tokens';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpenseFormScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, month: monthParam } = useLocalSearchParams<{
    id?: string;
    month?: string;
  }>();
  const month = monthParam ?? currentMonth();
  const jars = useQuery({
    queryKey: queryKeys.spendingJars,
    queryFn: housekeeperApi.listSpendingJars,
  });
  const expensePage = useQuery({
    queryKey: queryKeys.spendingExpenses(month, null),
    queryFn: () => housekeeperApi.listExpenses(month, null, 0, 100),
    enabled: Boolean(id),
  });
  const existing = useMemo(
    () => expensePage.data?.items.find((item) => item.id === id),
    [expensePage.data, id],
  );
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [jarId, setJarId] = useState('');
  const [spentDate, setSpentDate] = useState(today());
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const uploadReceipt = useMutation({
    mutationFn: async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsMultipleSelection: false,
      });
      if (result.canceled) return null;
      const asset = result.assets[0];
      return housekeeperApi.uploadScan('EXPENSE', {
        uri: asset.uri,
        name: asset.fileName ?? `receipt-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    },
    onSuccess: (scan) => {
      if (!scan) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.scans });
      router.push(`/spending/scan/${scan.id}?month=${month}`);
    },
    onError: (error) =>
      Alert.alert('Chưa thể quét biên lai', getApiErrorMessage(error)),
  });

  useEffect(() => {
    if (!jarId && jars.data?.length) setJarId(jars.data[0].id);
  }, [jarId, jars.data]);

  useEffect(() => {
    if (!existing) return;
    setAmount(String(existing.amount));
    setTitle(existing.title);
    setJarId(existing.jarId);
    setSpentDate(existing.spentAt.slice(0, 10));
    setMerchant(existing.merchant ?? '');
    setNote(existing.note ?? '');
    setDetailsOpen(Boolean(existing.merchant || existing.note));
  }, [existing]);

  const save = useMutation({
    mutationFn: (input: ExpenseInput) =>
      id
        ? housekeeperApi.updateExpense(id, input)
        : housekeeperApi.createExpense(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.spendingOverview(month),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.spendingExpenses(month, null),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
      router.back();
    },
    onError: (error) =>
      Alert.alert('Chưa thể lưu khoản chi', getApiErrorMessage(error)),
  });
  const exclude = useMutation({
    mutationFn: (excluded: boolean) =>
      housekeeperApi.setExpenseExcluded(id!, excluded),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.spendingOverview(month),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.spendingExpenses(month, null),
        }),
      ]);
    },
    onError: (error) =>
      Alert.alert('Chưa thể đổi thống kê', getApiErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: () => housekeeperApi.deleteExpense(id!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.spendingOverview(month),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.spendingExpenses(month, null),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
      router.back();
    },
    onError: (error) =>
      Alert.alert('Chưa thể xóa khoản chi', getApiErrorMessage(error)),
  });

  function submit() {
    const numericAmount = Number(amount.replace(/[^\d.]/g, ''));
    const nextErrors: Record<string, string> = {};
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      nextErrors.amount = 'Số tiền phải lớn hơn 0.';
    }
    if (!jarId) nextErrors.jarId = 'Vui lòng chọn một hũ.';
    if (!title.trim()) nextErrors.title = 'Vui lòng nhập tên khoản chi.';
    if (!spentDate) nextErrors.spentDate = 'Vui lòng chọn ngày chi.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const jar = jars.data?.find((item) => item.id === jarId);
    save.mutate({
      jarId,
      amount: numericAmount,
      currency: jar?.currency ?? 'VND',
      title: title.trim(),
      merchant: merchant.trim() || null,
      spentAt: new Date(`${spentDate}T12:00:00`).toISOString(),
      note: note.trim() || null,
      receiptFileUrl: existing?.receiptFileUrl ?? null,
    });
  }

  if (jars.isLoading || (id && expensePage.isLoading)) {
    return (
      <Screen
        scroll={false}
        bottomInset={false}
        header={<AppHeader back title="Khoản chi" />}>
        <LoadingState />
      </Screen>
    );
  }
  if (jars.isError || (id && expensePage.isError)) {
    return (
      <Screen
        scroll={false}
        bottomInset={false}
        header={<AppHeader back title="Khoản chi" />}>
        <ErrorState
          message="Không thể chuẩn bị biểu mẫu khoản chi."
          onRetry={() => {
            void jars.refetch();
            if (id) void expensePage.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      keyboardAware
      header={<AppHeader back title={id ? 'Sửa khoản chi' : 'Thêm khoản chi'} />}>
      <View style={styles.form}>
        {!id ? (
          <View style={styles.receiptAction}>
            <Button
              label="Quét biên lai"
              icon="scan-outline"
              variant="secondary"
              fullWidth
              loading={uploadReceipt.isPending}
              onPress={() => uploadReceipt.mutate()}
            />
            <AppText variant="label" color={colors.inkMuted} style={styles.center}>
              AI sẽ tạo bản nháp. Bạn vẫn kiểm tra và xác nhận trước khi lưu.
            </AppText>
          </View>
        ) : null}
        <FormField
          label="Số tiền *"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="Ví dụ: 45000"
          error={errors.amount}
        />
        <View style={styles.fieldGroup}>
          <AppText variant="supportingStrong" color={colors.inkMuted}>
            Hũ chi tiêu *
          </AppText>
          {jars.data?.length ? (
            <ChoiceChips
              accessibilityLabel="Chọn hũ chi tiêu"
              value={jarId}
              onChange={setJarId}
              choices={jars.data.map((jar) => ({
                value: jar.id,
                label: jar.name,
              }))}
            />
          ) : (
            <AppText variant="supporting" color={colors.danger}>
              Chưa có hũ. Hãy quay lại và thiết lập hũ trước.
            </AppText>
          )}
          {errors.jarId ? (
            <AppText variant="label" color={colors.danger}>
              {errors.jarId}
            </AppText>
          ) : null}
        </View>
        <FormField
          label="Tên khoản chi *"
          value={title}
          onChangeText={setTitle}
          placeholder="Ăn sáng, cà phê, đổ xăng…"
          error={errors.title}
        />
        <DateField
          label="Ngày chi *"
          value={spentDate}
          allowEmpty={false}
          onChange={(value) => value && setSpentDate(value)}
          error={errors.spentDate}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={detailsOpen ? 'Ẩn chi tiết' : 'Thêm chi tiết'}
          onPress={() => setDetailsOpen((value) => !value)}
          style={styles.detailsToggle}>
          <AppText variant="bodyMedium" color={colors.primary}>
            {detailsOpen ? 'Ẩn chi tiết' : 'Thêm chi tiết'}
          </AppText>
          <AppText variant="supporting" color={colors.inkMuted}>
            Người bán và ghi chú
          </AppText>
        </Pressable>

        {detailsOpen ? (
          <View style={styles.details}>
            <FormField
              label="Người bán"
              value={merchant}
              onChangeText={setMerchant}
              placeholder="Tên cửa hàng"
            />
            <FormField
              label="Ghi chú"
              value={note}
              onChangeText={setNote}
              placeholder="Thông tin thêm"
              multiline
            />
          </View>
        ) : null}
        {id && existing ? (
          <SwitchRow
            label="Không tính vào thống kê"
            description="Khoản chi vẫn được giữ nhưng không cộng vào mức đã tiêu."
            value={existing.excludedFromStats}
            onValueChange={(value) => exclude.mutate(value)}
          />
        ) : null}
      </View>
      <Button
        label={id ? 'Lưu thay đổi' : 'Lưu khoản chi'}
        fullWidth
        loading={save.isPending}
        disabled={!jars.data?.length}
        onPress={submit}
      />
      {id ? (
        <Button
          label="Xóa khoản chi"
          variant="danger"
          fullWidth
          loading={remove.isPending}
          onPress={() =>
            Alert.alert(
              'Xóa khoản chi?',
              'Thao tác này không thể hoàn tác.',
              [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'Xóa',
                  style: 'destructive',
                  onPress: () => remove.mutate(),
                },
              ],
            )
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  detailsToggle: {
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
  },
  details: {
    gap: spacing.lg,
  },
  receiptAction: {
    gap: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
});
