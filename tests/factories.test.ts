import assert from "node:assert/strict";
import test from "node:test";

import {
  createProductSaleTransaction,
  createQuoteFromProduct,
  createWorkRecord,
  nextNumericId,
} from "../lib/factories";
import type { NewWorkData, Product } from "../types/revelar";

const product: Product = {
  id: 4,
  name: "Preset Essência",
  kind: "preset",
  description: "Preset de demonstração",
  currency: "BRL",
  priceType: "fixed",
  basePrice: 120,
  options: [],
  availability: "unlimited",
  deliveryType: "link",
  deliveryLink: "https://example.com",
  discountType: "percent",
  discountValue: 10,
  status: "active",
  publicReady: true,
  sales: 0,
};

const workData: NewWorkData = {
  title: "Novo ensaio",
  category: "Ensaio pessoal",
  clientIds: [],
  date: "",
  time: "",
  duration: "",
  location: "",
  team: [],
  deliveryDate: "",
  packageName: "",
  currency: "BRL",
  totalValue: 0,
  entryValue: 0,
  installments: 1,
  costs: 0,
  costItems: [],
  photos: { captured: 0, selected: 0, edited: 0, delivered: 0 },
  stages: [],
  attachments: [],
};

test("gera o próximo identificador sem depender da ordem", () => {
  assert.equal(nextNumericId([]), 1);
  assert.equal(nextNumericId([{ id: 8 }, { id: 2 }]), 9);
});

test("um trabalho sem etapas não nasce concluído", () => {
  assert.equal(createWorkRecord(workData, 3).status, "planning");
  assert.equal(createWorkRecord({ ...workData, date: "2026-08-20" }, 4).status, "scheduled");
});

test("transforma um produto em orçamento reutilizável", () => {
  const quote = createQuoteFromProduct(product, 7, 2, "2026-08-03");

  assert.equal(quote.id, 7);
  assert.equal(quote.clientId, 2);
  assert.equal(quote.validUntil, "2026-08-17");
  assert.equal(quote.items[0]?.unitPrice, 108);
});

test("transforma uma venda direta em entrada financeira", () => {
  const transaction = createProductSaleTransaction({
    product,
    clientName: "Cliente Teste",
    options: ["Licença comercial"],
    total: 216,
    date: "2026-08-03",
    id: "sale-1",
  });

  assert.equal(transaction.type, "income");
  assert.equal(transaction.amount, 216);
  assert.equal(transaction.origin, "Cliente Teste");
  assert.deepEqual(transaction.tags, ["preset", "Licença comercial"]);
});
