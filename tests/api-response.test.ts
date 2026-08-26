import assert from "node:assert/strict";
import test from "node:test";

import { readApiJson } from "../lib/api-response.client";

test("converte JSON válido sem tentar ler a resposta duas vezes", async () => {
  const data = await readApiJson<{ ok: boolean }>(
    new Response(JSON.stringify({ ok: true })),
    "Falha",
  );
  assert.equal(data.ok, true);
});

test("troca erro bruto de JSON por uma mensagem compreensível", async () => {
  await assert.rejects(
    () => readApiJson(new Response("<html>erro</html>", { status: 500 }), "Falha no envio."),
    /Falha no envio/,
  );
});
