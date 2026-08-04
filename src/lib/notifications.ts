import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ReminderRecord, SpendingThresholdEvent } from '@/lib/types';

export async function prepareNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Lịch nhắc House Keeper',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#0058BE',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function syncReminderNotifications(reminders: ReminderRecord[]) {
  const granted = await prepareNotifications();
  if (!granted) return { granted: false, scheduled: 0 };

  await Notifications.cancelAllScheduledNotificationsAsync();
  const future = reminders.filter(
    (reminder) =>
      reminder.status === 'PENDING' &&
      new Date(reminder.remindAt).getTime() > Date.now(),
  );
  await Promise.all(
    future.map((reminder) =>
      Notifications.scheduleNotificationAsync({
        identifier: `housekeeper-${reminder.id}`,
        content: {
          title: reminder.title,
          body: reminder.message,
          sound: 'default',
          data: {
            sourceType: reminder.sourceType,
            sourceId: reminder.sourceId,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(reminder.remindAt),
          channelId: 'reminders',
        },
      }),
    ),
  );
  return { granted: true, scheduled: future.length };
}

export async function syncSpendingThresholdNotifications(
  events: SpendingThresholdEvent[],
) {
  if (Platform.OS === 'web' || !events.length) {
    return { granted: false, scheduled: 0 };
  }
  const granted = await prepareNotifications();
  if (!granted) return { granted: false, scheduled: 0 };

  await Promise.all(
    events.map((event) =>
      Notifications.scheduleNotificationAsync({
        identifier: `spending-threshold-${event.id}`,
        content: {
          title:
            event.thresholdPercent >= 100
              ? `${event.jarName} đã vượt hạn mức`
              : `${event.jarName} đã chạm ${event.thresholdPercent}% hạn mức`,
          body: 'Mở Hũ chi tiêu để xem lại các khoản trong tháng.',
          sound: 'default',
          data: {
            type: 'SPENDING_JAR',
            jarId: event.jarId,
            month: event.month,
          },
        },
        trigger: null,
      }),
    ),
  );
  return { granted: true, scheduled: events.length };
}
