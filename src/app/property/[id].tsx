import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ConfirmationSheet,
  ConfirmationSheetStatus,
} from '@/components/ui/confirmation-sheet';
import { DetailRow } from '@/components/ui/detail-row';
import { ErrorState, LoadingState } from '@/components/ui/feedback';
import { AppHeader, SectionHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { SecureImageViewer } from '@/components/ui/secure-image-viewer';
import { StatusBadge, urgencyTone } from '@/components/ui/status-badge';
import {
  assetCategoryLabels,
  formatCurrency,
  formatDate,
  warrantyLabels,
} from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { colors, radii, spacing } from '@/theme/tokens';

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const asset = useQuery({ queryKey: queryKeys.asset(id), queryFn: () => housekeeperApi.getAsset(id) });
  const maintenance = useQuery({
    queryKey: queryKeys.maintenance(id),
    queryFn: () => housekeeperApi.listMaintenance(id),
  });
  const remove = useMutation({
    mutationFn: () => housekeeperApi.deleteAsset(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.assets,
        exact: true,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/inventory');
    },
    onError: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  if (asset.isLoading) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Chi tiết tài sản" />}>
        <LoadingState />
      </Screen>
    );
  }
  if (asset.isError || !asset.data) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Chi tiết tài sản" />}>
        <ErrorState message="Không thể tải tài sản này." onRetry={() => asset.refetch()} />
      </Screen>
    );
  }
  const data = asset.data;
  const deleteStatus: ConfirmationSheetStatus = remove.isPending
    ? 'loading'
    : remove.isError
      ? 'error'
      : 'confirm';

  function confirmDelete() {
    remove.reset();
    setDeleteSheetVisible(true);
  }

  function closeDeleteSheet() {
    if (!remove.isPending) setDeleteSheetVisible(false);
  }

  return (
    <Screen
      header={
        <AppHeader
          back
          title="Chi tiết tài sản"
          right={
            <IconButton
              icon="create-outline"
              label="Sửa tài sản"
              onPress={() => router.push(`/property/form?id=${id}`)}
            />
          }
        />
      }>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="cube-outline" size={36} color={colors.primary} />
        </View>
        <AppText variant="headline" style={styles.center}>
          {data.name}
        </AppText>
        <AppText variant="supporting" color={colors.inkMuted}>
          {[data.brand, data.model].filter(Boolean).join(' · ') ||
            assetCategoryLabels[data.category]}
        </AppText>
        <StatusBadge label={warrantyLabels[data.warrantyStatus]} tone={urgencyTone(data.warrantyStatus)} />
      </View>

      <Card>
        <DetailRow label="Loại tài sản" value={assetCategoryLabels[data.category]} />
        <DetailRow label="Số serial" value={data.serialNumber ?? 'Chưa nhập'} />
        <DetailRow label="Ngày mua" value={formatDate(data.purchaseDate)} />
        <DetailRow label="Giá mua" value={formatCurrency(data.purchasePrice, data.currency)} />
        <DetailRow label="Hết bảo hành" value={formatDate(data.warrantyExpiresOn)} last />
      </Card>

      {data.invoiceFileUrl ? (
        <View style={styles.section}>
          <SectionHeader title="Hóa đơn mua hàng" />
          <SecureImageViewer
            uri={data.invoiceFileUrl}
            title={`Hóa đơn ${data.name}`}
            height={210}
            testID="asset-invoice-image"
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Sửa chữa & Bảo dưỡng" />
        {maintenance.data?.length ? (
          maintenance.data.map((item) => (
            <Card key={item.id} style={styles.maintenance}>
              <View style={styles.maintenanceIcon}>
                <Ionicons name="build-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <AppText variant="supportingStrong">{item.description}</AppText>
                <AppText variant="label" color={colors.inkMuted}>
                  {formatDate(item.performedOn)}
                  {item.provider ? ` · ${item.provider}` : ''}
                </AppText>
              </View>
              <AppText variant="labelStrong" color={colors.primary}>
                {formatCurrency(item.cost, item.currency)}
              </AppText>
            </Card>
          ))
        ) : (
          <Card tone="soft" style={styles.emptyMaintenance}>
            <Ionicons name="construct-outline" size={22} color={colors.primary} />
            <AppText variant="supporting" color={colors.inkMuted} style={styles.flex}>
              Chưa có lịch sử sửa chữa hoặc bảo dưỡng.
            </AppText>
          </Card>
        )}
      </View>

      {data.notes ? (
        <Card tone="soft">
          <AppText variant="supportingStrong">Ghi chú</AppText>
          <AppText variant="supporting" color={colors.inkMuted}>
            {data.notes}
          </AppText>
        </Card>
      ) : null}

      <Button label="Sửa thông tin" icon="create-outline" fullWidth onPress={() => router.push(`/property/form?id=${id}`)} />
      <Button label="Xóa tài sản" variant="ghost" icon="trash-outline" loading={remove.isPending} fullWidth onPress={confirmDelete} />

      <ConfirmationSheet
        visible={deleteSheetVisible}
        status={deleteStatus}
        title="Xóa tài sản?"
        description="Thông tin bảo hành và lịch sửa chữa liên quan cũng sẽ bị xóa. Thao tác này không thể hoàn tác."
        confirmLabel="Xóa tài sản"
        confirmVariant="danger"
        icon="trash-outline"
        tone="danger"
        loadingTitle="Đang xóa tài sản"
        loadingDescription="House Keeper đang xóa tài sản và dữ liệu liên quan."
        errorTitle="Chưa thể xóa tài sản"
        errorDescription={
          remove.error?.message ??
          'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'
        }
        onConfirm={() => remove.mutate()}
        onDismiss={closeDeleteSheet}
        testID="asset-delete-confirmation-sheet">
        <DetailRow label="Tài sản" value={data.name} last />
      </ConfirmationSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  center: {
    textAlign: 'center',
  },
  section: {
    gap: spacing.md,
  },
  maintenance: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  maintenanceIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  emptyMaintenance: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
});
