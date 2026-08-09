"use client";

import { useMemo, useState } from "react";

import { notificationCategoryOptions } from "@/config/notifications";
import { snoozeNotification } from "@/lib/notifications";
import type { AppNotification, Automation, NotificationKind } from "@/types/revelar";

type NotificationFilter = "all" | "unread" | NotificationKind;

export function NotificationsCenter({
  notifications,
  automations,
  onBack,
  onNotificationsChange,
  onAutomationsChange,
  onOpenRelated,
  toast,
}: {
  notifications: AppNotification[];
  automations: Automation[];
  onBack: () => void;
  onNotificationsChange: (notifications: AppNotification[]) => void;
  onAutomationsChange: (automations: Automation[]) => void;
  onOpenRelated: (notification: AppNotification) => void;
  toast: (message: string) => void;
}) {
  const [tab, setTab] = useState<"notifications" | "automations">("notifications");
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const filtered = useMemo(
    () =>
      notifications.filter((notification) => {
        if (filter === "all") return true;
        if (filter === "unread") return !notification.read;
        return notification.kind === filter;
      }),
    [filter, notifications],
  );

  const updateNotification = (id: string, update: (item: AppNotification) => AppNotification) =>
    onNotificationsChange(
      notifications.map((notification) =>
        notification.id === id ? update(notification) : notification,
      ),
    );

  return (
    <div className="notifications-page">
      <header className="notifications-hero">
        <button className="back-button" type="button" onClick={onBack}>
          ← Voltar
        </button>
        <div>
          <p>CENTRAL</p>
          <h1>Notificações e automações</h1>
        </div>
        <div className="notifications-tabs">
          <button
            type="button"
            className={tab === "notifications" ? "active" : ""}
            onClick={() => setTab("notifications")}
          >
            Notificações
            <b>{notifications.filter((item) => !item.read).length}</b>
          </button>
          <button
            type="button"
            className={tab === "automations" ? "active" : ""}
            onClick={() => setTab("automations")}
          >
            Automações
          </button>
        </div>
      </header>

      {tab === "notifications" ? (
        <section className="notifications-panel">
          <div className="notification-filters">
            <button
              type="button"
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              Todas
            </button>
            <button
              type="button"
              className={filter === "unread" ? "active" : ""}
              onClick={() => setFilter("unread")}
            >
              Não lidas
            </button>
            {notificationCategoryOptions.map((category) => (
              <button
                type="button"
                key={category.id}
                className={filter === category.id ? "active" : ""}
                onClick={() => setFilter(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="notification-center-list">
            {filtered.map((notification) => (
              <article key={notification.id} className={notification.read ? "" : "unread"}>
                <i className={`notification-kind ${notification.priority}`} aria-hidden="true" />
                <div className="notification-copy">
                  <small>
                    {
                      notificationCategoryOptions.find((item) => item.id === notification.kind)
                        ?.label
                    }
                  </small>
                  <h2>{notification.title}</h2>
                  <p>{notification.description}</p>
                  <span>{new Date(notification.createdAt).toLocaleString("pt-BR")}</span>
                </div>
                <div className="notification-row-actions">
                  {(notification.workId || notification.clientId) && (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => onOpenRelated(notification)}
                    >
                      {notification.actionLabel || "Abrir"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      updateNotification(notification.id, (item) => ({ ...item, read: !item.read }))
                    }
                  >
                    {notification.read ? "Marcar não lida" : "Marcar lida"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateNotification(notification.id, (item) => snoozeNotification(item, 24));
                      toast("Notificação adiada por 24 horas");
                    }}
                  >
                    Adiar 24h
                  </button>
                </div>
              </article>
            ))}
            {!filtered.length && (
              <div className="empty-state">Nenhuma notificação neste filtro.</div>
            )}
          </div>
        </section>
      ) : (
        <section className="automation-grid">
          {automations.map((automation) => (
            <article key={automation.id} className={automation.enabled ? "enabled" : ""}>
              <header>
                <span className="automation-icon">↻</span>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={automation.enabled}
                    onChange={() =>
                      onAutomationsChange(
                        automations.map((item) =>
                          item.id === automation.id ? { ...item, enabled: !item.enabled } : item,
                        ),
                      )
                    }
                  />
                  <i />
                </label>
              </header>
              <h2>{automation.title}</h2>
              <p>{automation.description}</p>
              <dl>
                <div>
                  <dt>Quando</dt>
                  <dd>{automation.trigger}</dd>
                </div>
                <div>
                  <dt>Fazer</dt>
                  <dd>{automation.action}</dd>
                </div>
              </dl>
              <footer>
                <span>
                  {automation.lastRun
                    ? `Última execução: ${automation.lastRun}`
                    : "Ainda não executada"}
                </span>
                {automation.requiresConfirmation && <b>Exige confirmação</b>}
              </footer>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
