import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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
  billCategoryLabels,
  billDueLabels,
  formatCurrency,
  formatDate,
  formatDateTime,
  recurrenceLabels,
} from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { colors, radii, spacing } from '@/theme/tokens';

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const paymentPeriodDueDate = useRef<string | null>(null);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const bill = useQuery({ queryKey: queryKeys.bill(id), queryFn: () => housekeeperApi.getBill(id) });
  const payments = useQuery({
    queryKey: queryKeys.payments(id),
    queryFn: () => housekeeperApi.listPayments(id),
  });
  const pay = useMutation({
    mutationFn: () =>
      housekeeperApi.recordPayment(id, {
        expectedPeriodDueDate:
          paymentPeriodDueDate.current ?? bill.data?.nextDueDate,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bill(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bills });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: ['spending'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });
  const remove = useMutation({
    mutationFn: () => housekeeperApi.deleteBill(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bills,
        exact: true,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/calendar');
    },
    onError: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  if (bill.isLoading) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Chi tiết hóa đơn" />}>
        <LoadingState />
      </Screen>
    );
  }
  if (bill.isError || !bill.data) {
    return (
      <Screen scroll={false} bottomInset={false} header={<AppHeader back title="Chi tiết hóa đơn" />}>
        <ErrorState message="Không thể tải khoản thanh toán này." onRetry={() => bill.refetch()} />
      </Screen>
    );
  }
  const data = bill.data;
  const paymentStatus: ConfirmationSheetStatus = pay.isPending
    ? 'loading'
    : pay.isSuccess
      ? 'success'
      : pay.isError
        ? 'error'
        : 'confirm';
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

  function openPaymentSheet() {
    pay.reset();
    paymentPeriodDueDate.current = bill.data?.nextDueDate ?? null;
    setPaymentSheetVisible(true);
  }

  function closePaymentSheet() {
    if (!pay.isPending) {
      setPaymentSheetVisible(false);
      paymentPeriodDueDate.current = null;
    }
  }

  return (
    <Screen
      header={
        <AppHeader
          back
          title="Chi tiết hóa đơn"
          right={
            <IconButton
              icon="create-outline"
              label="Sửa hóa đơn"
              onPress={() => router.push(`/bills/form?id=${id}`)}
            />
          }
        />
      }>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="receipt-outline" size={32} color={colors.primary} />
        </View>
        <AppText variant="title">{data.title}</AppText>
        <AppText variant="display" color={colors.primary}>
          {formatCurrency(data.amount, data.currency)}
        </AppText>
        <StatusBadge label={billDueLabels[data.dueStatus]} tone={urgencyTone(data.dueStatus)} />
      </View>

      {data.active && data.dueStatus !== 'INACTIVE' ? (
        <Button
          label="Đánh dấu đã thanh toán"
          icon="checkmark-circle-outline"
          fullWidth
          loading={pay.isPending}
          accessibilityHint={`Mở bước xác nhận cho ${data.title}`}
          onPress={openPaymentSheet}
        />
      ) : null}

      <Card>
        <DetailRow label="Nhà cung cấp" value={data.provider ?? 'Chưa nhập'} />
        <DetailRow label="Nhóm chi phí" value={billCategoryLabels[data.category]} />
        <DetailRow label="Ngày đến hạn" value={formatDate(data.nextDueDate)} />
        <DetailRow label="Chu kỳ" value={recurrenceLabels[data.recurrence]} />
        <DetailRow label="Nhắc trước" value={`${data.reminderDaysBefore} ngày`} />
        <DetailRow label="Tự động gia hạn" value={data.autoRenew ? 'Có' : 'Không'} last />
      </Card>

      {data.invoiceFileUrl ? (
        <View style={styles.section}>
          <SectionHeader title="Ảnh hóa đơn" />
          <SecureImageViewer
            uri={data.invoiceFileUrl}
            title={`Hóa đơn ${data.title}`}
            height={210}
            testID="bill-invoice-image"
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Lịch sử thanh toán" />
        {payments.data?.length ? (
          payments.data.map((payment) => (
            <Card key={payment.id} style={styles.payment}>
              <View>
                <AppText variant="supportingStrong">
                  {formatCurrency(payment.amount, data.currency)}
                </AppText>
                <AppText variant="label" color={colors.inkMuted}>
                  Kỳ hạn {formatDate(payment.periodDueDate)}
                </AppText>
              </View>
              <AppText variant="label" color={colors.success}>
                {formatDateTime(payment.paidAt)}
              </AppText>
            </Card>
          ))
        ) : (
          <AppText variant="supporting" color={colors.inkMuted}>
            Chưa có lần thanh toán nào được ghi nhận.
          </AppText>
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

      <Button label="Xóa hóa đơn" variant="ghost" icon="trash-outline" loading={remove.isPending} fullWidth onPress={confirmDelete} />

      <ConfirmationSheet
        visible={paymentSheetVisible}
        status={paymentStatus}
        title="Xác nhận thanh toán"
        description="Kiểm tra lại khoản tiền và kỳ hạn trước khi ghi nhận."
        confirmLabel="Xác nhận đã trả"
        loadingTitle="Đang ghi nhận thanh toán"
        loadingDescription="House Keeper đang cập nhật hóa đơn và lịch nhắc của bạn."
        successTitle="Đã ghi nhận thanh toán"
        successDescription={`${formatCurrency(data.amount, data.currency)} cho ${data.title} đã được lưu vào lịch sử.`}
        errorTitle="Chưa thể ghi nhận"
        errorDescription={
          pay.error?.message ??
          'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'
        }
        onConfirm={() => pay.mutate()}
        onDismiss={closePaymentSheet}
        icon="wallet-outline"
        testID="payment-confirmation-sheet">
        <DetailRow
          label="Số tiền"
          value={formatCurrency(data.amount, data.currency)}
        />
        <DetailRow label="Ngày đến hạn" value={formatDate(data.nextDueDate)} last />
      </ConfirmationSheet>

      <ConfirmationSheet
        visible={deleteSheetVisible}
        status={deleteStatus}
        title="Xóa hóa đơn?"
        description="Lịch nhắc và lịch sử thanh toán liên quan cũng sẽ bị xóa. Thao tác này không thể hoàn tác."
        confirmLabel="Xóa hóa đơn"
        confirmVariant="danger"
        icon="trash-outline"
        tone="danger"
        loadingTitle="Đang xóa hóa đơn"
        loadingDescription="House Keeper đang xóa dữ liệu và lịch nhắc liên quan."
        errorTitle="Chưa thể xóa hóa đơn"
        errorDescription={
          remove.error?.message ??
          'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'
        }
        onConfirm={() => remove.mutate()}
        onDismiss={closeDeleteSheet}
        testID="bill-delete-confirmation-sheet">
        <DetailRow label="Hóa đơn" value={data.title} last />
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
    backgroundColor: colors.warningSoft,
    borderRadius: radii.pill,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  section: {
    gap: spacing.md,
  },
  payment: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
