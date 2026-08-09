import { notificationCategoryOptions } from "@/config/notifications";
import type { AppNotification } from "@/types/revelar";

function categoryLabel(notification: AppNotification) {
  return (
    notificationCategoryOptions.find((category) => category.id === notification.kind)?.label ||
    "Notificação"
  );
}

export function NotificationPopover({
  notifications,
  onClose,
  onOpen,
  onMarkAllRead,
  onShowAll,
}: {
  notifications: AppNotification[];
  onClose: () => void;
  onOpen: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
  onShowAll: () => void;
}) {
  const recent = notifications.slice(0, 5);

  return (
    <div className="notification-popover" role="dialog" aria-label="Notificações recentes">
      <header>
        <div>
          <p>ATIVIDADE RECENTE</p>
          <h2>Notificações</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar notificações">
          ×
        </button>
      </header>
      {recent.length ? (
        <div className="notification-popover-list">
          {recent.map((notification) => (
            <button
              type="button"
              key={notification.id}
              className={notification.read ? "" : "unread"}
              onClick={() => onOpen(notification)}
            >
              <i className={`notification-kind ${notification.priority}`} aria-hidden="true" />
              <span>
                <small>{categoryLabel(notification)}</small>
                <strong>{notification.title}</strong>
                <em>{notification.description}</em>
              </span>
              {!notification.read && <b aria-label="Não lida" />}
            </button>
          ))}
        </div>
      ) : (
        <div className="notification-empty-mini">
          <span>✓</span>
          <strong>Tudo em dia</strong>
          <small>Não há novos avisos agora.</small>
        </div>
      )}
      <footer>
        <button type="button" onClick={onMarkAllRead}>
          Marcar como lidas
        </button>
        <button className="primary-button" type="button" onClick={onShowAll}>
          Ver todas
        </button>
      </footer>
    </div>
  );
}
