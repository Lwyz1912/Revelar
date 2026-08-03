import { type Dispatch, type FormEvent, type SetStateAction, useState } from "react";

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
  onConvert,
  onCreateContract,
  toast,
}: {
  quotes: Quote[];
  setQuotes: Dispatch<SetStateAction<Quote[]>>;
  clients: Client[];
  currency: Currency;
  onConvert: (quote: Quote) => void;
  onCreateContract: (quote: Quote) => void;
  toast: (message: string) => void;
}) {
  const [builderOpen, setBuilderOpen] = useState(false);
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
  const setStatus = (quote: Quote, status: QuoteStatus) =>
    setQuotes((current) =>
      current.map((item) => (item.id === quote.id ? { ...item, status } : item)),
    );

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
      <section className="quote-grid">
        {quotes.map((quote) => {
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
                {quote.status === "approved" && (
                  <>
                    <button type="button" onClick={() => onConvert(quote)}>
                      Criar trabalho
                    </button>
                    <button
                      className="primary-mini"
                      type="button"
                      onClick={() => onCreateContract(quote)}
                    >
                      Criar contrato
                    </button>
                  </>
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
    </div>
  );
}
