import type { Client, Work } from "@/types/revelar";
import { shiftDate } from "@/lib/dates";

export function inferredStageDate(work: Work, index: number) {
  const offsets = [-45, -30, -21, -7, 0, 2];
  if (index < offsets.length) return shiftDate(work.date, offsets[index]);
  if (index === 6) return shiftDate(work.deliveryDate, -5);
  if (index === 7) return shiftDate(work.deliveryDate, -1);
  return work.deliveryDate;
}

export function workProgress(work: Work) {
  const done = work.stages.filter((stage) => stage.done).length;
  return work.stages.length ? Math.round((done / work.stages.length) * 100) : 0;
}

export function namesForClients(ids: number[], clients: Client[]) {
  return ids
    .map((id) => clients.find((client) => client.id === id)?.name)
    .filter(Boolean)
    .join(" + ");
}
