import assert from "node:assert/strict";
import test from "node:test";

import { buildContractFromQuote } from "../lib/contracts";

test("gera contrato com cliente, orçamento e valor aprovados", () => {
  const contract = buildContractFromQuote({
    clientName: "Camila Almeida",
    quoteTitle: "Ensaio de aniversário",
    formattedTotal: "R$ 850,00",
  });

  assert.match(contract, /CONTRATANTE: Camila Almeida/);
  assert.match(contract, /Ensaio de aniversário/);
  assert.match(contract, /R\$ 850,00/);
});
