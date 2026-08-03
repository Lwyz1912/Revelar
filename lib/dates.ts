export function todayIso(timeZone = "America/Recife") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function shiftDate(value: string, days: number) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function agendaDateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    options || { weekday: "long", day: "2-digit", month: "long" },
  ).format(new Date(`${value}T12:00:00`));
}

export function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}

export function calendarDays(value: string) {
  const first = new Date(`${monthStart(value)}T12:00:00`);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

export function startOfWeek(value: string) {
  const day = new Date(`${value}T12:00:00`);
  day.setDate(day.getDate() - day.getDay());
  return day.toISOString().slice(0, 10);
}

export function endTime(start: string, duration = "2h") {
  const [hours, minutes] = start.split(":").map(Number);
  const durationHours = Number(duration.match(/[\d,.]+/)?.[0]?.replace(",", ".")) || 2;
  const total = hours * 60 + minutes + Math.round(durationHours * 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
