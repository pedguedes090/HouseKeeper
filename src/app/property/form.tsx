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
import { assetCategoryLabels } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { AssetCategory, AssetInput } from '@/lib/types';
import { spacing } from '@/theme/tokens';

const empty: AssetInput = {
  name: '',
  category: 'OTHER',
  brand: '',
  model: '',
  serialNumber: '',
  purchaseDate: null,
  purchasePrice: null,
  currency: 'VND',
  warrantyExpiresOn: null,
  notes: '',
};

export default function AssetFormScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [form, setForm] = useState<AssetInput>(empty);
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const existing = useQuery({
    queryKey: queryKeys.asset(id ?? ''),
    queryFn: () => housekeeperApi.getAsset(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (existing.data) {
      const {
        name,
        category,
        brand,
        model,
        serialNumber,
        purchaseDate,
        purchasePrice,
        currency,
        warrantyExpiresOn,
        invoiceFileUrl,
        notes,
      } = existing.data;
      setForm({
        name,
        category,
        brand,
        model,
        serialNumber,
        purchaseDate,
        purchasePrice,
        currency,
        warrantyExpiresOn,
        invoiceFileUrl,
        notes,
      });
      setPrice(purchasePrice == null ? '' : String(purchasePrice));
    }
  }, [existing.data]);

  const save = useMutation({
    mutationFn: (input: AssetInput) =>
      id ? housekeeperApi.updateAsset(id, input) : housekeeperApi.createAsset(input),
    onSuccess: (asset) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.assets });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      router.replace({ pathname: '/property/[id]', params: { id: asset.id } });
    },
    onError: (error: Error) => Alert.alert('Chưa thể lưu tài sản', error.message),
  });

  function submit() {
    const numericPrice = price.trim() ? Number(price.replace(/[^\d.]/g, '')) : null;
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Vui lòng nhập tên tài sản.';
    if (numericPrice != null && (!Number.isFinite(numericPrice) || numericPrice < 0)) {
      nextErrors.price = 'Giá mua không hợp lệ.';
    }
    if (
      form.purchaseDate &&
      form.warrantyExpiresOn &&
      form.warrantyExpiresOn < form.purchaseDate
    ) {
      nextErrors.warranty = 'Ngày hết bảo hành phải sau ngày mua.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    save.mutate({ ...form, name: form.name.trim(), purchasePrice: numericPrice });
  }

  if (id && existing.isLoading) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Tài sản" />}>
        <LoadingState />
      </Screen>
    );
  }
  if (id && existing.isError) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Tài sản" />}>
        <ErrorState message="Không thể tải tài sản cần sửa." onRetry={() => existing.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen keyboardAware header={<AppHeader back title={id ? 'Sửa tài sản' : 'Thêm tài sản'} />}>
      <View style={styles.form}>
        <ChoiceChips
          value={form.category}
          onChange={(category) => setForm((current) => ({ ...current, category }))}
          choices={(Object.keys(assetCategoryLabels) as AssetCategory[]).map((value) => ({
            value,
            label: assetCategoryLabels[value],
          }))}
        />
        <FormField
          label="Tên tài sản *"
          value={form.name}
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          placeholder="Ví dụ: Laptop làm việc"
          error={errors.name}
        />
        <View style={styles.inline}>
          <View style={styles.flex}>
            <FormField
              label="Thương hiệu"
              value={form.brand ?? ''}
              onChangeText={(brand) => setForm((current) => ({ ...current, brand }))}
              placeholder="Apple, Samsung…"
            />
          </View>
          <View style={styles.flex}>
            <FormField
              label="Model"
              value={form.model ?? ''}
              onChangeText={(model) => setForm((current) => ({ ...current, model }))}
              placeholder="Mã sản phẩm"
            />
          </View>
        </View>
        <FormField
          label="Số serial"
          value={form.serialNumber ?? ''}
          onChangeText={(serialNumber) =>
            setForm((current) => ({ ...current, serialNumber }))
          }
          autoCapitalize="characters"
        />
        <DateField
          label="Ngày mua"
          value={form.purchaseDate ?? null}
          onChange={(purchaseDate) => setForm((current) => ({ ...current, purchaseDate }))}
        />
        <View style={styles.inline}>
          <View style={styles.flex}>
            <FormField
              label="Giá mua"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="0"
              error={errors.price}
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
          label="Hết hạn bảo hành"
          value={form.warrantyExpiresOn ?? null}
          onChange={(warrantyExpiresOn) =>
            setForm((current) => ({ ...current, warrantyExpiresOn }))
          }
          error={errors.warranty}
        />
        <FormField
          label="Ghi chú"
          value={form.notes ?? ''}
          onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
          placeholder="Vị trí hóa đơn, tình trạng thiết bị…"
          multiline
        />
      </View>
      <Button label={id ? 'Lưu thay đổi' : 'Lưu tài sản'} fullWidth loading={save.isPending} onPress={submit} />
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
