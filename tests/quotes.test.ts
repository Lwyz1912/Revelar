import assert from "node:assert/strict";
import test from "node:test";

import { quoteTotal } from "../lib/finance";

test("calcula quantidade, preço unitário e desconto do orçamento", () => {
  const total = quoteTotal({
    items: [
      {
        id: "session",
        kind: "service",
        description: "Ensaio",
        quantity: 1,
        unitPrice: 700,
      },
      {
        id: "photos",
        kind: "photo",
        description: "Fotos extras",
        quantity: 10,
        unitPrice: 25,
      },
    ],
    discount: 50,
  });

  assert.equal(total, 900);
});

test("não permite orçamento total negativo", () => {
  const total = quoteTotal({
    items: [
      {
        id: "pdf",
        kind: "pdf",
        description: "Guia",
        quantity: 1,
        unitPrice: 30,
      },
    ],
    discount: 100,
  });

  assert.equal(total, 0);
});
