/* eslint-disable react-hooks/set-state-in-effect -- select a default jar after the server list loads */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/chip';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/feedback';
import { DateField, FormField } from '@/components/ui/form-field';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { formatDate } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { ExpenseInput } from '@/lib/types';
import { colors, spacing } from '@/theme/tokens';

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function ExpenseFormScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jarId: initialJarId } = useLocalSearchParams<{ jarId?: string }>();
  const jars = useQuery({ queryKey: queryKeys.spendingJars, queryFn: housekeeperApi.listSpendingJars });
  const [form, setForm] = useState({
    jarId: initialJarId ?? '',
    title: '',
    merchant: '',
    amount: '',
    currency: 'VND',
    spentAt: today(),
    note: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (form.jarId || !jars.data?.length) return;
    setForm((current) => ({ ...current, jarId: initialJarId ?? jars.data[0].id }));
  }, [form.jarId, initialJarId, jars.data]);

  const save = useMutation({
    mutationFn: (input: ExpenseInput) => housekeeperApi.createExpense(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['spending'] });
      router.replace('/(tabs)/spending' as Href);
    },
    onError: (error: Error) => Alert.alert('Chưa thể lưu khoản chi', error.message),
  });

  function submit() {
    const amount = Number(form.amount.replace(/[^\d.]/g, ''));
    const nextErrors: Record<string, string> = {};
    if (!form.jarId) nextErrors.jarId = 'Vui lòng chọn hũ nhận khoản chi.';
    if (!form.title.trim()) nextErrors.title = 'Vui lòng nhập tên khoản chi.';
    if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = 'Số tiền phải lớn hơn 0.';
    if (!form.spentAt) nextErrors.spentAt = 'Vui lòng chọn ngày giao dịch.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    save.mutate({
      jarId: form.jarId,
      title: form.title.trim(),
      merchant: form.merchant.trim() || null,
      amount,
      currency: form.currency.trim().toUpperCase() || 'VND',
      spentAt: `${form.spentAt}T12:00:00.000Z`,
      note: form.note.trim() || null,
      receiptFileUrl: null,
    });
  }

  if (jars.isLoading) {
    return <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Thêm khoản chi" />}><LoadingState /></Screen>;
  }
  if (jars.isError) {
    return <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Thêm khoản chi" />}><ErrorState message="Không thể tải các hũ chi tiêu." onRetry={() => jars.refetch()} /></Screen>;
  }
  if (!jars.data?.length) {
    return (
      <Screen header={<AppHeader back title="Thêm khoản chi" />}>
        <EmptyState
          icon="wallet-outline"
          title="Chưa có hũ chi tiêu"
          message="Tạo hũ đầu tiên để khoản chi được phân phối và theo dõi theo tháng."
          actionLabel="Tạo hũ chi tiêu"
          onAction={() => router.push('/spending/jar-form' as Href)}
        />
      </Screen>
    );
  }

  return (
    <Screen keyboardAware header={<AppHeader back title="Thêm khoản chi" />}>
      <Card tone="soft" style={styles.note}>
        <AppHeaderIcon />
        <View style={styles.flex}>
          <AppText variant="supportingStrong" color={colors.primary}>Ghi vào đúng hũ ngay từ đầu</AppText>
          <AppText variant="label" color={colors.inkMuted}>Bạn có thể sửa hoặc loại khỏi thống kê sau khi lưu.</AppText>
        </View>
      </Card>
      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <AppText variant="supportingStrong" color={colors.inkMuted}>Hũ chi tiêu *</AppText>
          <ChoiceChips
            value={form.jarId}
            onChange={(jarId) => setForm((current) => ({ ...current, jarId }))}
            accessibilityLabel="Chọn hũ chi tiêu"
            choices={jars.data.map((jar) => ({ value: jar.id, label: jar.name }))}
          />
          {errors.jarId ? <AppText variant="label" color={colors.danger}>{errors.jarId}</AppText> : null}
        </View>
        <FormField label="Tên khoản chi *" value={form.title} onChangeText={(title) => setForm((current) => ({ ...current, title }))} placeholder="Ví dụ: Bữa trưa" error={errors.title} />
        <FormField label="Nơi mua / người nhận" value={form.merchant} onChangeText={(merchant) => setForm((current) => ({ ...current, merchant }))} placeholder="Ví dụ: Chợ Bến Thành" />
        <View style={styles.inline}>
          <View style={styles.flex}>
            <FormField label="Số tiền *" value={form.amount} onChangeText={(amount) => setForm((current) => ({ ...current, amount }))} keyboardType="numeric" placeholder="0" error={errors.amount} />
          </View>
          <View style={styles.currency}>
            <FormField label="Tiền tệ" value={form.currency} onChangeText={(currency) => setForm((current) => ({ ...current, currency: currency.toUpperCase() }))} autoCapitalize="characters" />
          </View>
        </View>
        <DateField label="Ngày giao dịch *" value={form.spentAt} allowEmpty={false} onChange={(spentAt) => spentAt && setForm((current) => ({ ...current, spentAt }))} error={errors.spentAt} />
        <FormField label="Ghi chú" value={form.note} onChangeText={(note) => setForm((current) => ({ ...current, note }))} placeholder="Thông tin thêm…" multiline />
      </View>
      <Button label="Lưu khoản chi" icon="checkmark" fullWidth loading={save.isPending} onPress={submit} />
      <Button label="Quét hóa đơn đã chi" icon="scan-outline" variant="secondary" fullWidth onPress={() => router.push('/(tabs)/scan?target=EXPENSE' as Href)} />
      <AppText variant="label" color={colors.inkMuted} style={styles.footerHint}>
        Ngày giao dịch: {formatDate(form.spentAt)}
      </AppText>
    </Screen>
  );
}

function AppHeaderIcon() {
  return <View style={styles.icon}><AppText variant="title" color={colors.primary}>₫</AppText></View>;
}

const styles = StyleSheet.create({
  note: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, borderColor: colors.primarySoft },
  icon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 999, height: 42, justifyContent: 'center', width: 42 },
  flex: { flex: 1 },
  form: { gap: spacing.lg },
  fieldGroup: { gap: spacing.sm },
  inline: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  currency: { width: 105 },
  footerHint: { textAlign: 'center' },
});
