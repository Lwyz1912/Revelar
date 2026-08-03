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
