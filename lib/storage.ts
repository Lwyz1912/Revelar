export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const storageKeys = {
  theme: "revelar-theme",
  palette: "revelar-palette",
  currency: "revelar-currency",
  clientView: "revelar-client-view",
  workView: "revelar-work-view",
  clients: "revelar-clients",
  works: "revelar-works",
  agendaEvents: "revelar-agenda-events",
  transactions: "revelar-transactions",
  products: "revelar-products",
  quotes: "revelar-quotes",
  contracts: "revelar-contracts",
  notifications: "revelar-notifications",
  notificationPreferences: "revelar-notification-preferences",
  deliveredNotifications: "revelar-delivered-notifications",
  automations: "revelar-automations",
  locations: "revelar-locations",
  diary: "revelar-diary",
  achievementUnlocks: "revelar-achievement-unlocks",
} as const;

export function readText<T extends string>(
  storage: StorageLike,
  key: string,
  fallback: T,
  allowed?: readonly T[],
) {
  const value = storage.getItem(key) as T | null;
  if (!value || (allowed && !allowed.includes(value))) return fallback;
  return value;
}

export function readJson<T>(storage: StorageLike, key: string, fallback: T): T {
  const raw = storage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeText(storage: StorageLike, key: string, value: string) {
  storage.setItem(key, value);
}

export function writeJson<T>(storage: StorageLike, key: string, value: T) {
  storage.setItem(key, JSON.stringify(value));
}
