import { type Dispatch, type SetStateAction, useState } from "react";

import { standardContractTemplate } from "@/config/contracts";
import { contractStatusLabels } from "@/config/labels";
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
  const [templateFile, setTemplateFile] = useState("");
  const selected = contracts.find((item) => item.id === selectedId);
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
                onClick={() => update({ template: "standard", templateFile: undefined })}
              >
                <span>REVELAR.</span>
                <strong>Modelo padrão editável</strong>
                <small>Texto completo e personalizável</small>
              </button>
              <label className={selected.template === "custom" ? "active" : ""}>
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setTemplateFile(file.name);
                    update({ template: "custom", templateFile: file.name });
                    toast("Template próprio definido para este contrato");
                  }}
                />
                <span>↑</span>
                <strong>{selected.templateFile || templateFile || "Enviar PDF ou DOCX"}</strong>
                <small>Substitui o modelo padrão</small>
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
                  {selected.templateFile?.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX"}
                </span>
                <div>
                  <strong>{selected.templateFile}</strong>
                  <p>
                    Este arquivo foi definido como modelo. Os dados do cliente e do orçamento ficam
                    vinculados ao contrato.
                  </p>
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
    </div>
  );
}
