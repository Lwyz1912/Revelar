import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { QuotesView } from "../components/modules/quotes/QuotesView";
import { initialProducts } from "../data/demo";
import { createQuoteFromProduct } from "../lib/factories";

test("o pacote sob consulta abre o formulário com o item e aviso de valor pendente", () => {
  const product = initialProducts.find((item) => item.name === "Casamento Essencial");
  assert.ok(product);
  const draft = createQuoteFromProduct(product, 0, undefined, "2026-08-03");
  const html = renderToStaticMarkup(
    createElement(QuotesView, {
      quotes: [],
      setQuotes: () => undefined,
      clients: [],
      currency: "BRL",
      initialProductQuote: draft,
      onProductQuoteHandled: () => undefined,
      onApprove: () => undefined,
      toast: () => undefined,
    }),
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /value="Casamento Essencial"/);
  assert.match(html, /Este pacote é sob consulta/);
  assert.match(html, /Total parcial · valor a definir/);
  assert.match(html, /Salvar orçamento/);
});
