import { useMemo } from "react";

import { workStatusLabels } from "@/config/labels";
import { addDays, todayIso } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { namesForClients, workProgress } from "@/lib/works";
import type { Client, ViewMode, Work, WorkCategory, WorkStatus } from "@/types/revelar";

export function WorksView({
  works,
  clients,
  viewMode,
  setViewMode,
  search,
  setSearch,
  status,
  setStatus,
  category,
  setCategory,
  onNewWork,
  onOpenWork,
}: {
  works: Work[];
  clients: Client[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  search: string;
  setSearch: (value: string) => void;
  status: "all" | WorkStatus;
  setStatus: (value: "all" | WorkStatus) => void;
  category: "all" | WorkCategory;
  setCategory: (value: "all" | WorkCategory) => void;
  onNewWork: () => void;
  onOpenWork: (work: Work) => void;
}) {
  const today = todayIso();
  const attentionLimit = addDays(today, 9);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return works.filter((work) => {
      const haystack =
        `${work.title} ${work.category} ${work.location} ${namesForClients(work.clientIds, clients)}`.toLowerCase();
      return (
        (status === "all" || work.status === status) &&
        (category === "all" || work.category === category) &&
        (!term || haystack.includes(term))
      );
    });
  }, [works, clients, search, status, category]);
  const active = works.filter(
    (work) => !["completed", "archived", "cancelled"].includes(work.status),
  ).length;
  const scheduled = works.filter(
    (work) => work.status === "scheduled" || work.status === "planning",
  ).length;
  const urgent = works.filter(
    (work) =>
      !["completed", "archived", "cancelled"].includes(work.status) &&
      Boolean(work.deliveryDate) &&
      work.deliveryDate <= attentionLimit,
  ).length;
  const receivableBRL = works
    .filter((work) => work.currency === "BRL")
    .reduce((sum, work) => sum + Math.max(0, work.totalValue - work.entryValue), 0);
  const receivableEUR = works
    .filter((work) => work.currency === "EUR")
    .reduce((sum, work) => sum + Math.max(0, work.totalValue - work.entryValue), 0);

  return (
    <div className="works-page">
      <section className="works-title-row">
        <div>
          <p>PRODUÇÃO</p>
          <h1>Trabalhos</h1>
          <span>Acompanhe cada ensaio do orçamento até a entrega.</span>
        </div>
        <button className="primary-button" type="button" onClick={onNewWork}>
          ＋ Novo trabalho
        </button>
      </section>

      <section className="work-metrics" aria-label="Resumo de trabalhos">
        <article>
          <span>EM ANDAMENTO</span>
          <strong>{active}</strong>
          <small>Todos os fluxos ativos</small>
        </article>
        <article>
          <span>AGENDADOS</span>
          <strong>{scheduled}</strong>
          <small>Preparação e sessão</small>
        </article>
        <article className={urgent ? "metric-urgent" : ""}>
          <span>PRAZOS PRÓXIMOS</span>
          <strong>{urgent}</strong>
          <small>Até 12 de agosto</small>
        </article>
        <article>
          <span>A RECEBER</span>
          <strong>{formatMoney(receivableBRL, "BRL")}</strong>
          <small>
            {receivableEUR ? `+ ${formatMoney(receivableEUR, "EUR")}` : "Nenhum valor em euro"}
          </small>
        </article>
      </section>

      <section className="works-panel">
        <header className="works-toolbar">
          <label className="work-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar trabalho, cliente ou local"
              aria-label="Buscar trabalhos"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "all" | WorkStatus)}
            aria-label="Filtrar por andamento"
          >
            <option value="all">Todos os andamentos</option>
            {Object.entries(workStatusLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as "all" | WorkCategory)}
            aria-label="Filtrar por categoria"
          >
            <option value="all">Todas as categorias</option>
            {(
              [
                "Casamento",
                "Pré-wedding",
                "Ensaio pessoal",
                "Família",
                "Aniversário",
                "Editorial para loja",
                "Evento",
                "Estúdio",
              ] as WorkCategory[]
            ).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <div className="view-switch" aria-label="Modo de visualização">
            <button
              type="button"
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
              aria-label="Visualizar como lista"
            >
              ☷
            </button>
            <button
              type="button"
              className={viewMode === "cards" ? "active" : ""}
              onClick={() => setViewMode("cards")}
              aria-label="Visualizar como cards"
            >
              ▦
            </button>
          </div>
        </header>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <span>⌕</span>
            <h2>Nenhum trabalho encontrado</h2>
            <p>Tente mudar a busca ou os filtros.</p>
            <button
              className="outline-button"
              type="button"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setCategory("all");
              }}
            >
              Limpar filtros
            </button>
          </div>
        ) : viewMode === "list" ? (
          <div className="work-list">
            <div className="work-list-head">
              <span>TRABALHO</span>
              <span>DATA E LOCAL</span>
              <span>ANDAMENTO</span>
              <span>FINANCEIRO</span>
              <span>PRAZO</span>
              <span />
            </div>
            {filtered.map((work) => {
              const progress = workProgress(work);
              const balance = work.totalValue - work.entryValue;
              return (
                <button
                  className="work-row"
                  type="button"
                  key={work.id}
                  onClick={() => onOpenWork(work)}
                >
                  <span className="work-main">
                    <span className={`work-category-icon status-${work.status}`}>▱</span>
                    <span>
                      <strong>{work.title}</strong>
                      <small>
                        {work.category} · {namesForClients(work.clientIds, clients)}
                      </small>
                    </span>
                  </span>
                  <span className="work-date">
                    <strong>
                      {formatDate(work.date)} · {work.time}
                    </strong>
                    <small>{work.location}</small>
                  </span>
                  <span className="work-flow">
                    <span>
                      <strong>{workStatusLabels[work.status]}</strong>
                      <small>{progress}%</small>
                    </span>
                    <i>
                      <b style={{ width: `${progress}%` }} />
                    </i>
                  </span>
                  <span className="work-money">
                    <strong>{formatMoney(work.totalValue, work.currency)}</strong>
                    <small>
                      {balance > 0 ? `${formatMoney(balance, work.currency)} pendente` : "Pago"}
                    </small>
                  </span>
                  <span
                    className={`work-deadline ${work.deliveryDate && work.deliveryDate <= today ? "urgent" : ""}`}
                  >
                    <strong>{formatDate(work.deliveryDate)}</strong>
                    <small>
                      {work.deliveryDate && work.deliveryDate < today
                        ? "Prazo atrasado"
                        : work.deliveryDate === today
                          ? "Entrega hoje"
                          : "Prazo de entrega"}
                    </small>
                  </span>
                  <span className="row-arrow">›</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="work-card-grid">
            {filtered.map((work) => {
              const progress = workProgress(work);
              return (
                <button
                  className="work-card"
                  type="button"
                  key={work.id}
                  onClick={() => onOpenWork(work)}
                >
                  <span className="work-card-top">
                    <span className={`status-badge status-${work.status}`}>
                      {workStatusLabels[work.status]}
                    </span>
                    <span className="work-category-label">{work.category}</span>
                  </span>
                  <strong className="work-card-title">{work.title}</strong>
                  <span className="work-card-clients">
                    {namesForClients(work.clientIds, clients)}
                  </span>
                  <span className="work-card-info">
                    <span>
                      ◇ {formatDate(work.date)} · {work.time}
                    </span>
                    <span>⌖ {work.location}</span>
                  </span>
                  <span className="work-card-progress">
                    <span>
                      <small>Fluxo do trabalho</small>
                      <strong>{progress}%</strong>
                    </span>
                    <i>
                      <b style={{ width: `${progress}%` }} />
                    </i>
                  </span>
                  <span
                    className={`work-card-deadline ${work.deliveryDate && work.deliveryDate <= today ? "urgent" : ""}`}
                  >
                    <span>⌛</span>
                    <span>
                      <small>Entrega</small>
                      <strong>{formatDate(work.deliveryDate)}</strong>
                    </span>
                  </span>
                  <span className="photo-counts">
                    <span>
                      {work.photos.captured}
                      <small>Tiradas</small>
                    </span>
                    <span>
                      {work.photos.selected}
                      <small>Selecionadas</small>
                    </span>
                    <span>
                      {work.photos.edited}
                      <small>Editadas</small>
                    </span>
                    <span>
                      {work.photos.delivered}
                      <small>Entregues</small>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <footer className="clients-footer">
          Mostrando {filtered.length} de {works.length} trabalhos
        </footer>
      </section>
    </div>
  );
}
