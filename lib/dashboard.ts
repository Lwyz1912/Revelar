import { addDays } from "@/lib/dates";
import { workTransactions } from "@/lib/finance";
import type { Currency, FinanceTransaction, Work } from "@/types/revelar";

const inactiveWorkStatuses = new Set<Work["status"]>(["completed", "archived", "cancelled"]);

export type DashboardOverview = {
  todayJobs: number;
  photosToEdit: number;
  pendingDeliveries: number;
  pendingIncome: number;
  pendingIncomeCount: number;
  receivedThisMonth: number;
  nextWork?: Work;
  urgentDeliveries: Work[];
};

export function greetingForHour(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function hourInTimeZone(timeZone = "America/Recife") {
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date());

  return Number(hour) % 24;
}

export function buildDashboardOverview({
  works,
  transactions,
  currency,
  today,
}: {
  works: Work[];
  transactions: FinanceTransaction[];
  currency: Currency;
  today: string;
}): DashboardOverview {
  const activeWorks = works.filter((work) => !inactiveWorkStatuses.has(work.status));
  const visibleTransactions = [...transactions, ...workTransactions(works)].filter(
    (transaction) => transaction.currency === currency,
  );
  const pendingTransactions = visibleTransactions.filter(
    (transaction) =>
      transaction.type === "income" &&
      (transaction.status === "pending" || transaction.status === "late"),
  );
  const pendingWorks = activeWorks.filter(
    (work) => work.currency === currency && work.totalValue > work.entryValue,
  );
  const currentMonth = today.slice(0, 7);
  const scheduledWorks = activeWorks
    .filter((work) => work.date && work.date >= today)
    .sort((first, second) =>
      `${first.date}T${first.time || "23:59"}`.localeCompare(
        `${second.date}T${second.time || "23:59"}`,
      ),
    );
  const attentionLimit = addDays(today, 9);
  const urgentDeliveries = activeWorks
    .filter((work) => Boolean(work.deliveryDate) && work.deliveryDate <= attentionLimit)
    .sort((first, second) => first.deliveryDate.localeCompare(second.deliveryDate));

  return {
    todayJobs: activeWorks.filter((work) => work.date === today).length,
    photosToEdit: activeWorks.reduce(
      (sum, work) => sum + Math.max(0, work.photos.selected - work.photos.edited),
      0,
    ),
    pendingDeliveries: activeWorks.filter((work) => Boolean(work.deliveryDate)).length,
    pendingIncome:
      pendingWorks.reduce((sum, work) => sum + work.totalValue - work.entryValue, 0) +
      pendingTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    pendingIncomeCount: pendingWorks.length + pendingTransactions.length,
    receivedThisMonth: visibleTransactions
      .filter(
        (transaction) =>
          transaction.type === "income" &&
          transaction.status === "received" &&
          transaction.date.startsWith(currentMonth),
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    nextWork: scheduledWorks[0],
    urgentDeliveries,
  };
}
