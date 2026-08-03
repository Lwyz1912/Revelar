import type { Currency, FinanceTransaction, Quote, Work } from "@/types/revelar";

export function quoteTotal(quote: Pick<Quote, "items" | "discount">) {
  return Math.max(
    0,
    quote.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) - quote.discount,
  );
}

export function summarizeTransactions(transactions: FinanceTransaction[]) {
  const received = transactions
    .filter((transaction) => transaction.type === "income" && transaction.status === "received")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = transactions
    .filter((transaction) => transaction.type === "expense" && transaction.status === "paid")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const pending = transactions
    .filter((transaction) => transaction.status === "pending" || transaction.status === "late")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    received,
    expenses,
    pending,
    balance: received - expenses,
  };
}

export function convertMoney(amount: number, from: Currency, eurInBrl: number) {
  if (!Number.isFinite(eurInBrl) || eurInBrl <= 0) return 0;
  return from === "EUR" ? amount * eurInBrl : amount / eurInBrl;
}

export function workTransactions(works: Work[]): FinanceTransaction[] {
  return works
    .filter((work) => work.status !== "cancelled")
    .flatMap((work) => {
      const costs = work.costItems?.length
        ? work.costItems
        : work.costs > 0
          ? [
              {
                id: `legacy-${work.id}`,
                name: "Custos do trabalho",
                category: "Produção",
                tags: [work.category],
                amount: work.costs,
                status: "paid" as const,
                date: work.date,
              },
            ]
          : [];
      const entries: FinanceTransaction[] =
        work.entryValue > 0
          ? [
              {
                id: `work-income-${work.id}`,
                type: "income",
                scope: "professional",
                description: `Recebimento · ${work.title}`,
                amount: work.entryValue,
                currency: work.currency,
                date: work.date,
                category: "Cliente",
                tags: [work.category],
                account: "Conta principal",
                paymentMethod: "Transferência",
                status: "received",
                workId: work.id,
                origin: work.title,
              },
            ]
          : [];

      return [
        ...entries,
        ...costs.map(
          (cost): FinanceTransaction => ({
            id: `work-cost-${work.id}-${cost.id}`,
            type: "expense",
            scope: "professional",
            description: cost.name,
            amount: cost.amount,
            currency: work.currency,
            date: cost.date || work.date,
            category: cost.category,
            tags: cost.tags,
            account: "Conta principal",
            paymentMethod: "Cartão / transferência",
            status: cost.status === "paid" ? "paid" : "pending",
            workId: work.id,
            origin: work.title,
          }),
        ),
      ];
    });
}
