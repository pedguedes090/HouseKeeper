/* eslint-disable react-hooks/set-state-in-effect -- hydrate the editable AI draft whenever scan processing completes */
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/chip';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/feedback';
import { DateField, FormField } from '@/components/ui/form-field';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { SecureImageViewer } from '@/components/ui/secure-image-viewer';
import {
  assetCategoryLabels,
  billCategoryLabels,
  documentTypeLabels,
  recurrenceLabels,
} from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import {
  AssetCategory,
  AssetInput,
  BillCategory,
  BillInput,
  DocumentInput,
  DocumentType,
  ExpenseInput,
  Recurrence,
  ScanJob,
  SpendingJar,
} from '@/lib/types';
import { colors, radii, spacing } from '@/theme/tokens';

type Draft = Record<string, string>;

export default function ScanReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>({});
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const scan = useQuery({
    queryKey: queryKeys.scan(id),
    queryFn: () => housekeeperApi.getScan(id),
    refetchInterval: (query) =>
      query.state.data?.status === 'PROCESSING' ? 1500 : false,
  });
  const spendingJars = useQuery({
    queryKey: queryKeys.spendingJars,
    queryFn: housekeeperApi.listSpendingJars,
    enabled: scan.data?.targetType === 'EXPENSE' || scan.data?.targetType === 'BILL',
  });

  useEffect(() => {
    if (!scan.data?.extractedDataJson) return;
    try {
      const parsed = JSON.parse(scan.data.extractedDataJson) as Record<string, unknown>;
      setMeta(parsed);
      setDraft(toDraft(scan.data, parsed));
    } catch {
      setMeta({ _warnings: ['AI trả về dữ liệu không đọc được. Vui lòng nhập thủ công.'] });
      setDraft(toDraft(scan.data, {}));
    }
  }, [scan.data]);

  useEffect(() => {
    if (scan.data?.targetType !== 'EXPENSE' || !spendingJars.data?.length || draft.jarId) return;
    const suggested = normalizeJarName(text(meta.suggestedJarName));
    const match = spendingJars.data.find((jar) => normalizeJarName(jar.name) === suggested);
    setDraft((current) => ({ ...current, jarId: match?.id ?? spendingJars.data[0].id }));
  }, [draft.jarId, meta.suggestedJarName, scan.data?.targetType, spendingJars.data]);

  const confirm = useMutation({
    mutationFn: async () => {
      if (!scan.data) throw new Error('Không tìm thấy lần quét.');
      const input = buildInput(scan.data, draft, setErrors);
      if (!input) throw new ValidationError();
      const editedJson = JSON.stringify({ ...meta, ...draftForJson(scan.data, draft) });
      await housekeeperApi.updateScanDraft(id, editedJson);
      return housekeeperApi.confirmScan(id, scan.data.targetType, input);
    },
    onSuccess: (result) => {
      if (!scan.data) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.scans });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      if (scan.data.targetType === 'EXPENSE') {
        void queryClient.invalidateQueries({ queryKey: ['spending'] });
      }
      void queryClient.invalidateQueries({
        queryKey:
          scan.data.targetType === 'DOCUMENT'
            ? queryKeys.documents
            : scan.data.targetType === 'BILL'
              ? queryKeys.bills
              : scan.data.targetType === 'ASSET'
                ? queryKeys.assets
                : ['spending'],
      });
      const route =
        scan.data.targetType === 'DOCUMENT'
          ? `/documents/${result.id}`
          : scan.data.targetType === 'BILL'
            ? `/bills/${result.id}`
            : scan.data.targetType === 'ASSET'
              ? `/property/${result.id}`
              : '/(tabs)/spending';
      router.replace(route as Href);
    },
    onError: (error: Error) => {
      if (error instanceof ValidationError) return;
      Alert.alert('Chưa thể lưu dữ liệu', error.message);
    },
  });

  const warnings = useMemo(() => {
    const value = meta._warnings;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }, [meta]);
  const confidence = typeof meta._confidence === 'number' ? meta._confidence : null;
  const relevant = meta._isRelevant !== false;

  if (scan.isLoading) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="AI đang phân tích" />}>
        <LoadingState label="Đang đọc nội dung trong ảnh và kiểm tra các trường…" />
      </Screen>
    );
  }
  if (scan.isError || !scan.data) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Kiểm tra dữ liệu" />}>
        <ErrorState message="Không thể tải kết quả quét." onRetry={() => scan.refetch()} />
      </Screen>
    );
  }
  if (scan.data.status === 'PROCESSING') {
    return (
      <Screen header={<AppHeader back title="AI đang phân tích" />}>
        <SecureImageViewer
          uri={scan.data.fileUrl}
          contentType={scan.data.contentType}
          title={scan.data.originalFileName}
          height={210}
          testID="processing-scan-image"
        />
        <LoadingState label="Đang đọc nội dung trong ảnh và kiểm tra các trường…" />
      </Screen>
    );
  }
  if (scan.data.status === 'FAILED') {
    return (
      <Screen header={<AppHeader back title="Kiểm tra dữ liệu" />}>
        <SecureImageViewer
          uri={scan.data.fileUrl}
          contentType={scan.data.contentType}
          title={scan.data.originalFileName}
          height={210}
          testID="failed-scan-image"
        />
        <EmptyState
          icon="alert-circle-outline"
          title="AI chưa đọc được ảnh"
          message={scan.data.errorMessage ?? 'Bạn có thể thử lại với ảnh rõ và đủ sáng hơn.'}
          actionLabel="Quét ảnh khác"
          onAction={() => router.replace('/(tabs)/scan')}
        />
      </Screen>
    );
  }
  if (scan.data.status === 'CONFIRMED') {
    const confirmedRoute = scan.data.confirmedSourceId
      ? scan.data.targetType === 'DOCUMENT'
        ? `/documents/${scan.data.confirmedSourceId}`
        : scan.data.targetType === 'BILL'
          ? `/bills/${scan.data.confirmedSourceId}`
          : scan.data.targetType === 'ASSET'
            ? `/property/${scan.data.confirmedSourceId}`
            : '/(tabs)/spending'
      : null;
    const confirmedLabel =
      scan.data.targetType === 'DOCUMENT'
        ? 'Mở giấy tờ đã lưu'
        : scan.data.targetType === 'BILL'
          ? 'Mở hóa đơn đã lưu'
          : scan.data.targetType === 'ASSET'
            ? 'Mở tài sản đã lưu'
            : 'Mở sổ chi tiêu';
    return (
      <Screen header={<AppHeader back title="Ảnh đã lưu" />}>
        <SecureImageViewer
          uri={scan.data.fileUrl}
          contentType={scan.data.contentType}
          title={scan.data.originalFileName}
          testID="confirmed-scan-image"
        />
        <Card tone="success" style={styles.confirmedSummary}>
          <View style={styles.confirmedIcon}>
            <Ionicons name="checkmark" size={22} color={colors.success} />
          </View>
          <View style={styles.flex}>
            <AppText variant="supportingStrong" color={colors.success}>
              Dữ liệu đã được xác nhận
            </AppText>
            <AppText variant="label" color={colors.inkMuted}>
              Ảnh gốc vẫn được giữ để bạn đối chiếu khi cần.
            </AppText>
          </View>
        </Card>
        {confirmedRoute ? (
          <Button
            label={confirmedLabel}
            icon="arrow-forward"
            fullWidth
            onPress={() => router.push(confirmedRoute as Href)}
          />
        ) : null}
        <Button
          label="Về lịch sử quét"
          variant="ghost"
          fullWidth
          onPress={() => router.replace('/(tabs)/scan')}
        />
      </Screen>
    );
  }

  return (
    <Screen
      keyboardAware
      header={<AppHeader back title="Kiểm tra trước khi lưu" />}>
      <SecureImageViewer
        uri={scan.data.fileUrl}
        contentType={scan.data.contentType}
        title={scan.data.originalFileName}
        testID="scan-image-preview"
      />

      <Card tone={relevant ? 'success' : 'warning'} style={styles.aiStatus}>
        <View style={styles.aiIcon}>
          <Ionicons
            name={relevant ? 'sparkles' : 'alert-outline'}
            size={22}
            color={relevant ? colors.success : colors.warning}
          />
        </View>
        <View style={styles.flex}>
          <AppText variant="supportingStrong" color={relevant ? colors.success : colors.warning}>
            {relevant ? 'AI đã gợi ý các trường bên dưới' : 'Ảnh có thể không đúng loại đã chọn'}
          </AppText>
          <AppText variant="label" color={colors.inkMuted}>
            {confidence == null
              ? 'Hãy kiểm tra kỹ trước khi xác nhận.'
              : `Độ tin cậy ước tính ${Math.round(confidence * 100)}%. Bạn vẫn cần kiểm tra lại.`}
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
        {scan.data.targetType === 'DOCUMENT' ? (
          <DocumentDraft draft={draft} errors={errors} setDraft={setDraft} />
        ) : scan.data.targetType === 'BILL' ? (
          <BillDraft
            draft={draft}
            errors={errors}
            setDraft={setDraft}
            jars={spendingJars.data ?? []}
            onCreateJar={() => router.push('/spending/jar-form' as Href)}
          />
        ) : scan.data.targetType === 'EXPENSE' ? (
          <ExpenseDraft
            draft={draft}
            errors={errors}
            setDraft={setDraft}
            jars={spendingJars.data ?? []}
            loadingJars={spendingJars.isLoading}
            onCreateJar={() => router.push('/spending/jar-form' as Href)}
          />
        ) : (
          <AssetDraft draft={draft} errors={errors} setDraft={setDraft} />
        )}
      </View>

      <Card tone="soft" style={styles.reminderNote}>
        <Ionicons name="notifications-outline" size={21} color={colors.primary} />
        <AppText variant="label" color={colors.inkMuted} style={styles.flex}>
          {scan.data.targetType === 'EXPENSE'
            ? 'Khoản chi sẽ được ghi vào hũ đã chọn và cập nhật tổng chi tiêu tháng này.'
            : 'Sau khi lưu, House Keeper sẽ tự tạo lịch nhắc nếu dữ liệu có ngày đến hạn hoặc ngày hết bảo hành.'}
        </AppText>
      </Card>

      <Button
        label="Xác nhận và lưu"
        icon="checkmark"
        fullWidth
        loading={confirm.isPending}
        onPress={() => confirm.mutate()}
      />
      <Button
        label="Hủy lần quét"
        variant="ghost"
        fullWidth
        onPress={() => router.back()}
      />
    </Screen>
  );
}

function DocumentDraft({
  draft,
  setDraft,
  errors,
}: DraftEditorProps) {
  return (
    <>
      <ChoiceChips
        value={(draft.type || 'OTHER') as DocumentType}
        onChange={(type) => update(setDraft, 'type', type)}
        choices={(Object.keys(documentTypeLabels) as DocumentType[]).map((value) => ({
          value,
          label: documentTypeLabels[value],
        }))}
      />
      <FormField label="Tên giấy tờ *" value={draft.title ?? ''} onChangeText={(value) => update(setDraft, 'title', value)} error={errors.title} />
      <FormField label="Số giấy tờ" value={draft.documentNumber ?? ''} onChangeText={(value) => update(setDraft, 'documentNumber', value)} autoCapitalize="characters" />
      <FormField label="Nơi cấp" value={draft.issuer ?? ''} onChangeText={(value) => update(setDraft, 'issuer', value)} />
      <DateField label="Ngày cấp" value={draft.issueDate || null} onChange={(value) => update(setDraft, 'issueDate', value ?? '')} />
      <DateField label="Ngày hết hạn" value={draft.expirationDate || null} onChange={(value) => update(setDraft, 'expirationDate', value ?? '')} error={errors.expirationDate} />
      <FormField label="Ghi chú" value={draft.notes ?? ''} onChangeText={(value) => update(setDraft, 'notes', value)} multiline />
    </>
  );
}

function BillDraft({
  draft,
  setDraft,
  errors,
  jars,
  onCreateJar,
}: DraftEditorProps & { jars: SpendingJar[]; onCreateJar: () => void }) {
  return (
    <>
      <FormField label="Tên khoản thanh toán *" value={draft.title ?? ''} onChangeText={(value) => update(setDraft, 'title', value)} error={errors.title} />
      <FormField label="Nhà cung cấp" value={draft.provider ?? ''} onChangeText={(value) => update(setDraft, 'provider', value)} />
      <ChoiceChips
        value={(draft.category || 'OTHER') as BillCategory}
        onChange={(category) => update(setDraft, 'category', category)}
        choices={(Object.keys(billCategoryLabels) as BillCategory[]).map((value) => ({
          value,
          label: billCategoryLabels[value],
        }))}
      />
      <View style={styles.jarHeading}>
        <AppText variant="supportingStrong" color={colors.inkMuted}>
          Hũ chi khi thanh toán
        </AppText>
        <AppText variant="label" color={colors.inkMuted}>
          Gắn hũ để lần đánh dấu đã thanh toán được tự ghi vào chi tiêu.
        </AppText>
      </View>
      {jars.length ? (
        <ChoiceChips
          value={draft.jarId || ''}
          onChange={(jarId) => update(setDraft, 'jarId', jarId)}
          accessibilityLabel="Hũ chi của hóa đơn"
          choices={[{ value: '', label: 'Chưa chọn' }, ...jars.map((jar) => ({ value: jar.id, label: jar.name }))]}
        />
      ) : (
        <Button label="Tạo hũ chi tiêu" variant="secondary" onPress={onCreateJar} />
      )}
      <View style={styles.inline}>
        <View style={styles.flex}>
          <FormField label="Số tiền *" value={draft.amount ?? ''} onChangeText={(value) => update(setDraft, 'amount', value)} keyboardType="numeric" error={errors.amount} />
        </View>
        <View style={styles.currency}>
          <FormField label="Tiền tệ" value={draft.currency || 'VND'} onChangeText={(value) => update(setDraft, 'currency', value.toUpperCase())} autoCapitalize="characters" />
        </View>
      </View>
      <DateField label="Ngày đến hạn *" value={draft.nextDueDate || null} allowEmpty={false} onChange={(value) => update(setDraft, 'nextDueDate', value ?? '')} error={errors.nextDueDate} />
      <ChoiceChips
        value={(draft.recurrence || 'ONE_TIME') as Recurrence}
        onChange={(recurrence) => update(setDraft, 'recurrence', recurrence)}
        choices={(Object.keys(recurrenceLabels) as Recurrence[]).map((value) => ({
          value,
          label: recurrenceLabels[value],
        }))}
      />
      <FormField label="Nhắc trước (ngày)" value={draft.reminderDaysBefore || '3'} onChangeText={(value) => update(setDraft, 'reminderDaysBefore', value)} keyboardType="number-pad" error={errors.reminderDaysBefore} />
      <FormField label="Ghi chú" value={draft.notes ?? ''} onChangeText={(value) => update(setDraft, 'notes', value)} multiline />
    </>
  );
}

function ExpenseDraft({
  draft,
  setDraft,
  errors,
  jars,
  loadingJars,
  onCreateJar,
}: DraftEditorProps & {
  jars: SpendingJar[];
  loadingJars: boolean;
  onCreateJar: () => void;
}) {
  const suggested = normalizeJarName(draft.suggestedJarName);
  const suggestedJar = jars.find((jar) => normalizeJarName(jar.name) === suggested);
  const selectedJarId = draft.jarId || suggestedJar?.id || jars[0]?.id || '';

  return (
    <>
      <View style={styles.jarHeading}>
        <AppText variant="supportingStrong" color={colors.inkMuted}>
          Phân phối vào hũ chi *
        </AppText>
        {suggestedJar ? (
          <AppText variant="label" color={colors.success}>
            AI gợi ý: {suggestedJar.name}
          </AppText>
        ) : null}
      </View>
      {loadingJars ? (
        <LoadingState label="Đang tải các hũ chi tiêu…" />
      ) : jars.length ? (
        <ChoiceChips
          value={selectedJarId}
          onChange={(jarId) => update(setDraft, 'jarId', jarId)}
          accessibilityLabel="Hũ nhận khoản chi"
          choices={jars.map((jar) => ({ value: jar.id, label: jar.name }))}
        />
      ) : (
        <Card tone="warning" style={styles.noJarCard}>
          <Ionicons name="wallet-outline" size={22} color={colors.warning} />
          <View style={styles.flex}>
            <AppText variant="supportingStrong" color={colors.warning}>
              Chưa có hũ chi tiêu
            </AppText>
            <AppText variant="label" color={colors.inkMuted}>
              Tạo một hũ để khoản chi được ghi nhận đúng nơi.
            </AppText>
          </View>
          <Button label="Tạo hũ" variant="ghost" onPress={onCreateJar} />
        </Card>
      )}
      {errors.jarId ? (
        <AppText variant="label" color={colors.danger}>
          {errors.jarId}
        </AppText>
      ) : null}
      <FormField label="Tên khoản chi *" value={draft.title ?? ''} onChangeText={(value) => update(setDraft, 'title', value)} error={errors.title} />
      <FormField label="Nơi mua / người nhận" value={draft.merchant ?? ''} onChangeText={(value) => update(setDraft, 'merchant', value)} />
      <View style={styles.inline}>
        <View style={styles.flex}>
          <FormField label="Số tiền *" value={draft.amount ?? ''} onChangeText={(value) => update(setDraft, 'amount', value)} keyboardType="numeric" error={errors.amount} />
        </View>
        <View style={styles.currency}>
          <FormField label="Tiền tệ" value={draft.currency || 'VND'} onChangeText={(value) => update(setDraft, 'currency', value.toUpperCase())} autoCapitalize="characters" />
        </View>
      </View>
      <DateField label="Ngày giao dịch *" value={draft.spentAt || null} allowEmpty={false} onChange={(value) => update(setDraft, 'spentAt', value ?? '')} error={errors.spentAt} />
      <FormField label="Ghi chú" value={draft.note ?? ''} onChangeText={(value) => update(setDraft, 'note', value)} multiline />
    </>
  );
}

function AssetDraft({ draft, setDraft, errors }: DraftEditorProps) {
  return (
    <>
      <ChoiceChips
        value={(draft.category || 'OTHER') as AssetCategory}
        onChange={(category) => update(setDraft, 'category', category)}
        choices={(Object.keys(assetCategoryLabels) as AssetCategory[]).map((value) => ({
          value,
          label: assetCategoryLabels[value],
        }))}
      />
      <FormField label="Tên tài sản *" value={draft.name ?? ''} onChangeText={(value) => update(setDraft, 'name', value)} error={errors.name} />
      <View style={styles.inline}>
        <View style={styles.flex}>
          <FormField label="Thương hiệu" value={draft.brand ?? ''} onChangeText={(value) => update(setDraft, 'brand', value)} />
        </View>
        <View style={styles.flex}>
          <FormField label="Model" value={draft.model ?? ''} onChangeText={(value) => update(setDraft, 'model', value)} />
        </View>
      </View>
      <FormField label="Số serial" value={draft.serialNumber ?? ''} onChangeText={(value) => update(setDraft, 'serialNumber', value)} autoCapitalize="characters" />
      <DateField label="Ngày mua" value={draft.purchaseDate || null} onChange={(value) => update(setDraft, 'purchaseDate', value ?? '')} />
      <View style={styles.inline}>
        <View style={styles.flex}>
          <FormField label="Giá mua" value={draft.purchasePrice ?? ''} onChangeText={(value) => update(setDraft, 'purchasePrice', value)} keyboardType="numeric" error={errors.purchasePrice} />
        </View>
        <View style={styles.currency}>
          <FormField label="Tiền tệ" value={draft.currency || 'VND'} onChangeText={(value) => update(setDraft, 'currency', value.toUpperCase())} autoCapitalize="characters" />
        </View>
      </View>
      <DateField label="Hết hạn bảo hành" value={draft.warrantyExpiresOn || null} onChange={(value) => update(setDraft, 'warrantyExpiresOn', value ?? '')} error={errors.warrantyExpiresOn} />
      <FormField label="Ghi chú" value={draft.notes ?? ''} onChangeText={(value) => update(setDraft, 'notes', value)} multiline />
    </>
  );
}

interface DraftEditorProps {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  errors: Record<string, string>;
}

function update(
  setter: React.Dispatch<React.SetStateAction<Draft>>,
  key: string,
  value: string,
) {
  setter((current) => ({ ...current, [key]: value }));
}

function text(value: unknown, fallback = '') {
  return value == null ? fallback : String(value);
}

function normalizeJarName(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function toDraft(scan: ScanJob, raw: Record<string, unknown>): Draft {
  if (scan.targetType === 'DOCUMENT') {
    return {
      type: text(raw.type, 'OTHER'),
      title: text(raw.title),
      documentNumber: text(raw.documentNumber),
      issuer: text(raw.issuer),
      issueDate: text(raw.issueDate),
      expirationDate: text(raw.expirationDate),
      notes: text(raw.notes),
    };
  }
  if (scan.targetType === 'BILL') {
    return {
      title: text(raw.title, text(raw.provider, 'Hóa đơn')),
      provider: text(raw.provider),
      category: text(raw.category, 'OTHER'),
      amount: text(raw.amount),
      currency: text(raw.currency, 'VND'),
      recurrence: text(raw.recurrence, 'ONE_TIME'),
      nextDueDate: text(raw.nextDueDate),
      reminderDaysBefore: '3',
      notes: text(raw.notes),
    };
  }
  if (scan.targetType === 'EXPENSE') {
    return {
      title: text(raw.title, text(raw.merchant, 'Khoản chi')),
      merchant: text(raw.merchant),
      amount: text(raw.amount),
      currency: text(raw.currency, 'VND'),
      spentAt: text(raw.spentAt),
      suggestedJarName: text(raw.suggestedJarName),
      note: text(raw.note),
    };
  }
  return {
    name: text(raw.name),
    category: text(raw.category, 'OTHER'),
    brand: text(raw.brand),
    model: text(raw.model),
    serialNumber: text(raw.serialNumber),
    purchaseDate: text(raw.purchaseDate),
    purchasePrice: text(raw.purchasePrice),
    currency: text(raw.currency, 'VND'),
    warrantyExpiresOn: text(raw.warrantyExpiresOn),
    notes: text(raw.notes),
  };
}

function draftForJson(scan: ScanJob, draft: Draft) {
  if (scan.targetType === 'BILL') {
    return { ...draft, amount: draft.amount ? Number(draft.amount) : null };
  }
  if (scan.targetType === 'ASSET') {
    return { ...draft, purchasePrice: draft.purchasePrice ? Number(draft.purchasePrice) : null };
  }
  if (scan.targetType === 'EXPENSE') {
    return { ...draft, amount: draft.amount ? Number(draft.amount) : null };
  }
  return draft;
}

function buildInput(
  scan: ScanJob,
  draft: Draft,
  setErrors: (errors: Record<string, string>) => void,
): DocumentInput | BillInput | AssetInput | ExpenseInput | null {
  const errors: Record<string, string> = {};
  if (scan.targetType === 'DOCUMENT') {
    if (!draft.title?.trim()) errors.title = 'Vui lòng kiểm tra tên giấy tờ.';
    if (draft.issueDate && draft.expirationDate && draft.expirationDate < draft.issueDate) {
      errors.expirationDate = 'Ngày hết hạn phải sau ngày cấp.';
    }
    setErrors(errors);
    if (Object.keys(errors).length) return null;
    return {
      type: (draft.type || 'OTHER') as DocumentType,
      title: draft.title.trim(),
      documentNumber: draft.documentNumber || null,
      issuer: draft.issuer || null,
      issueDate: draft.issueDate || null,
      expirationDate: draft.expirationDate || null,
      fileUrl: scan.fileUrl,
      notes: draft.notes || null,
    };
  }
  if (scan.targetType === 'BILL') {
    const amount = Number(draft.amount);
    const reminderDays = Number(draft.reminderDaysBefore || '3');
    if (!draft.title?.trim()) errors.title = 'Vui lòng kiểm tra tên khoản thanh toán.';
    if (!Number.isFinite(amount) || amount < 0) errors.amount = 'Số tiền không hợp lệ.';
    if (!draft.nextDueDate) {
      errors.nextDueDate =
        'AI không được dùng ngày giao dịch thay ngày đến hạn. Vui lòng chọn ngày thanh toán.';
    }
    if (!Number.isInteger(reminderDays) || reminderDays < 0 || reminderDays > 365) {
      errors.reminderDaysBefore = 'Số ngày nhắc phải từ 0 đến 365.';
    }
    setErrors(errors);
    if (Object.keys(errors).length) return null;
    return {
      title: draft.title.trim(),
      provider: draft.provider || null,
      category: (draft.category || 'OTHER') as BillCategory,
      amount,
      currency: draft.currency || 'VND',
      recurrence: (draft.recurrence || 'ONE_TIME') as Recurrence,
      nextDueDate: draft.nextDueDate,
      reminderDaysBefore: reminderDays,
      autoRenew: false,
      active: true,
      notes: draft.notes || null,
      invoiceFileUrl: scan.fileUrl,
      spendingJarId: draft.jarId || null,
    };
  }
  if (scan.targetType === 'EXPENSE') {
    const amount = Number(draft.amount);
    if (!draft.jarId?.trim()) errors.jarId = 'Vui lòng chọn hũ nhận khoản chi.';
    if (!draft.title?.trim()) errors.title = 'Vui lòng kiểm tra tên khoản chi.';
    if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Số tiền phải lớn hơn 0.';
    if (!draft.spentAt) errors.spentAt = 'Vui lòng chọn ngày giao dịch.';
    setErrors(errors);
    if (Object.keys(errors).length) return null;
    return {
      jarId: draft.jarId,
      amount,
      currency: (draft.currency || 'VND').trim().toUpperCase(),
      title: draft.title.trim(),
      merchant: draft.merchant || null,
      spentAt: `${draft.spentAt}T12:00:00.000Z`,
      note: draft.note || null,
      receiptFileUrl: scan.fileUrl,
    };
  }
  const price = draft.purchasePrice ? Number(draft.purchasePrice) : null;
  if (!draft.name?.trim()) errors.name = 'Vui lòng kiểm tra tên tài sản.';
  if (price != null && (!Number.isFinite(price) || price < 0)) {
    errors.purchasePrice = 'Giá mua không hợp lệ.';
  }
  if (
    draft.purchaseDate &&
    draft.warrantyExpiresOn &&
    draft.warrantyExpiresOn < draft.purchaseDate
  ) {
    errors.warrantyExpiresOn = 'Ngày hết bảo hành phải sau ngày mua.';
  }
  setErrors(errors);
  if (Object.keys(errors).length) return null;
  return {
    name: draft.name.trim(),
    category: (draft.category || 'OTHER') as AssetCategory,
    brand: draft.brand || null,
    model: draft.model || null,
    serialNumber: draft.serialNumber || null,
    purchaseDate: draft.purchaseDate || null,
    purchasePrice: price,
    currency: draft.currency || 'VND',
    warrantyExpiresOn: draft.warrantyExpiresOn || null,
    invoiceFileUrl: scan.fileUrl,
    notes: draft.notes || null,
  };
}

class ValidationError extends Error {}

const styles = StyleSheet.create({
  confirmedSummary: {
    alignItems: 'center',
    borderColor: colors.transparent,
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmedIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  aiStatus: {
    alignItems: 'flex-start',
    borderColor: colors.transparent,
    flexDirection: 'row',
    gap: spacing.md,
  },
  aiIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  warning: {
    alignItems: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  form: {
    gap: spacing.lg,
  },
  jarHeading: {
    gap: spacing.xs,
  },
  noJarCard: {
    alignItems: 'center',
    borderColor: colors.warningSoft,
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  inline: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  currency: {
    width: 105,
  },
  reminderNote: {
    alignItems: 'flex-start',
    borderColor: colors.primarySoft,
    flexDirection: 'row',
    gap: spacing.md,
  },
});
