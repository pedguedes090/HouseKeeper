import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { formatDateTime } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { syncReminderNotifications } from '@/lib/notifications';
import { ReminderRecord } from '@/lib/types';
import { colors, radii, spacing } from '@/theme/tokens';

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const reminders = useQuery({
    queryKey: queryKeys.reminders,
    queryFn: housekeeperApi.listReminders,
  });
  const dismiss = useMutation({
    mutationFn: housekeeperApi.dismissReminder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reminders });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
    onError: (error: Error) => Alert.alert('Chưa thể bỏ qua lời nhắc', error.message),
  });
  const sync = useMutation({
    mutationFn: async () => syncReminderNotifications(reminders.data ?? []),
    onSuccess: ({ granted, scheduled }) => {
      Alert.alert(
        granted ? 'Đã đồng bộ lịch nhắc' : 'Chưa có quyền thông báo',
        granted
          ? `${scheduled} lời nhắc sắp tới đã được lên lịch trên thiết bị.`
          : 'Bạn có thể cấp quyền thông báo trong Cài đặt hệ thống.',
      );
    },
    onError: (error: Error) => Alert.alert('Chưa thể đồng bộ thông báo', error.message),
  });

  return (
    <Screen header={<AppHeader back title="Thông báo & Lịch nhắc" />}>
      <Card tone="soft" style={styles.syncCard}>
        <View style={styles.syncIcon}>
          <Ionicons name="notifications-outline" size={26} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="supportingStrong">Nhắc ngay trên điện thoại</AppText>
          <AppText variant="label" color={colors.inkMuted}>
            Đồng bộ lịch từ máy chủ thành thông báo cục bộ trên thiết bị này.
          </AppText>
        </View>
        <Button
          label="Đồng bộ"
          compact
          loading={sync.isPending}
          disabled={reminders.isLoading}
          onPress={() => sync.mutate()}
        />
      </Card>

      {reminders.isLoading ? (
        <View style={styles.list}>
          <Skeleton height={104} />
          <Skeleton height={104} />
        </View>
      ) : reminders.isError ? (
        <ErrorState
          message="Không thể tải lịch nhắc."
          onRetry={() => reminders.refetch()}
        />
      ) : reminders.data?.length ? (
        <View style={styles.list}>
          {reminders.data.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              disabled={dismiss.isPending}
              onDismiss={() => dismiss.mutate(reminder.id)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="notifications-off-outline"
          title="Chưa có lời nhắc"
          message="Lời nhắc sẽ tự xuất hiện khi bạn thêm ngày đến hạn hoặc ngày hết bảo hành."
        />
      )}
    </Screen>
  );
}

function ReminderItem({
  reminder,
  onDismiss,
  disabled,
}: {
  reminder: ReminderRecord;
  onDismiss: () => void;
  disabled?: boolean;
}) {
  const dismissed = reminder.status === 'DISMISSED';
  return (
    <Card style={[styles.reminder, dismissed && styles.dismissed]}>
      <View style={styles.reminderIcon}>
        <Ionicons
          name={dismissed ? 'checkmark-outline' : 'alarm-outline'}
          size={22}
          color={dismissed ? colors.inkMuted : colors.primary}
        />
      </View>
      <View style={styles.flex}>
        <AppText variant="supportingStrong">{reminder.title}</AppText>
        <AppText variant="supporting" color={colors.inkMuted}>
          {reminder.message}
        </AppText>
        <AppText variant="labelStrong" color={dismissed ? colors.inkMuted : colors.primary}>
          {formatDateTime(reminder.remindAt)}
        </AppText>
      </View>
      {!dismissed ? (
        <Button
          label="Bỏ qua"
          variant="ghost"
          compact
          disabled={disabled}
          onPress={onDismiss}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  syncCard: {
    alignItems: 'center',
    borderColor: colors.primarySoft,
    flexDirection: 'row',
    gap: spacing.md,
  },
  syncIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  flex: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
  },
  reminder: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  reminderIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  dismissed: {
    opacity: 0.58,
  },
});
