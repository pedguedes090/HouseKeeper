import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { housekeeperApi } from '@/lib/housekeeper-api';
import { SpendingJar } from '@/lib/types';
import { colors, spacing } from '@/theme/tokens';

export default function JarFormScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: (input: Omit<SpendingJar, 'id' | 'archived'>) => housekeeperApi.createSpendingJar(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['spending'] });
      router.back();
    },
    onError: (error: Error) => Alert.alert('Chưa thể tạo hũ', error.message),
  });

  function submit() {
    const monthlyLimit = limit.trim() ? Number(limit.replace(/[^\d.]/g, '')) : 0;
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Vui lòng nhập tên hũ.';
    if (!Number.isFinite(monthlyLimit) || monthlyLimit < 0) nextErrors.limit = 'Hạn mức không hợp lệ.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    save.mutate({
      name: name.trim(),
      icon: 'wallet-outline',
      color: colors.primary,
      currency: currency.trim().toUpperCase() || 'VND',
      defaultMonthlyLimit: monthlyLimit,
      displayOrder: 99,
    });
  }

  return (
    <Screen keyboardAware header={<AppHeader back title="Tạo hũ chi tiêu" />}>
      <Card tone="soft" style={styles.intro}>
        <AppText variant="title" color={colors.primary}>Tạo một hũ cho mục tiêu của bạn</AppText>
        <AppText variant="supporting" color={colors.inkMuted}>
          Ví dụ: Ăn uống, Di chuyển, Mua sắm hoặc một mục tiêu riêng của gia đình.
        </AppText>
      </Card>
      <View style={styles.form}>
        <FormField label="Tên hũ *" value={name} onChangeText={setName} placeholder="Ví dụ: Học cho con" error={errors.name} />
        <View style={styles.inline}>
          <View style={styles.flex}>
            <FormField label="Hạn mức tháng" value={limit} onChangeText={setLimit} keyboardType="numeric" placeholder="0 = chưa đặt hạn mức" error={errors.limit} />
          </View>
          <View style={styles.currency}>
            <FormField label="Tiền tệ" value={currency} onChangeText={(value) => setCurrency(value.toUpperCase())} autoCapitalize="characters" />
          </View>
        </View>
      </View>
      <Button label="Tạo hũ" icon="checkmark" fullWidth loading={save.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.sm, borderColor: colors.primarySoft },
  form: { gap: spacing.lg },
  inline: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  currency: { width: 105 },
});
