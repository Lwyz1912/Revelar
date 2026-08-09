import assert from "node:assert/strict";
import test from "node:test";

import { fileExtension, formatFileSize, isAppFileRef } from "../lib/app-files.client";

test("reconhece referências persistentes de arquivos", () => {
  assert.equal(
    isAppFileRef({ id: "file-1", name: "contrato.pdf", type: "application/pdf", size: 2048 }),
    true,
  );
  assert.equal(isAppFileRef("contrato.pdf"), false);
});

test("formata tipo e tamanho para o visualizador", () => {
  assert.equal(fileExtension({ name: "modelo.docx" }), "DOCX");
  assert.equal(formatFileSize(2048), "2 KB");
  assert.equal(formatFileSize(2.5 * 1024 * 1024), "2.5 MB");
});
