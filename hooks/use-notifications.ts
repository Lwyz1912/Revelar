"use client";

import { useCallback, useEffect } from "react";

import { defaultNotificationPreferences } from "@/config/notifications";
import { initialAutomations, initialNotifications } from "@/data/notifications";
import { useStoredJsonState } from "@/hooks/use-persisted-state";
import { readJson, storageKeys, writeJson } from "@/lib/storage";
import type { NotificationPreferences } from "@/types/revelar";

export function useNotifications() {
  const [notifications, setNotifications] = useStoredJsonState(
    storageKeys.notifications,
    initialNotifications,
  );
  const [preferences, setPreferences] = useStoredJsonState<NotificationPreferences>(
    storageKeys.notificationPreferences,
    defaultNotificationPreferences,
  );
  const [automations, setAutomations] = useStoredJsonState(
    storageKeys.automations,
    initialAutomations,
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (
      !preferences.browserEnabled ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }
    const delivered = readJson<string[]>(
      window.localStorage,
      storageKeys.deliveredNotifications,
      [],
    );
    const next = notifications.find(
      (notification) =>
        !notification.read &&
        preferences.categories[notification.kind] &&
        !delivered.includes(notification.id),
    );
    if (!next) return;
    void navigator.serviceWorker?.ready.then(async (registration) => {
      await registration.showNotification(next.title, {
        body: next.description,
        icon: "/brand/revelar-symbol.svg",
        badge: "/brand/revelar-symbol.svg",
        tag: next.id,
        data: { url: "/" },
      });
      writeJson(window.localStorage, storageKeys.deliveredNotifications, [...delivered, next.id]);
    });
  }, [notifications, preferences]);

  const requestBrowserPermission = useCallback(async () => {
    if (!("Notification" in window)) return "unsupported" as const;
    const permission = await Notification.requestPermission();
    setPreferences((current) => ({ ...current, browserEnabled: permission === "granted" }));
    if (permission === "granted") {
      const registration = await navigator.serviceWorker?.ready;
      await registration?.showNotification("Notificações ativadas", {
        body: "O Revelar. pode avisar você sobre trabalhos, prazos e clientes.",
        icon: "/brand/revelar-symbol.svg",
        badge: "/brand/revelar-symbol.svg",
      });
    }
    return permission;
  }, [setPreferences]);

  return {
    notifications,
    setNotifications,
    preferences,
    setPreferences,
    automations,
    setAutomations,
    requestBrowserPermission,
  };
}
