import assert from "node:assert/strict";
import test from "node:test";

import { buildDashboardOverview, greetingForHour } from "../lib/dashboard";
import type { FinanceTransaction, Work } from "../types/revelar";

const work: Work = {
  id: 1,
  title: "Ensaio",
  category: "Ensaio pessoal",
  clientIds: [1],
  status: "scheduled",
  date: "2026-08-03",
  time: "15:00",
  duration: "2h",
  location: "Estúdio",
  team: ["Maryana"],
  deliveryDate: "2026-08-08",
  packageName: "Essencial",
  currency: "BRL",
  totalValue: 1000,
  entryValue: 400,
  installments: 2,
  costs: 0,
  photos: { captured: 100, selected: 60, edited: 10, delivered: 0 },
  stages: [],
  attachments: [],
};

const transactions: FinanceTransaction[] = [
  {
    id: "received",
    type: "income",
    scope: "professional",
    description: "Venda",
    amount: 200,
    currency: "BRL",
    date: "2026-08-02",
    category: "Produto",
    tags: [],
    account: "Conta principal",
    paymentMethod: "Pix",
    status: "received",
    origin: "Catálogo",
  },
  {
    id: "pending",
    type: "income",
    scope: "professional",
    description: "Parcela",
    amount: 100,
    currency: "BRL",
    date: "2026-08-09",
    category: "Cliente",
    tags: [],
    account: "Conta principal",
    paymentMethod: "Transferência",
    status: "pending",
    origin: "Cliente",
  },
];

test("adapta a saudação ao horário", () => {
  assert.equal(greetingForHour(8), "Bom dia");
  assert.equal(greetingForHour(14), "Boa tarde");
  assert.equal(greetingForHour(21), "Boa noite");
});

test("gera o resumo do dashboard usando os dados reais do aplicativo", () => {
  const overview = buildDashboardOverview({
    works: [work],
    transactions,
    currency: "BRL",
    today: "2026-08-03",
  });

  assert.equal(overview.todayJobs, 1);
  assert.equal(overview.photosToEdit, 50);
  assert.equal(overview.pendingDeliveries, 1);
  assert.equal(overview.pendingIncome, 700);
  assert.equal(overview.pendingIncomeCount, 2);
  assert.equal(overview.receivedThisMonth, 600);
  assert.equal(overview.nextWork?.id, 1);
  assert.deepEqual(
    overview.urgentDeliveries.map((item) => item.id),
    [1],
  );
});
