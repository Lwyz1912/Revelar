import { type Dispatch, type SetStateAction, useRef, useState } from "react";

import { FileViewer } from "@/components/shared/FileViewer";
import { standardContractTemplate } from "@/config/contracts";
import { contractStatusLabels } from "@/config/labels";
import {
  deleteAppFile,
  fileDownloadUrl,
  formatFileSize,
  isAppFileRef,
  uploadAppFile,
} from "@/lib/app-files.client";
import type { Client, Contract, ContractStatus, Quote } from "@/types/revelar";

export function ContractsView({
  contracts,
  setContracts,
  clients,
  quotes,
  toast,
}: {
  contracts: Contract[];
  setContracts: Dispatch<SetStateAction<Contract[]>>;
  clients: Client[];
  quotes: Quote[];
  toast: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(contracts[0]?.id || 0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = contracts.find((item) => item.id === selectedId);
  const selectedFile = isAppFileRef(selected?.templateFile) ? selected.templateFile : undefined;
  const update = (changes: Partial<Contract>) =>
    selected &&
    setContracts((current) =>
      current.map((item) =>
        item.id === selected.id ? { ...item, ...changes, updatedAt: "Agora" } : item,
      ),
    );
  const createBlank = () => {
    const id = Math.max(...contracts.map((item) => item.id), 0) + 1;
    const contract: Contract = {
      id,
      title: "Novo contrato fotográfico",
      clientId: clients[0]?.id,
      status: "draft",
      template: "standard",
      content: standardContractTemplate,
      updatedAt: "Agora",
    };
    setContracts((current) => [contract, ...current]);
    setSelectedId(id);
  };

  const uploadTemplate = async (file?: File) => {
    if (!file || !selected) return;
    setUploading(true);
    try {
      const uploaded = await uploadAppFile(file, "contract", String(selected.id));
      const previous = isAppFileRef(selected.templateFile) ? selected.templateFile : undefined;
      update({ template: "custom", templateFile: uploaded });
      if (previous) await deleteAppFile(previous).catch(() => undefined);
      toast(previous ? "Arquivo do contrato substituído" : "Arquivo enviado e salvo no Revelar.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível enviar o arquivo");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removeTemplate = async () => {
    if (!selected) return;
    const previous = isAppFileRef(selected.templateFile) ? selected.templateFile : undefined;
    if (previous) await deleteAppFile(previous).catch(() => undefined);
    update({ templateFile: undefined, template: "standard" });
    setPreviewOpen(false);
    toast("Arquivo removido do contrato");
  };
  return (
    <div className="documents-page">
      <section className="documents-title-row">
        <div>
          <p>DOCUMENTOS E ASSINATURAS</p>
          <h1>Contratos</h1>
          <span>Use o modelo editável do Revelar. ou substitua por seu próprio PDF/DOCX.</span>
        </div>
        <button className="primary-button" type="button" onClick={createBlank}>
          ＋ Novo contrato
        </button>
      </section>
      <div className="contracts-layout">
        <aside className="card contract-list">
          <div className="card-heading compact">
            <div>
              <p>DOCUMENTOS</p>
              <h2>Seus contratos</h2>
            </div>
            <span>{contracts.length}</span>
          </div>
          {contracts.map((contract) => (
            <button
              type="button"
              className={selectedId === contract.id ? "active" : ""}
              key={contract.id}
              onClick={() => setSelectedId(contract.id)}
            >
              <span>
                <strong>{contract.title}</strong>
                <small>
                  {clients.find((client) => client.id === contract.clientId)?.name || "Sem cliente"}{" "}
                  · {contractStatusLabels[contract.status]}
                </small>
              </span>
              <b>›</b>
            </button>
          ))}
        </aside>
        {selected ? (
          <section className="card contract-editor">
            <div className="contract-editor-head">
              <div>
                <p>EDITOR DE CONTRATO</p>
                <input
                  value={selected.title}
                  onChange={(event) => update({ title: event.target.value })}
                />
              </div>
              <span className={`document-status status-${selected.status}`}>
                {contractStatusLabels[selected.status]}
              </span>
            </div>
            <div className="contract-toolbar">
              <label>
                <span>Status</span>
                <select
                  value={selected.status}
                  onChange={(event) => update({ status: event.target.value as ContractStatus })}
                >
                  <option value="draft">Rascunho</option>
                  <option value="sent">Enviado</option>
                  <option value="waiting">Aguardando assinatura</option>
                  <option value="signed">Assinado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </label>
              <label>
                <span>Cliente</span>
                <select
                  value={selected.clientId || ""}
                  onChange={(event) =>
                    update({ clientId: Number(event.target.value) || undefined })
                  }
                >
                  <option value="">Sem cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Orçamento</span>
                <select
                  value={selected.quoteId || ""}
                  onChange={(event) => update({ quoteId: Number(event.target.value) || undefined })}
                >
                  <option value="">Sem orçamento</option>
                  {quotes.map((quote) => (
                    <option key={quote.id} value={quote.id}>
                      {quote.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="template-chooser">
              <button
                type="button"
                className={selected.template === "standard" ? "active" : ""}
                onClick={() => update({ template: "standard" })}
              >
                <span>REVELAR.</span>
                <strong>Modelo padrão editável</strong>
                <small>Texto completo e personalizável</small>
              </button>
              <label className={selected.template === "custom" ? "active" : ""}>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  hidden
                  onChange={(event) => void uploadTemplate(event.target.files?.[0])}
                />
                <span>↑</span>
                <strong>
                  {uploading
                    ? "Enviando…"
                    : selectedFile?.name ||
                      (typeof selected.templateFile === "string"
                        ? selected.templateFile
                        : "Enviar PDF ou DOCX")}
                </strong>
                <small>
                  {selectedFile ? "Clique para substituir" : "Salva e sincroniza no Revelar."}
                </small>
              </label>
            </div>
            {selected.template === "standard" ? (
              <label className="contract-content">
                <span>Conteúdo do contrato</span>
                <textarea
                  value={selected.content}
                  onChange={(event) => update({ content: event.target.value })}
                />
              </label>
            ) : (
              <div className="custom-template-preview">
                <span>
                  {(selectedFile?.name || String(selected.templateFile || ""))
                    .toLowerCase()
                    .endsWith(".pdf")
                    ? "PDF"
                    : "DOCX"}
                </span>
                <div>
                  <strong>
                    {selectedFile?.name || String(selected.templateFile || "Nenhum arquivo")}
                  </strong>
                  <p>
                    {selectedFile
                      ? `${formatFileSize(selectedFile.size)} · disponível no computador e no celular`
                      : "Envie novamente este arquivo antigo para habilitar a visualização sincronizada."}
                  </p>
                </div>
                <div className="contract-file-actions">
                  {selectedFile && (
                    <>
                      <button type="button" onClick={() => setPreviewOpen(true)}>
                        Visualizar
                      </button>
                      <a href={fileDownloadUrl(selectedFile)} download={selectedFile.name}>
                        Baixar
                      </a>
                    </>
                  )}
                  <button type="button" onClick={() => fileInput.current?.click()}>
                    Substituir
                  </button>
                  {selected.templateFile && (
                    <button
                      className="danger-action"
                      type="button"
                      onClick={() => void removeTemplate()}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="contract-footer">
              <span>Última atualização: {selected.updatedAt}</span>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    update({ status: "sent" });
                    toast("Contrato marcado como enviado");
                  }}
                >
                  Marcar como enviado
                </button>
                <button className="primary-button" type="button" onClick={() => window.print()}>
                  Gerar PDF / imprimir
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="card empty-state">
            <span>□</span>
            <h2>Crie seu primeiro contrato</h2>
            <p>Você poderá editar o modelo padrão ou enviar um arquivo próprio.</p>
          </div>
        )}
      </div>
      {previewOpen && selectedFile && (
        <FileViewer
          file={selectedFile}
          onClose={() => setPreviewOpen(false)}
          onReplace={() => fileInput.current?.click()}
          onDelete={() => void removeTemplate()}
        />
      )}
    </div>
  );
}
