import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { WorkDocumentsSection } from "../components/modules/works/details/WorkDocumentsSection";
import { initialWorks } from "../data/demo";
import type { AppFileRef } from "../types/revelar";

const source: AppFileRef = {
  id: "source-1",
  name: "trabalho.docx",
  type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  size: 2048,
};
const signed: AppFileRef = {
  id: "signed-1",
  name: "assinado.pdf",
  type: "application/pdf",
  size: 4096,
};

function renderDocuments(files: { source?: AppFileRef; signed?: AppFileRef }) {
  const work = { ...initialWorks[0], attachments: ["comprovante.pdf"] };
  const state: Parameters<typeof WorkDocumentsSection>[0]["state"] = {
    work,
    contract: {
      status: "signed",
      title: "Contrato do ensaio",
      content: "",
      updatedAt: "2026-01-01",
    },
    sourceContractFile: files.source,
    signedContractFile: files.signed,
    preferredContractFile: files.signed ?? files.source,
    contractUpload: null,
    contractSourceFileRef: { current: null },
    contractSignedFileRef: { current: null },
    workFileRef: { current: null },
    addWorkFiles: () => undefined,
    openAttachment: () => undefined,
    removeContractFile: async () => undefined,
    setPreviewStoredFile: () => undefined,
    update: () => undefined,
    updateContract: () => undefined,
  };
  return renderToStaticMarkup(createElement(WorkDocumentsSection, { state }));
}

test("documentos mantém as duas versões do contrato e os anexos acessíveis", () => {
  const html = renderDocuments({ source, signed });

  assert.match(html, /Contrato do ensaio/);
  assert.match(html, /value="signed" selected=""/);
  assert.match(html, /trabalho\.docx/);
  assert.match(html, /assinado\.pdf/);
  assert.match(html, /\/api\/files\/source-1\?download=1/);
  assert.match(html, /\/api\/files\/signed-1\?download=1/);
  assert.match(html, /Substituir DOCX/);
  assert.match(html, /Substituir PDF/);
  assert.match(html, /comprovante\.pdf/);
});

test("documentos oferece as duas opções quando o contrato ainda não tem arquivos", () => {
  const html = renderDocuments({});

  assert.match(html, /Nenhum contrato anexado/);
  assert.match(html, /Adicionar DOCX/);
  assert.match(html, /Adicionar PDF assinado/);
  assert.doesNotMatch(html, /Remover pdf assinado/);
});
