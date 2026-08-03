import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateProductSaleTotal,
  discountedProductPrice,
  productDiscountActive,
  productToQuoteKind,
} from "../lib/products";
import type { Product } from "../types/revelar";

function product(changes: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "Álbum",
    kind: "album",
    description: "Produto de teste",
    currency: "BRL",
    priceType: "fixed",
    basePrice: 500,
    options: [],
    availability: "unlimited",
    deliveryType: "manual",
    discountType: "none",
    discountValue: 0,
    status: "active",
    publicReady: false,
    sales: 0,
    ...changes,
  };
}

test("aplica promoção percentual ativa ao preço com variações", () => {
  const item = product({
    discountType: "percent",
    discountValue: 10,
    discountStart: "2026-08-01",
    discountEnd: "2026-08-31",
  });

  const result = calculateProductSaleTotal(
    item,
    [{ id: "large", label: "30×30", priceDelta: 100 }],
    2,
    "2026-08-03",
  );

  assert.equal(result.unitPrice, 540);
  assert.equal(result.total, 1080);
});

test("não aplica promoção fora do período", () => {
  const item = product({
    discountType: "fixed",
    discountValue: 100,
    discountStart: "2026-09-01",
    discountEnd: "2026-09-30",
  });

  assert.equal(productDiscountActive(item, "2026-08-03"), false);
  assert.equal(discountedProductPrice(item, item.basePrice, "2026-08-03"), 500);
});

test("desconto fixo nunca produz preço negativo", () => {
  const item = product({ discountType: "fixed", discountValue: 900 });

  assert.equal(discountedProductPrice(item, 500, "2026-08-03"), 0);
});

test("converte tipos do catálogo para itens compatíveis com orçamento", () => {
  assert.equal(productToQuoteKind("package"), "service");
  assert.equal(productToQuoteKind("album"), "extra");
  assert.equal(productToQuoteKind("preset"), "preset");
});
