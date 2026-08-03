import type { AgendaEventStatus } from "@/types/revelar";
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
