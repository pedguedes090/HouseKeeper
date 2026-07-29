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
import { documentTypeLabels, formatDate, urgencyLabels } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { colors, radii, spacing } from '@/theme/tokens';

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const query = useQuery({
    queryKey: queryKeys.document(id),
    queryFn: () => housekeeperApi.getDocument(id),
  });
  const remove = useMutation({
    mutationFn: () => housekeeperApi.deleteDocument(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.documents,
        exact: true,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/documents');
    },
    onError: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  function confirmDelete() {
    remove.reset();
    setDeleteSheetVisible(true);
  }

  function closeDeleteSheet() {
    if (!remove.isPending) setDeleteSheetVisible(false);
  }

  if (query.isLoading) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Chi tiết giấy tờ" />}>
        <LoadingState />
      </Screen>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Chi tiết giấy tờ" />}>
        <ErrorState message="Không thể tải giấy tờ này." onRetry={() => query.refetch()} />
      </Screen>
    );
  }
  const document = query.data;
  const deleteStatus: ConfirmationSheetStatus = remove.isPending
    ? 'loading'
    : remove.isError
      ? 'error'
      : 'confirm';

  return (
    <Screen
      header={
        <AppHeader
          back
          title="Chi tiết giấy tờ"
          right={
            <IconButton
              icon="create-outline"
              label="Sửa giấy tờ"
              onPress={() => router.push(`/documents/form?id=${id}`)}
            />
          }
        />
      }>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="id-card-outline" size={34} color={colors.primary} />
        </View>
        <AppText variant="headline" style={styles.center}>
          {document.title}
        </AppText>
        <AppText variant="supporting" color={colors.inkMuted}>
          {documentTypeLabels[document.type]}
        </AppText>
        <StatusBadge label={urgencyLabels[document.urgency]} tone={urgencyTone(document.urgency)} />
      </View>

      <Card>
        <DetailRow label="Số giấy tờ" value={document.documentNumber ?? 'Chưa nhập'} />
        <DetailRow label="Nơi cấp" value={document.issuer ?? 'Chưa nhập'} />
        <DetailRow label="Ngày cấp" value={formatDate(document.issueDate)} />
        <DetailRow label="Ngày hết hạn" value={formatDate(document.expirationDate)} />
        <DetailRow
          label="Thời gian còn lại"
          value={
            document.daysRemaining == null
              ? 'Không giới hạn'
              : document.daysRemaining < 0
                ? `Đã quá ${Math.abs(document.daysRemaining)} ngày`
                : `${document.daysRemaining} ngày`
          }
          last
        />
      </Card>

      {document.fileUrl ? (
        <View style={styles.section}>
          <SectionHeader title="Bản chụp giấy tờ" />
          <SecureImageViewer
            uri={document.fileUrl}
            title={`Ảnh ${document.title}`}
            height={210}
            testID="document-image"
          />
        </View>
      ) : null}

      {document.notes ? (
        <Card tone="soft">
          <AppText variant="supportingStrong">Ghi chú</AppText>
          <AppText variant="supporting" color={colors.inkMuted}>
            {document.notes}
          </AppText>
        </Card>
      ) : null}

      <Button
        label="Sửa thông tin"
        icon="create-outline"
        fullWidth
        onPress={() => router.push(`/documents/form?id=${id}`)}
      />
      <Button
        label="Xóa giấy tờ"
        variant="ghost"
        icon="trash-outline"
        loading={remove.isPending}
        fullWidth
        onPress={confirmDelete}
      />

      <ConfirmationSheet
        visible={deleteSheetVisible}
        status={deleteStatus}
        title="Xóa giấy tờ?"
        description="Dữ liệu và lịch nhắc liên quan cũng sẽ bị xóa. Thao tác này không thể hoàn tác."
        confirmLabel="Xóa giấy tờ"
        confirmVariant="danger"
        icon="trash-outline"
        tone="danger"
        loadingTitle="Đang xóa giấy tờ"
        loadingDescription="House Keeper đang xóa dữ liệu và lịch nhắc liên quan."
        errorTitle="Chưa thể xóa giấy tờ"
        errorDescription={
          remove.error?.message ??
          'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'
        }
        onConfirm={() => remove.mutate()}
        onDismiss={closeDeleteSheet}
        testID="document-delete-confirmation-sheet">
        <DetailRow label="Giấy tờ" value={document.title} last />
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
    borderRadius: radii.pill,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  center: {
    textAlign: 'center',
  },
  section: {
    gap: spacing.md,
  },
});
