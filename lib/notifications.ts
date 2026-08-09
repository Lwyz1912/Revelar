import type { AppNotification, NotificationPreferences } from "@/types/revelar";

export function visibleNotifications(
  notifications: AppNotification[],
  preferences: NotificationPreferences,
  now = new Date(),
) {
  return notifications
    .filter((notification) => preferences.categories[notification.kind])
    .filter(
      (notification) =>
        !notification.snoozedUntil ||
        new Date(notification.snoozedUntil).getTime() <= now.getTime(),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function unreadNotificationCount(notifications: AppNotification[]) {
  return notifications.filter((notification) => !notification.read).length;
}

export function snoozeNotification(notification: AppNotification, hours: number, now = new Date()) {
  return {
    ...notification,
    snoozedUntil: new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString(),
  };
}
