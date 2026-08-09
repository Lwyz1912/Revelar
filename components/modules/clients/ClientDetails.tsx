"use client";

import { useMemo, useState } from "react";

import { formatMoney, initials } from "@/lib/format";
import type { Client, Contract, Currency, FinanceTransaction, Quote, Work } from "@/types/revelar";

type ClientTab = "summary" | "works" | "finance" | "files" | "timeline" | "notes";

const tabs: Array<{ id: ClientTab; label: string }> = [
  { id: "summary", label: "Resumo" },
  { id: "works", label: "Trabalhos" },
  { id: "finance", label: "Financeiro" },
  { id: "files", label: "Arquivos" },
  { id: "timeline", label: "Timeline" },
  { id: "notes", label: "Anotações" },
];

export function ClientDetails({
  client,
  works,
  transactions,
  quotes,
  contracts,
  currency,
  onBack,
  onEdit,
  onNewWork,
  onOpenWork,
  onNavigate,
  onUpdate,
  onArchive,
  toast,
}: {
  client: Client;
  works: Work[];
  transactions: FinanceTransaction[];
  quotes: Quote[];
  contracts: Contract[];
  currency: Currency;
  onBack: () => void;
  onEdit: () => void;
  onNewWork: () => void;
  onOpenWork: (work: Work) => void;
  onNavigate: (section: "Orçamentos" | "Contratos" | "Financeiro") => void;
  onUpdate: (client: Client) => void;
  onArchive: () => void;
  toast: (message: string) => void;
}) {
  const [tab, setTab] = useState<ClientTab>("summary");
  const [notes, setNotes] = useState(client.notes || "");
  const clientWorks = useMemo(
    () => works.filter((work) => work.clientIds.includes(client.id)),
    [client.id, works],
  );
  const workIds = useMemo(() => new Set(clientWorks.map((work) => work.id)), [clientWorks]);
  const clientTransactions = transactions.filter(
    (transaction) =>
      (transaction.workId && workIds.has(transaction.workId)) ||
      transaction.origin.toLowerCase().includes(client.name.toLowerCase()),
  );
  const clientQuotes = quotes.filter((quote) => quote.clientId === client.id);
  const clientContracts = contracts.filter((contract) => contract.clientId === client.id);
  const sameCurrencyWorks = clientWorks.filter((work) => work.currency === currency);
  const revenue = sameCurrencyWorks.reduce((sum, work) => sum + work.totalValue, 0);
  const received = clientTransactions
    .filter(
      (transaction) =>
        transaction.currency === currency &&
        transaction.type === "income" &&
        transaction.status === "received",
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const pending = Math.max(0, revenue - received);
  const sortedWorks = [...clientWorks].sort((a, b) => b.date.localeCompare(a.date));
  const lastWork = sortedWorks[0];
  const files = clientWorks.flatMap((work) =>
    work.attachments.map((filename) => ({ filename, work })),
  );
  const whatsappUrl = `https://wa.me/${client.whatsapp.replace(/\D/g, "")}`;
  const timeline = [
    ...clientWorks.map((work) => ({
      id: `work-${work.id}`,
      date: work.date || "",
      title: work.title,
      detail: `${work.category} · ${work.status === "completed" ? "Concluído" : "Em andamento"}`,
    })),
    ...clientQuotes.map((quote) => ({
      id: `quote-${quote.id}`,
      date: quote.validUntil,
      title: `Orçamento · ${quote.title}`,
      detail: `Status: ${quote.status}`,
    })),
    ...clientContracts.map((contract) => ({
      id: `contract-${contract.id}`,
      date: "",
      title: contract.title,
      detail: `Contrato · ${contract.status}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="client-details-page">
      <header className="client-profile-hero">
        <button className="back-button" type="button" onClick={onBack}>
          ← Clientes
        </button>
        <div className="client-profile-main">
          <span className="client-avatar profile-large">
            {client.avatar ? <img src={client.avatar} alt="" /> : initials(client.name)}
          </span>
          <div>
            <span className="client-profile-tag">
              {client.archived ? "Arquivado" : client.type === "company" ? "Empresa" : client.tag}
            </span>
            <h1>{client.name}</h1>
            <p>
              {client.instagram} · {client.whatsapp}
            </p>
          </div>
        </div>
        <div className="client-primary-actions">
          <a className="whatsapp-button" href={whatsappUrl} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <button className="outline-button" type="button" onClick={onEdit}>
            Editar
          </button>
          <button className="primary-button" type="button" onClick={onNewWork}>
            ＋ Novo trabalho
          </button>
        </div>
      </header>

      <nav className="client-profile-tabs" aria-label="Seções da ficha do cliente">
        {tabs.map((item) => (
          <button
            type="button"
            key={item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === "works" && <b>{clientWorks.length}</b>}
            {item.id === "files" && <b>{files.length}</b>}
          </button>
        ))}
      </nav>

      {tab === "summary" && (
        <div className="client-summary-layout">
          <section className="client-profile-metrics">
            <article>
              <span>FATURAMENTO</span>
              <strong>{formatMoney(revenue, currency)}</strong>
              <small>{clientWorks.length} trabalhos vinculados</small>
            </article>
            <article>
              <span>A RECEBER</span>
              <strong>{formatMoney(pending, currency)}</strong>
              <small>{pending ? "Há valores pendentes" : "Tudo recebido"}</small>
            </article>
            <article>
              <span>ÚLTIMA CONTRATAÇÃO</span>
              <strong>
                {lastWork?.date
                  ? new Date(`${lastWork.date}T12:00:00`).toLocaleDateString("pt-BR")
                  : "—"}
              </strong>
              <small>{lastWork?.title || "Nenhum trabalho"}</small>
            </article>
            <article>
              <span>PRÓXIMA DATA</span>
              <strong>{client.nextDate || "—"}</strong>
              <small>{client.nextDateLabel || "Nenhuma data cadastrada"}</small>
            </article>
          </section>

          <section className="client-contact-card">
            <header>
              <h2>Contato</h2>
              <button type="button" onClick={onEdit}>
                Editar
              </button>
            </header>
            <dl>
              <div>
                <dt>WhatsApp</dt>
                <dd>{client.whatsapp}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{client.email || "Não informado"}</dd>
              </div>
              <div>
                <dt>Instagram</dt>
                <dd>{client.instagram || "Não informado"}</dd>
              </div>
            </dl>
          </section>

          <section className="client-quick-actions">
            <h2>Ações rápidas</h2>
            <div>
              <button type="button" onClick={onNewWork}>
                <span>＋</span>Novo trabalho
              </button>
              <button type="button" onClick={() => onNavigate("Orçamentos")}>
                <span>▤</span>Orçamento
              </button>
              <button type="button" onClick={() => onNavigate("Contratos")}>
                <span>✓</span>Contrato
              </button>
              <button type="button" onClick={() => onNavigate("Financeiro")}>
                <span>€</span>Pagamento
              </button>
              <button type="button" onClick={() => setTab("notes")}>
                <span>✎</span>Anotação
              </button>
            </div>
          </section>

          <section className="client-recent-work">
            <header>
              <h2>Trabalhos recentes</h2>
              <button type="button" onClick={() => setTab("works")}>
                Ver todos
              </button>
            </header>
            {sortedWorks.slice(0, 3).map((work) => (
              <button type="button" key={work.id} onClick={() => onOpenWork(work)}>
                <span>
                  <strong>{work.title}</strong>
                  <small>
                    {work.category} · {work.date || "Sem data"}
                  </small>
                </span>
                <b>{formatMoney(work.totalValue, work.currency)}</b>
                <i>›</i>
              </button>
            ))}
          </section>
        </div>
      )}

      {tab === "works" && (
        <section className="client-tab-panel client-work-list">
          <header>
            <div>
              <p>HISTÓRICO</p>
              <h2>Trabalhos de {client.name}</h2>
            </div>
            <button className="primary-button" type="button" onClick={onNewWork}>
              ＋ Novo trabalho
            </button>
          </header>
          {sortedWorks.map((work) => (
            <button type="button" key={work.id} onClick={() => onOpenWork(work)}>
              <span>
                <strong>{work.title}</strong>
                <small>
                  {work.category} · {work.location || "Local a definir"}
                </small>
              </span>
              <span>
                <strong>{work.date || "Sem data"}</strong>
                <small>{work.packageName}</small>
              </span>
              <b>{formatMoney(work.totalValue, work.currency)}</b>
              <i>›</i>
            </button>
          ))}
          {!sortedWorks.length && <div className="empty-state">Nenhum trabalho vinculado.</div>}
        </section>
      )}

      {tab === "finance" && (
        <section className="client-tab-panel client-finance-list">
          <header>
            <div>
              <p>FINANCEIRO</p>
              <h2>Movimentações vinculadas</h2>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => onNavigate("Financeiro")}
            >
              Registrar pagamento
            </button>
          </header>
          {clientTransactions.map((transaction) => (
            <article key={transaction.id}>
              <span>
                <strong>{transaction.description}</strong>
                <small>
                  {transaction.date} · {transaction.status}
                </small>
              </span>
              <b>{formatMoney(transaction.amount, transaction.currency)}</b>
            </article>
          ))}
          {!clientTransactions.length && (
            <div className="empty-state">Nenhuma movimentação vinculada.</div>
          )}
        </section>
      )}

      {tab === "files" && (
        <section className="client-tab-panel client-files-list">
          <header>
            <div>
              <p>ARQUIVOS</p>
              <h2>Documentos e galerias</h2>
            </div>
          </header>
          {clientWorks.map((work) => (
            <article key={work.id}>
              <header>
                <strong>{work.title}</strong>
                <button type="button" onClick={() => onOpenWork(work)}>
                  Abrir trabalho
                </button>
              </header>
              <div>
                {work.attachments.map((file) => (
                  <span key={file}>▱ {file}</span>
                ))}
                <span>▦ Galeria · {work.photos.selected} selecionadas</span>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === "timeline" && (
        <section className="client-tab-panel client-timeline-list">
          <header>
            <div>
              <p>TIMELINE</p>
              <h2>Histórico do relacionamento</h2>
            </div>
          </header>
          {timeline.map((item) => (
            <article key={item.id}>
              <i />
              <span>{item.date || "Registro"}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === "notes" && (
        <section className="client-tab-panel client-notes-panel">
          <header>
            <div>
              <p>ANOTAÇÕES</p>
              <h2>Preferências e informações úteis</h2>
            </div>
          </header>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: prefere fotos espontâneas, gosta de tons quentes..."
          />
          <footer>
            <button className="outline-button" type="button" onClick={onArchive}>
              {client.archived ? "Restaurar cliente" : "Arquivar cliente"}
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                onUpdate({ ...client, notes });
                toast("Anotação salva na ficha do cliente");
              }}
            >
              Salvar anotação
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
