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
import { documentTypeLabels } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { DocumentInput, DocumentType } from '@/lib/types';
import { spacing } from '@/theme/tokens';

const empty: DocumentInput = {
  type: 'NATIONAL_ID',
  title: '',
  documentNumber: '',
  issuer: '',
  issueDate: null,
  expirationDate: null,
  notes: '',
};

export default function DocumentFormScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [form, setForm] = useState<DocumentInput>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const existing = useQuery({
    queryKey: queryKeys.document(id ?? ''),
    queryFn: () => housekeeperApi.getDocument(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (existing.data) {
      const { type, title, documentNumber, issuer, issueDate, expirationDate, fileUrl, notes } =
        existing.data;
      setForm({ type, title, documentNumber, issuer, issueDate, expirationDate, fileUrl, notes });
    }
  }, [existing.data]);

  const save = useMutation({
    mutationFn: (input: DocumentInput) =>
      id ? housekeeperApi.updateDocument(id, input) : housekeeperApi.createDocument(input),
    onSuccess: (document) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      router.replace(`/documents/${document.id}`);
    },
    onError: (error: Error) => Alert.alert('Chưa thể lưu giấy tờ', error.message),
  });

  function submit() {
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = 'Vui lòng nhập tên giấy tờ.';
    if (
      form.issueDate &&
      form.expirationDate &&
      form.expirationDate < form.issueDate
    ) {
      nextErrors.expirationDate = 'Ngày hết hạn phải sau ngày cấp.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    save.mutate({ ...form, title: form.title.trim() });
  }

  if (id && existing.isLoading) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Giấy tờ" />}>
        <LoadingState />
      </Screen>
    );
  }
  if (id && existing.isError) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Giấy tờ" />}>
        <ErrorState message="Không thể tải giấy tờ cần sửa." onRetry={() => existing.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen
      keyboardAware
      header={<AppHeader back title={id ? 'Sửa giấy tờ' : 'Thêm giấy tờ'} />}>
      <View style={styles.form}>
        <ChoiceChips
          value={form.type}
          onChange={(type) => setForm((current) => ({ ...current, type }))}
          choices={(Object.keys(documentTypeLabels) as DocumentType[]).map((value) => ({
            value,
            label: documentTypeLabels[value],
          }))}
        />
        <FormField
          label="Tên giấy tờ *"
          value={form.title}
          onChangeText={(title) => setForm((current) => ({ ...current, title }))}
          placeholder="Ví dụ: Căn cước của tôi"
          error={errors.title}
        />
        <FormField
          label="Số giấy tờ"
          value={form.documentNumber ?? ''}
          onChangeText={(documentNumber) =>
            setForm((current) => ({ ...current, documentNumber }))
          }
          placeholder="Số căn cước, hộ chiếu…"
          autoCapitalize="characters"
        />
        <FormField
          label="Nơi cấp"
          value={form.issuer ?? ''}
          onChangeText={(issuer) => setForm((current) => ({ ...current, issuer }))}
          placeholder="Cơ quan cấp"
        />
        <DateField
          label="Ngày cấp"
          value={form.issueDate ?? null}
          onChange={(issueDate) => setForm((current) => ({ ...current, issueDate }))}
        />
        <DateField
          label="Ngày hết hạn"
          value={form.expirationDate ?? null}
          onChange={(expirationDate) =>
            setForm((current) => ({ ...current, expirationDate }))
          }
          error={errors.expirationDate}
        />
        <FormField
          label="Ghi chú"
          value={form.notes ?? ''}
          onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
          placeholder="Thông tin cần nhớ thêm"
          multiline
        />
      </View>
      <Button label={id ? 'Lưu thay đổi' : 'Lưu giấy tờ'} fullWidth loading={save.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
});
