import type { AgendaEventStatus, EventTimezone } from "@/types/revelar";
import { addDays, todayIso } from "@/lib/dates";

export function statusForDate(
  date: string,
  completed = false,
  today = todayIso(),
): AgendaEventStatus {
  if (completed) return "completed";
  if (date < today) return "late";
  if (date <= addDays(today, 3)) return "soon";
  return "normal";
}

function zonedDateTimeToInstant(date: string, time: string, timeZone: EventTimezone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let guess = desired;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const represented = Date.UTC(
      Number(value.year),
      Number(value.month) - 1,
      Number(value.day),
      Number(value.hour),
      Number(value.minute),
    );
    guess += desired - represented;
  }

  return new Date(guess);
}

export function otherEventTimezone(timeZone: EventTimezone): EventTimezone {
  return timeZone === "America/Recife" ? "Europe/Lisbon" : "America/Recife";
}

export function equivalentEventTime(
  date: string,
  time: string,
  sourceTimeZone: EventTimezone,
  targetTimeZone = otherEventTimezone(sourceTimeZone),
) {
  const instant = zonedDateTimeToInstant(date, time, sourceTimeZone);
  const targetDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: targetTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
  const targetTime = new Intl.DateTimeFormat("pt-BR", {
    timeZone: targetTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);

  if (targetDate === date) return targetTime;
  const shortDate = new Intl.DateTimeFormat("pt-BR", {
    timeZone: targetTimeZone,
    day: "2-digit",
    month: "2-digit",
  }).format(instant);
  return `${shortDate} · ${targetTime}`;
}
