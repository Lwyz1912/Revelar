import assert from "node:assert/strict";
import test from "node:test";

import { defaultNotificationPreferences } from "../config/notifications";
import { initialNotifications } from "../data/notifications";
import {
  snoozeNotification,
  unreadNotificationCount,
  visibleNotifications,
} from "../lib/notifications";

test("conta somente notificações não lidas", () => {
  assert.equal(unreadNotificationCount(initialNotifications), 3);
});

test("respeita categorias desligadas nas configurações", () => {
  const preferences = {
    ...defaultNotificationPreferences,
    categories: { ...defaultNotificationPreferences.categories, gallery: false },
  };
  const visible = visibleNotifications(
    initialNotifications,
    preferences,
    new Date("2026-08-09T22:00:00.000Z"),
  );
  assert.equal(
    visible.some((notification) => notification.kind === "gallery"),
    false,
  );
});

test("oculta um aviso adiado até o horário definido", () => {
  const now = new Date("2026-08-09T22:00:00.000Z");
  const snoozed = snoozeNotification(initialNotifications[0], 24, now);
  const visible = visibleNotifications(
    [snoozed],
    defaultNotificationPreferences,
    new Date("2026-08-10T10:00:00.000Z"),
  );
  assert.equal(visible.length, 0);
});
