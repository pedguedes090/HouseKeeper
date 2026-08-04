/* eslint-disable react-hooks/set-state-in-effect -- hydrate the editable receipt draft after scan processing */
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/chip';
import { ErrorState, LoadingState } from '@/components/ui/feedback';
import { DateField, FormField } from '@/components/ui/form-field';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { SecureImageViewer } from '@/components/ui/secure-image-viewer';
import { getApiErrorMessage } from '@/lib/api';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { currentMonth } from '@/lib/spending-format';
import { ExpenseInput } from '@/lib/types';
import { colors, radii, spacing } from '@/theme/tokens';

type RawReceipt = Record<string, unknown>;

export default function ReceiptReviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, month: monthParam } = useLocalSearchParams<{
    id: string;
    month?: string;
  }>();
  const month = monthParam ?? currentMonth();
  const scan = useQuery({
    queryKey: queryKeys.scan(id),
    queryFn: () => housekeeperApi.getScan(id),
    refetchInterval: (query) =>
      query.state.data?.status === 'PROCESSING' ? 1500 : false,
  });
  const jars = useQuery({
    queryKey: queryKeys.spendingJars,
    queryFn: housekeeperApi.listSpendingJars,
  });
  const [meta, setMeta] = useState<RawReceipt>({});
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [merchant, setMerchant] = useState('');
  const [spentDate, setSpentDate] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [jarId, setJarId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!scan.data?.extractedDataJson || !jars.data) return;
    try {
      const raw = JSON.parse(scan.data.extractedDataJson) as RawReceipt;
      setMeta(raw);
      setAmount(text(raw.amount));
      setCurrency(text(raw.currency, 'VND'));
      setMerchant(text(raw.merchant));
      setSpentDate(text(raw.spentAt, new Date().toISOString().slice(0, 10)));
      setTitle(text(raw.title, 'Khoản chi từ biên lai'));
      setNote(text(raw.note));
      const suggested = text(raw.suggestedJarName);
      setJarId(
        jars.data.find((jar) => jar.name === suggested)?.id ??
          jars.data[0]?.id ??
          '',
      );
    } catch {
      setMeta({
        _warnings: ['AI trả về dữ liệu chưa đọc được. Vui lòng nhập thủ công.'],
      });
      setSpentDate(new Date().toISOString().slice(0, 10));
      setJarId(jars.data[0]?.id ?? '');
    }
  }, [jars.data, scan.data]);

  const warnings = useMemo(() => {
    const value = meta._warnings;
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }, [meta]);
  const confidence = typeof meta._confidence === 'number' ? meta._confidence : null;

  const confirm = useMutation({
    mutationFn: async (input: ExpenseInput) => {
      await housekeeperApi.updateScanDraft(
        id,
        JSON.stringify({
          ...meta,
          ...input,
          spentAt: spentDate,
        }),
      );
      return housekeeperApi.confirmScan(id, 'EXPENSE', input);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.scans }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.spendingOverview(month),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.spendingExpenses(month, null),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
      router.replace(`/spending?month=${month}`);
    },
    onError: (error) =>
      Alert.alert('Chưa thể lưu khoản chi', getApiErrorMessage(error)),
  });

  function submit() {
    const numericAmount = Number(amount.replace(/[^\d.]/g, ''));
    const nextErrors: Record<string, string> = {};
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      nextErrors.amount = 'Số tiền phải lớn hơn 0.';
    }
    if (!jarId) nextErrors.jarId = 'Vui lòng chọn hũ.';
    if (!title.trim()) nextErrors.title = 'Vui lòng kiểm tra tên khoản chi.';
    if (!spentDate) nextErrors.spentDate = 'Vui lòng kiểm tra ngày chi.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    confirm.mutate({
      jarId,
      amount: numericAmount,
      currency: currency.toUpperCase(),
      title: title.trim(),
      merchant: merchant.trim() || null,
      spentAt: new Date(`${spentDate}T12:00:00`).toISOString(),
      note: note.trim() || null,
      receiptFileUrl: scan.data?.fileUrl ?? null,
    });
  }

  if (scan.isLoading || jars.isLoading || scan.data?.status === 'PROCESSING') {
    return (
      <Screen
        scroll={false}
        bottomInset={false}
        header={<AppHeader back title="AI đang đọc biên lai" />}>
        <LoadingState label="Đang nhận diện số tiền, người bán và ngày chi…" />
      </Screen>
    );
  }
  if (scan.isError || jars.isError || !scan.data) {
    return (
      <Screen
        scroll={false}
        bottomInset={false}
        header={<AppHeader back title="Kiểm tra biên lai" />}>
        <ErrorState
          message="Không thể tải bản nháp biên lai."
          onRetry={() => {
            void scan.refetch();
            void jars.refetch();
          }}
        />
      </Screen>
    );
  }
  if (scan.data.status === 'CONFIRMED') {
    return (
      <Screen header={<AppHeader back title="Biên lai đã lưu" />}>
        <Card tone="success" style={styles.notice}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <View style={styles.flex}>
            <AppText variant="supportingStrong" color={colors.success}>
              Khoản chi từ biên lai đã được lưu
            </AppText>
            <AppText variant="label" color={colors.inkMuted}>
              Mở lại lần quét này sẽ không tạo khoản chi trùng.
            </AppText>
          </View>
        </Card>
        <Button
          label="Về Hũ chi tiêu"
          fullWidth
          onPress={() => router.replace(`/spending?month=${month}`)}
        />
      </Screen>
    );
  }

  return (
    <Screen
      keyboardAware
      header={<AppHeader back title="Kiểm tra biên lai" />}>
      <SecureImageViewer
        uri={scan.data.fileUrl}
        contentType={scan.data.contentType}
        title={scan.data.originalFileName}
        height={190}
        testID="receipt-scan-preview"
      />
      <Card tone="success" style={styles.notice}>
        <Ionicons name="sparkles" size={22} color={colors.success} />
        <View style={styles.flex}>
          <AppText variant="supportingStrong" color={colors.success}>
            AI đã tạo bản nháp
          </AppText>
          <AppText variant="label" color={colors.inkMuted}>
            {confidence == null
              ? 'Hãy kiểm tra tất cả trường trước khi xác nhận.'
              : `Độ tin cậy ước tính ${Math.round(confidence * 100)}%. Bạn vẫn là người quyết định.`}
          </AppText>
        </View>
      </Card>
      {warnings.map((warning) => (
        <View key={warning} style={styles.warning}>
          <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
          <AppText variant="label" color={colors.warning} style={styles.flex}>
            {warning}
          </AppText>
        </View>
      ))}

      <View style={styles.form}>
        <FormField
          label="Số tiền *"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          error={errors.amount}
        />
        <FormField
          label="Tiền tệ"
          value={currency}
          onChangeText={(value) => setCurrency(value.toUpperCase())}
          autoCapitalize="characters"
        />
        <View style={styles.fieldGroup}>
          <AppText variant="supportingStrong" color={colors.inkMuted}>
            Hũ được gợi ý *
          </AppText>
          <ChoiceChips
            value={jarId}
            onChange={setJarId}
            choices={
              jars.data?.map((jar) => ({ value: jar.id, label: jar.name })) ?? []
            }
          />
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
          error={errors.title}
        />
        <FormField label="Người bán" value={merchant} onChangeText={setMerchant} />
        <DateField
          label="Ngày chi *"
          value={spentDate || null}
          allowEmpty={false}
          onChange={(value) => setSpentDate(value ?? '')}
          error={errors.spentDate}
        />
        <FormField label="Ghi chú" value={note} onChangeText={setNote} multiline />
      </View>
      <Button
        label="Xác nhận khoản chi"
        icon="checkmark"
        fullWidth
        loading={confirm.isPending}
        onPress={submit}
      />
    </Screen>
  );
}

function text(value: unknown, fallback = '') {
  return value == null ? fallback : String(value);
}

const styles = StyleSheet.create({
  notice: {
    alignItems: 'flex-start',
    borderColor: colors.transparent,
    flexDirection: 'row',
    gap: spacing.md,
  },
  warning: {
    alignItems: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  flex: {
    flex: 1,
  },
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
});
