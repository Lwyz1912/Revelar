import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from "react";

import { quoteItemKindLabels, quoteStatusLabels } from "@/config/labels";
import { addDays, todayIso } from "@/lib/dates";
import { quoteTotal } from "@/lib/finance";
import { formatDate, formatMoney } from "@/lib/format";
import type { Client, Currency, Quote, QuoteItem, QuoteStatus } from "@/types/revelar";

export function QuotesView({
  quotes,
  setQuotes,
  clients,
  currency,
  onApprove,
  toast,
}: {
  quotes: Quote[];
  setQuotes: Dispatch<SetStateAction<Quote[]>>;
  clients: Client[];
  currency: Currency;
  onApprove: (quote: Quote, contractNeeded: boolean) => number | undefined;
  toast: (message: string) => void;
}) {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<Quote | null>(null);
  const [contractNeeded, setContractNeeded] = useState(true);
  const [showTrash, setShowTrash] = useState(false);
  const [declinedTrashDays, setDeclinedTrashDays] = useState(7);
  const [draft, setDraft] = useState<Omit<Quote, "id" | "status">>({
    title: "",
    clientId: clients[0]?.id,
    currency,
    items: [
      {
        id: "item-1",
        kind: "service",
        description: "Ensaio fotográfico",
        quantity: 1,
        unitPrice: 0,
      },
    ],
    discount: 0,
    validUntil: addDays(todayIso(), 14),
    notes: "Valores e datas ficam reservados até o vencimento deste orçamento.",
  });
  const draftTotal = quoteTotal(draft);
  const updateItem = (id: string, changes: Partial<QuoteItem>) =>
    setDraft({
      ...draft,
      items: draft.items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    });
  const saveQuote = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.items.length) return;
    setQuotes((current) => [
      { ...draft, id: Math.max(...current.map((item) => item.id), 0) + 1, status: "draft" },
      ...current,
    ]);
    setBuilderOpen(false);
    toast("Orçamento salvo como rascunho");
  };
  useEffect(() => {
    void fetch("/api/professional-settings", { cache: "no-store" })
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { data?: { quotes?: { declinedTrashDays?: number } } })
          : null,
      )
      .then((result) => setDeclinedTrashDays(result?.data?.quotes?.declinedTrashDays ?? 7))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const now = Date.now();
    setQuotes((current) => {
      let changed = false;
      const next = current
        .map((quote) => {
          if (quote.status !== "declined" || declinedTrashDays === 0) return quote;
          if (!quote.declinedAt) {
            changed = true;
            return { ...quote, declinedAt: new Date(now).toISOString() };
          }
          if (
            !quote.trashedAt &&
            now - new Date(quote.declinedAt).getTime() >= declinedTrashDays * 86_400_000
          ) {
            changed = true;
            return { ...quote, trashedAt: new Date(now).toISOString() };
          }
          return quote;
        })
        .filter((quote) => {
          const expired =
            quote.trashedAt && now - new Date(quote.trashedAt).getTime() >= 30 * 86_400_000;
          if (expired) changed = true;
          return !expired;
        });
      return changed ? next : current;
    });
  }, [declinedTrashDays, setQuotes]);

  const setStatus = (quote: Quote, status: QuoteStatus) => {
    if (status === "approved" && !quote.workId) {
      setContractNeeded(true);
      setPendingApproval(quote);
      return;
    }
    setQuotes((current) =>
      current.map((item) =>
        item.id === quote.id
          ? {
              ...item,
              status,
              declinedAt: status === "declined" ? new Date().toISOString() : undefined,
              trashedAt: status === "declined" ? item.trashedAt : undefined,
            }
          : item,
      ),
    );
    toast(
      status === "declined"
        ? `Orçamento recusado · irá para a lixeira em ${declinedTrashDays || "∞"} dias`
        : "Status atualizado",
    );
  };

  const confirmApproval = () => {
    if (!pendingApproval) return;
    const approvedAt = new Date().toISOString();
    const snapshot = {
      approvedAt,
      title: pendingApproval.title,
      currency: pendingApproval.currency,
      items: structuredClone(pendingApproval.items),
      discount: pendingApproval.discount,
      total: quoteTotal(pendingApproval),
    };
    const approvedQuote: Quote = {
      ...pendingApproval,
      status: "approved",
      approvedSnapshot: snapshot,
    };
    const workId = onApprove(approvedQuote, contractNeeded);
    if (!workId) return;
    setQuotes((current) =>
      current.map((item) => (item.id === pendingApproval.id ? { ...approvedQuote, workId } : item)),
    );
    setPendingApproval(null);
    toast("Orçamento aprovado e trabalho criado automaticamente");
  };

  const displayedQuotes = quotes.filter((quote) => Boolean(quote.trashedAt) === showTrash);

  return (
    <div className="documents-page">
      <section className="documents-title-row">
        <div>
          <p>PROPOSTAS E VENDAS</p>
          <h1>Orçamentos</h1>
          <span>Fotografia, fotos avulsas, cursos, PDFs, presets e outros produtos.</span>
        </div>
        <button className="primary-button" type="button" onClick={() => setBuilderOpen(true)}>
          ＋ Novo orçamento
        </button>
      </section>
      <section className="document-metrics">
        <article>
          <span>EM ABERTO</span>
          <strong>
            {quotes.filter((item) => item.status === "draft" || item.status === "sent").length}
          </strong>
          <small>Rascunhos e enviados</small>
        </article>
        <article>
          <span>APROVADOS</span>
          <strong>{quotes.filter((item) => item.status === "approved").length}</strong>
          <small>Prontos para converter</small>
        </article>
        <article>
          <span>PRODUTOS DIGITAIS</span>
          <strong>
            {
              quotes
                .flatMap((item) => item.items)
                .filter((item) => ["course", "pdf", "preset"].includes(item.kind)).length
            }
          </strong>
          <small>Cursos, PDFs e presets</small>
        </article>
        <article>
          <span>TOTAL APROVADO</span>
          <strong>
            {formatMoney(
              quotes
                .filter((item) => item.status === "approved" && item.currency === currency)
                .reduce((sum, item) => sum + quoteTotal(item), 0),
              currency,
            )}
          </strong>
          <small>Na moeda selecionada</small>
        </article>
      </section>
      <div className="quote-view-switch" role="tablist" aria-label="Orçamentos ativos e lixeira">
        <button
          className={!showTrash ? "active" : ""}
          type="button"
          onClick={() => setShowTrash(false)}
        >
          Ativos
        </button>
        <button
          className={showTrash ? "active" : ""}
          type="button"
          onClick={() => setShowTrash(true)}
        >
          Lixeira ({quotes.filter((quote) => quote.trashedAt).length})
        </button>
      </div>
      <section className="quote-grid">
        {displayedQuotes.map((quote) => {
          const client = clients.find((item) => item.id === quote.clientId);
          return (
            <article className="card quote-card" key={quote.id}>
              <div className="quote-card-top">
                <span className={`document-status status-${quote.status}`}>
                  {quoteStatusLabels[quote.status]}
                </span>
                <small>Válido até {formatDate(quote.validUntil)}</small>
              </div>
              <h2>{quote.title}</h2>
              <p>{client?.name || "Cliente não vinculado"}</p>
              <div className="quote-products">
                {quote.items.slice(0, 3).map((item) => (
                  <span key={item.id}>
                    {quoteItemKindLabels[item.kind]} · {item.quantity}×
                  </span>
                ))}
              </div>
              <div className="quote-total">
                <small>TOTAL</small>
                <strong>{formatMoney(quoteTotal(quote), quote.currency)}</strong>
                {quote.discount > 0 && (
                  <span>Desconto de {formatMoney(quote.discount, quote.currency)}</span>
                )}
              </div>
              <div className="quote-actions">
                <select
                  value={quote.status}
                  disabled={Boolean(quote.trashedAt)}
                  onChange={(event) => setStatus(quote, event.target.value as QuoteStatus)}
                >
                  <option value="draft">Rascunho</option>
                  <option value="sent">Enviado</option>
                  <option value="approved">Aprovado</option>
                  <option value="declined">Recusado</option>
                </select>
                <button type="button" onClick={() => window.print()}>
                  PDF / imprimir
                </button>
                {quote.workId && (
                  <span className="quote-linked-work">✓ Trabalho #{quote.workId} criado</span>
                )}
                {quote.trashedAt && (
                  <button
                    type="button"
                    onClick={() =>
                      setQuotes((current) =>
                        current.map((item) =>
                          item.id === quote.id ? { ...item, trashedAt: undefined } : item,
                        ),
                      )
                    }
                  >
                    Restaurar
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
      {builderOpen && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={() => setBuilderOpen(false)}
        >
          <aside
            className="client-drawer quote-drawer"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p>NOVO ORÇAMENTO</p>
                <h2>Montar proposta</h2>
                <span>Combine serviços, produtos digitais, fotos e extras.</span>
              </div>
              <button type="button" onClick={() => setBuilderOpen(false)}>
                ×
              </button>
            </div>
            <form onSubmit={saveQuote}>
              <div className="drawer-body">
                <div className="field-grid">
                  <label className="field full">
                    <span>Título *</span>
                    <input
                      required
                      value={draft.title}
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                      placeholder="Ex.: Casamento Amanda e João"
                    />
                  </label>
                  <label className="field">
                    <span>Cliente</span>
                    <select
                      value={draft.clientId || ""}
                      onChange={(event) =>
                        setDraft({ ...draft, clientId: Number(event.target.value) || undefined })
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
                  <label className="field">
                    <span>Moeda</span>
                    <select
                      value={draft.currency}
                      onChange={(event) =>
                        setDraft({ ...draft, currency: event.target.value as Currency })
                      }
                    >
                      <option value="BRL">Real</option>
                      <option value="EUR">Euro</option>
                    </select>
                  </label>
                </div>
                <div className="builder-section">
                  <div className="builder-heading">
                    <div>
                      <strong>Itens do orçamento</strong>
                      <small>Serviços e produtos</small>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          items: [
                            ...draft.items,
                            {
                              id: `item-${Date.now()}`,
                              kind: "extra",
                              description: "",
                              quantity: 1,
                              unitPrice: 0,
                            },
                          ],
                        })
                      }
                    >
                      ＋ Adicionar
                    </button>
                  </div>
                  {draft.items.map((item) => (
                    <div className="quote-item-row" key={item.id}>
                      <select
                        value={item.kind}
                        onChange={(event) =>
                          updateItem(item.id, { kind: event.target.value as QuoteItem["kind"] })
                        }
                      >
                        {Object.entries(quoteItemKindLabels).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={item.description}
                        onChange={(event) =>
                          updateItem(item.id, { description: event.target.value })
                        }
                        placeholder="Descrição"
                      />
                      <input
                        aria-label="Quantidade"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, { quantity: Number(event.target.value) })
                        }
                      />
                      <input
                        aria-label="Preço unitário"
                        type="number"
                        min="0"
                        value={item.unitPrice || ""}
                        onChange={(event) =>
                          updateItem(item.id, { unitPrice: Number(event.target.value) })
                        }
                        placeholder="Valor"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            items: draft.items.filter((row) => row.id !== item.id),
                          })
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Desconto</span>
                    <input
                      type="number"
                      min="0"
                      value={draft.discount || ""}
                      onChange={(event) =>
                        setDraft({ ...draft, discount: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Validade</span>
                    <input
                      type="date"
                      value={draft.validUntil}
                      onChange={(event) => setDraft({ ...draft, validUntil: event.target.value })}
                    />
                  </label>
                  <label className="field full">
                    <span>Observações</span>
                    <textarea
                      rows={4}
                      value={draft.notes}
                      onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                    />
                  </label>
                </div>
                <div className="quote-builder-total">
                  <span>Total do orçamento</span>
                  <strong>{formatMoney(draftTotal, draft.currency)}</strong>
                </div>
              </div>
              <div className="drawer-footer">
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => setBuilderOpen(false)}
                >
                  Cancelar
                </button>
                <button className="primary-button" type="submit">
                  Salvar orçamento
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
      {pendingApproval && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setPendingApproval(null)}
        >
          <section
            className="quote-approval-dialog"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span>APROVAR ORÇAMENTO</span>
            <h2>Criar o trabalho automaticamente?</h2>
            <p>
              O Revelar. copiará cliente, itens, valores, observações e arquivos para um único
              trabalho vinculado.
            </p>
            <dl>
              <div>
                <dt>Cliente</dt>
                <dd>
                  {clients.find((client) => client.id === pendingApproval.clientId)?.name ||
                    "Não vinculado"}
                </dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatMoney(quoteTotal(pendingApproval), pendingApproval.currency)}</dd>
              </div>
              <div>
                <dt>Itens</dt>
                <dd>{pendingApproval.items.length}</dd>
              </div>
            </dl>
            <label className="quote-contract-choice">
              <input
                type="checkbox"
                checked={contractNeeded}
                onChange={(event) => setContractNeeded(event.target.checked)}
              />
              <span>
                <strong>Este serviço precisa de contrato</strong>
                <small>
                  Cria a aba Contrato como pendente dentro do trabalho. Se desligado, ficará como
                  “Não necessário”.
                </small>
              </span>
            </label>
            <footer>
              <button type="button" onClick={() => setPendingApproval(null)}>
                Voltar
              </button>
              <button className="primary-button" type="button" onClick={confirmApproval}>
                Aprovar e criar trabalho
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
