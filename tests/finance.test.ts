import assert from "node:assert/strict";
import test from "node:test";

import { convertMoney, summarizeTransactions, workTransactions } from "../lib/finance";
import type { FinanceTransaction, Work } from "../types/revelar";

function transaction(changes: Partial<FinanceTransaction>): FinanceTransaction {
  return {
    id: "transaction",
    type: "expense",
    scope: "professional",
    description: "Movimentação",
    amount: 0,
    currency: "BRL",
    date: "2026-08-03",
    category: "Teste",
    tags: [],
    account: "Conta principal",
    paymentMethod: "Transferência",
    status: "paid",
    origin: "Teste",
    ...changes,
  };
}

test("resume entradas e saídas sem contar transferências no saldo", () => {
  const summary = summarizeTransactions([
    transaction({ id: "income", type: "income", amount: 1200, status: "received" }),
    transaction({ id: "expense", amount: 350, status: "paid" }),
    transaction({ id: "pending", amount: 90, status: "pending" }),
    transaction({ id: "late", amount: 40, status: "late" }),
    transaction({ id: "transfer", type: "transfer", amount: 500, status: "paid" }),
  ]);

  assert.deepEqual(summary, {
    received: 1200,
    expenses: 350,
    pending: 130,
    balance: 850,
  });
});

test("converte BRL e EUR usando a mesma taxa configurada", () => {
  assert.equal(convertMoney(100, "EUR", 6.25), 625);
  assert.equal(convertMoney(625, "BRL", 6.25), 100);
  assert.equal(convertMoney(100, "EUR", 0), 0);
});

test("transforma recebimentos e custos de trabalhos em lançamentos", () => {
  const work: Work = {
    id: 7,
    title: "Ensaio",
    category: "Ensaio pessoal",
    clientIds: [1],
    status: "editing",
    date: "2026-08-03",
    time: "14:00",
    duration: "2h",
    location: "Estúdio",
    team: ["Maryana"],
    deliveryDate: "2026-08-10",
    packageName: "Essencial",
    currency: "BRL",
    totalValue: 800,
    entryValue: 400,
    installments: 2,
    costs: 0,
    costItems: [
      {
        id: "transport",
        name: "Transporte",
        category: "Transporte",
        tags: ["sessão"],
        amount: 80,
        status: "planned",
        date: "2026-08-03",
      },
    ],
    photos: { captured: 100, selected: 30, edited: 10, delivered: 0 },
    stages: [],
    attachments: [],
  };

  const result = workTransactions([work]);

  assert.equal(result.length, 2);
  assert.equal(result[0]?.type, "income");
  assert.equal(result[0]?.amount, 400);
  assert.equal(result[1]?.type, "expense");
  assert.equal(result[1]?.status, "pending");
  assert.equal(result[1]?.workId, 7);
});

test("inclui gorjeta como ganho extra sem duplicar o valor recebido do contrato", () => {
  const work: Work = {
    id: 8,
    title: "Casamento",
    category: "Casamento",
    clientIds: [1],
    status: "scheduled",
    date: "2026-08-15",
    time: "15:00",
    duration: "8h",
    location: "Quinta",
    team: ["Maryana"],
    deliveryDate: "2026-09-10",
    packageName: "Completo",
    currency: "BRL",
    totalValue: 4800,
    entryValue: 2400,
    installments: 2,
    costs: 0,
    incomeItems: [
      {
        id: "payment",
        name: "Entrada do contrato",
        category: "Pagamento",
        tags: ["contrato"],
        amount: 2400,
        status: "received",
        date: "2026-08-01",
        countsTowardContract: true,
      },
      {
        id: "tip",
        name: "Gorjeta da cliente",
        category: "Gorjeta",
        tags: ["cliente"],
        amount: 150,
        status: "received",
        date: "2026-08-15",
        countsTowardContract: false,
      },
    ],
    photos: { captured: 0, selected: 0, edited: 0, delivered: 0 },
    stages: [],
    attachments: [],
  };

  const result = workTransactions([work]);
  const incomes = result.filter((item) => item.type === "income");

  assert.equal(incomes.length, 2);
  assert.equal(
    incomes.reduce((sum, item) => sum + item.amount, 0),
    2550,
  );
  assert.equal(incomes.find((item) => item.category === "Gorjeta")?.amount, 150);
});
