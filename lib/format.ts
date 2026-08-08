import type { Currency } from "@/types/revelar";

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatMoney(value: number, currency: Currency) {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "pt-PT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string) {
  if (!value) return "A definir";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "");
}

export function formatSize(bytes: number) {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unit;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: unit ? 1 : 0 }).format(value)} ${units[unit]}`;
}
