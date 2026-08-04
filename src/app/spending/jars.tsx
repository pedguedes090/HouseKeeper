/* eslint-disable react-hooks/set-state-in-effect -- populate editor when a jar is selected */
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { AppHeader, SectionHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { SpendingJarInput, SpendingJarRecord } from '@/lib/types';
import { colors, radii, spacing } from '@/theme/tokens';

const jarColors = ['#0058BE', '#006C49', '#825100', '#6D4C9A', '#BA1A1A'];

export default function SpendingJarsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const jars = useQuery({
    queryKey: queryKeys.spendingJars,
    queryFn: housekeeperApi.listSpendingJars,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(
    () => jars.data?.find((jar) => jar.id === editingId),
    [editingId, jars.data],
  );
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [color, setColor] = useState<string>(jarColors[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setLimit(String(editing.defaultMonthlyLimit));
    setColor(editing.color);
  }, [editing]);

  const save = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id?: string;
      input: SpendingJarInput;
    }) =>
      id
        ? housekeeperApi.updateSpendingJar(id, input)
        : housekeeperApi.createSpendingJar(input),
    onSuccess: async () => {
      await refresh();
      resetEditor();
    },
    onError: (error) =>
      Alert.alert('Chưa thể lưu hũ', getApiErrorMessage(error)),
  });

  const archive = useMutation({
    mutationFn: housekeeperApi.archiveSpendingJar,
    onSuccess: refresh,
    onError: (error) =>
      Alert.alert('Chưa thể lưu trữ hũ', getApiErrorMessage(error)),
  });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.spendingJars }),
      queryClient.invalidateQueries({ queryKey: ['spending', 'overview'] }),
    ]);
  }

  function resetEditor() {
    setEditingId(null);
    setName('');
    setLimit('');
    setColor(jarColors[0]);
    setErrors({});
  }

  function submit() {
    const numericLimit = Number(limit.replace(/[^\d.]/g, '')) || 0;
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Vui lòng nhập tên hũ.';
    if (numericLimit < 0) nextErrors.limit = 'Hạn mức không thể âm.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    save.mutate({
      id: editingId ?? undefined,
      input: {
        name: name.trim(),
        icon: editing?.icon ?? 'wallet-outline',
        color,
        currency: editing?.currency ?? 'VND',
        defaultMonthlyLimit: numericLimit,
        displayOrder: editing?.displayOrder ?? jars.data?.length ?? 0,
      },
    });
  }

  function move(jar: SpendingJarRecord, delta: number) {
    save.mutate({
      id: jar.id,
      input: {
        name: jar.name,
        icon: jar.icon,
        color: jar.color,
        currency: jar.currency,
        defaultMonthlyLimit: jar.defaultMonthlyLimit,
        displayOrder: Math.max(0, jar.displayOrder + delta),
      },
    });
  }

  if (jars.isLoading) {
    return (
      <Screen
        scroll={false}
        bottomInset={false}
        header={<AppHeader back title="Quản lý hũ" />}>
        <LoadingState />
      </Screen>
    );
  }
  if (jars.isError) {
    return (
      <Screen
        scroll={false}
        bottomInset={false}
        header={<AppHeader back title="Quản lý hũ" />}>
        <ErrorState
          message="Không thể tải danh sách hũ."
          onRetry={() => jars.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen header={<AppHeader back title="Quản lý hũ" />}>
      <View style={styles.section}>
        <SectionHeader title={`${jars.data?.length ?? 0} hũ đang dùng`} />
        <View style={styles.list}>
          {jars.data?.map((jar) => (
            <Pressable
              key={jar.id}
              accessibilityRole="button"
              accessibilityLabel={`Sửa hũ ${jar.name}`}
              onPress={() => setEditingId(jar.id)}
              style={styles.jarRow}>
              <View style={[styles.dot, { backgroundColor: jar.color }]} />
              <View style={styles.jarContent}>
                <AppText variant="bodyMedium">{jar.name}</AppText>
                <AppText variant="label" color={colors.inkMuted}>
                  {jar.defaultMonthlyLimit > 0
                    ? `${formatCurrency(jar.defaultMonthlyLimit, jar.currency)} / tháng`
                    : 'Chưa đặt hạn mức'}
                </AppText>
              </View>
              <IconButton
                icon="arrow-up"
                label={`Đưa ${jar.name} lên`}
                onPress={() => move(jar, -1)}
              />
              <IconButton
                icon="arrow-down"
                label={`Đưa ${jar.name} xuống`}
                onPress={() => move(jar, 1)}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title={editing ? 'Sửa hũ' : 'Tạo hũ mới'} />
        <View style={styles.form}>
          <FormField
            label="Tên hũ *"
            value={name}
            onChangeText={setName}
            placeholder="Ví dụ: Cà phê"
            error={errors.name}
          />
          <FormField
            label="Hạn mức mặc định mỗi tháng"
            value={limit}
            onChangeText={setLimit}
            keyboardType="numeric"
            placeholder="0"
            error={errors.limit}
          />
          <View style={styles.colorSection}>
            <AppText variant="supportingStrong" color={colors.inkMuted}>
              Màu nhận diện
            </AppText>
            <View style={styles.colors}>
              {jarColors.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn màu ${value}`}
                  accessibilityState={{ selected: value === color }}
                  onPress={() => setColor(value)}
                  style={[
                    styles.colorButton,
                    { backgroundColor: value },
                    value === color && styles.colorSelected,
                  ]}>
                  {value === color ? (
                    <Ionicons name="checkmark" size={20} color={colors.white} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          {editing ? (
            <>
              <Button label="Hủy sửa" variant="secondary" onPress={resetEditor} />
              <Button
                label="Lưu trữ"
                variant="ghost"
                onPress={() =>
                  Alert.alert(
                    'Lưu trữ hũ?',
                    'Hũ sẽ biến mất khỏi tháng mới. Các khoản chi cũ vẫn được giữ.',
                    [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'Lưu trữ',
                        style: 'destructive',
                        onPress: () => archive.mutate(editing.id),
                      },
                    ],
                  )
                }
              />
            </>
          ) : null}
          <Button
            label={editing ? 'Lưu thay đổi' : 'Tạo hũ'}
            loading={save.isPending}
            onPress={submit}
          />
        </View>
      </View>

      <Button label="Xong" variant="secondary" fullWidth onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },
  jarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 68,
  },
  dot: {
    borderRadius: radii.pill,
    height: 12,
    marginRight: spacing.md,
    width: 12,
  },
  jarContent: {
    flex: 1,
  },
  form: {
    gap: spacing.lg,
  },
  colorSection: {
    gap: spacing.sm,
  },
  colors: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  colorButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  colorSelected: {
    borderColor: colors.ink,
    borderWidth: 2,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
});
