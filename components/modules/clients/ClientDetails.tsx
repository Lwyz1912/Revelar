"use client";

import { useMemo, useState } from "react";

import { todayIso } from "@/lib/dates";
import { quoteStatusLabels, workStatusLabels } from "@/config/labels";
import { formatDate, formatMoney, initials } from "@/lib/format";
import { workTransactions } from "@/lib/finance";
import { fileDownloadUrl, isAppFileRef } from "@/lib/app-files.client";
import type { Client, Contract, Currency, FinanceTransaction, Quote, Work } from "@/types/revelar";
import { useUrlStringState } from "@/hooks/use-url-state";

type ClientTab = "summary" | "works" | "finance" | "files" | "timeline" | "notes";

const tabs: Array<{ id: ClientTab; label: string }> = [
  { id: "summary", label: "Resumo" },
  { id: "works", label: "Trabalhos" },
  { id: "finance", label: "Financeiro" },
  { id: "files", label: "Arquivos" },
  { id: "timeline", label: "Timeline" },
  { id: "notes", label: "Anotações" },
];
const tabIds = tabs.map((item) => item.id);

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
  onNavigate: (section: "Orçamentos" | "Financeiro") => void;
  onUpdate: (client: Client) => void;
  onArchive: () => void;
  toast: (message: string) => void;
}) {
  const [tab, setTab] = useUrlStringState<ClientTab>("clientTab", "summary", tabIds);
  const [notes, setNotes] = useState(client.notes || "");
  const clientWorks = useMemo(
    () => works.filter((work) => work.clientIds.includes(client.id)),
    [client.id, works],
  );
  const workIds = useMemo(() => new Set(clientWorks.map((work) => work.id)), [clientWorks]);
  const clientTransactions = [...transactions, ...workTransactions(clientWorks)].filter(
    (transaction) =>
      (transaction.workId && workIds.has(transaction.workId)) ||
      transaction.origin.toLowerCase().includes(client.name.toLowerCase()),
  );
  const visibleTransactions = clientTransactions.filter((item) => item.currency === currency);
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
  const today = todayIso();
  const nextSession = clientWorks
    .filter(
      (work) => work.date >= today && !["completed", "archived", "cancelled"].includes(work.status),
    )
    .sort((a, b) =>
      `${a.date}T${a.time || "23:59"}`.localeCompare(`${b.date}T${b.time || "23:59"}`),
    )[0];
  const files = clientWorks.flatMap((work) =>
    work.attachments.map((file) => ({ filename: isAppFileRef(file) ? file.name : file, work })),
  );
  const whatsappUrl = `https://wa.me/${client.whatsapp.replace(/\D/g, "")}`;
  const timeline = [
    ...clientWorks.map((work) => ({
      id: `work-${work.id}`,
      date: work.date || "",
      title: work.title,
      detail: `${work.category} · ${workStatusLabels[work.status]}`,
    })),
    ...clientQuotes.map((quote) => ({
      id: `quote-${quote.id}`,
      date: quote.validUntil,
      title: `Orçamento · ${quote.title}`,
      detail: `${quoteStatusLabels[quote.status]}`,
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
          <details className="client-profile-menu">
            <summary aria-label="Mais opções da ficha">⋯</summary>
            <button className="outline-button" type="button" onClick={onArchive}>
              {client.archived ? "Restaurar cliente" : "Arquivar cliente"}
            </button>
          </details>
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
          {nextSession && (
            <section className="client-next-session" aria-label="Próxima sessão">
              <div>
                <small>PRÓXIMA SESSÃO</small>
                <h2>{nextSession.title}</h2>
                <p>
                  {formatDate(nextSession.date)} · {nextSession.time || "Horário a definir"} ·{" "}
                  {nextSession.location || "Local a definir"}
                </p>
              </div>
              <button
                className="outline-button"
                type="button"
                onClick={() => onOpenWork(nextSession)}
              >
                Abrir trabalho ›
              </button>
            </section>
          )}
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
              <button type="button" onClick={() => onNavigate("Orçamentos")}>
                <span>▤</span>Orçamento
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
                    {work.category} · {work.date ? formatDate(work.date) : "Sem data"}
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
                <strong>{work.date ? formatDate(work.date) : "Sem data"}</strong>
                <small>{workStatusLabels[work.status]}</small>
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
              <h2>Movimentações vinculadas · {currency}</h2>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => onNavigate("Financeiro")}
            >
              Abrir Financeiro
            </button>
          </header>
          {visibleTransactions.map((transaction) => (
            <article key={transaction.id}>
              <span>
                <strong>{transaction.description}</strong>
                <small>
                  {formatDate(transaction.date)} ·{" "}
                  {
                    { received: "Recebido", paid: "Pago", pending: "Pendente", late: "Em atraso" }[
                      transaction.status
                    ]
                  }
                </small>
              </span>
              <b>{formatMoney(transaction.amount, transaction.currency)}</b>
            </article>
          ))}
          {!visibleTransactions.length && (
            <div className="empty-state">
              Nenhum lançamento nesta moeda. Valores a receber podem existir antes de um lançamento.
            </div>
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
                {work.attachments.map((file, index) => (
                  <span key={`${isAppFileRef(file) ? file.id : file}-${index}`}>
                    {isAppFileRef(file) ? (
                      <a href={fileDownloadUrl(file)} download={file.name}>
                        {file.name}
                      </a>
                    ) : (
                      file
                    )}
                  </span>
                ))}
                {work.photos.selected > 0 && (
                  <span>▦ Galeria · {work.photos.selected} selecionadas</span>
                )}
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
              <span>{item.date ? formatDate(item.date) : "Registro"}</span>
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
          <div className="client-notes-layout">
            <textarea
              aria-label="Anotação do cliente"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: prefere fotos espontâneas, gosta de tons quentes..."
            />
            <aside>
              <strong>O que vale anotar</strong>
              <ul>
                <li>Estilo de fotos</li>
                <li>Preferências de edição</li>
                <li>Cuidados para o ensaio</li>
              </ul>
            </aside>
          </div>
          <footer>
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
