import { useMemo } from "react";

import { initials } from "@/lib/format";
import type { Client, ClientType, ViewMode } from "@/types/revelar";

export function ClientsView({
  clients,
  viewMode,
  setViewMode,
  search,
  setSearch,
  filter,
  setFilter,
  onNewClient,
  onOpenClient,
}: {
  clients: Client[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  search: string;
  setSearch: (value: string) => void;
  filter: "all" | ClientType;
  setFilter: (value: "all" | ClientType) => void;
  onNewClient: () => void;
  onOpenClient: (client: Client) => void;
}) {
  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesType = filter === "all" || client.type === filter;
      const matchesSearch =
        !term ||
        [client.name, client.whatsapp, client.email, client.instagram].some((value) =>
          value.toLowerCase().includes(term),
        );
      return matchesType && matchesSearch;
    });
  }, [clients, filter, search]);

  const companies = clients.filter((client) => client.type === "company").length;
  const upcomingDates = clients.filter((client) => client.nextDate).length;

  return (
    <div className="clients-page">
      <section className="clients-title-row">
        <div>
          <p>RELACIONAMENTOS</p>
          <h1>Clientes</h1>
          <span>Contatos, histórico e oportunidades em um só lugar.</span>
        </div>
        <button className="primary-button" type="button" onClick={onNewClient}>
          ＋ Novo cliente
        </button>
      </section>

      <section className="client-metrics" aria-label="Resumo de clientes">
        <article>
          <span>CLIENTES ATIVOS</span>
          <strong>{clients.length}</strong>
          <small>4 retornaram este ano</small>
        </article>
        <article>
          <span>PESSOAS</span>
          <strong>{clients.length - companies}</strong>
          <small>Ensaios e eventos</small>
        </article>
        <article>
          <span>EMPRESAS E LOJAS</span>
          <strong>{companies}</strong>
          <small>Conteúdo recorrente</small>
        </article>
        <article>
          <span>PRÓXIMAS DATAS</span>
          <strong>{upcomingDates}</strong>
          <small>Oportunidades de contato</small>
        </article>
      </section>

      <section className="clients-panel">
        <header className="clients-toolbar">
          <div className="client-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, WhatsApp ou Instagram"
              aria-label="Buscar clientes"
            />
          </div>
          <div className="type-filter" aria-label="Filtrar clientes">
            <button
              type="button"
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              Todos
            </button>
            <button
              type="button"
              className={filter === "person" ? "active" : ""}
              onClick={() => setFilter("person")}
            >
              Pessoas
            </button>
            <button
              type="button"
              className={filter === "company" ? "active" : ""}
              onClick={() => setFilter("company")}
            >
              Empresas
            </button>
          </div>
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

        {filteredClients.length === 0 ? (
          <div className="empty-state">
            <span>⌕</span>
            <h2>Nenhum cliente encontrado</h2>
            <p>Tente outro termo ou limpe os filtros.</p>
            <button
              type="button"
              className="outline-button"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Limpar busca
            </button>
          </div>
        ) : viewMode === "list" ? (
          <div className="client-list">
            <div className="client-list-head">
              <span>CLIENTE</span>
              <span>CONTATO</span>
              <span>ÚLTIMO TRABALHO</span>
              <span>PRÓXIMA DATA</span>
              <span />
            </div>
            {filteredClients.map((client) => (
              <button
                type="button"
                className="client-row"
                key={client.id}
                onClick={() => onOpenClient(client)}
              >
                <span className="client-main">
                  <span className="client-avatar">
                    {client.avatar ? <img src={client.avatar} alt="" /> : initials(client.name)}
                  </span>
                  <span>
                    <strong>{client.name}</strong>
                    <small>
                      {client.type === "company" ? "Empresa / loja" : client.tag} ·{" "}
                      {client.workCount} {client.workCount === 1 ? "trabalho" : "trabalhos"}
                    </small>
                  </span>
                </span>
                <span className="client-contact">
                  <strong>{client.whatsapp}</strong>
                  <small>{client.instagram}</small>
                </span>
                <span className="client-last">
                  <strong>{client.lastWork.split(" · ")[0]}</strong>
                  <small>{client.lastWork.split(" · ")[1] || "—"}</small>
                </span>
                <span className="client-date">
                  {client.nextDate ? (
                    <>
                      <strong>{client.nextDate}</strong>
                      <small>{client.nextDateLabel}</small>
                    </>
                  ) : (
                    <small>Nenhuma data</small>
                  )}
                </span>
                <span className="row-arrow">›</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="client-card-grid">
            {filteredClients.map((client) => (
              <button
                type="button"
                className="client-card"
                key={client.id}
                onClick={() => onOpenClient(client)}
              >
                <span className="client-card-top">
                  <span className="client-avatar large">
                    {client.avatar ? <img src={client.avatar} alt="" /> : initials(client.name)}
                  </span>
                  <span className="client-tag">
                    {client.type === "company" ? "Empresa" : client.tag}
                  </span>
                </span>
                <strong className="client-card-name">{client.name}</strong>
                <span className="client-card-handle">{client.instagram}</span>
                <span className="client-card-info">
                  <span>◉ {client.whatsapp}</span>
                  <span>
                    ▱ {client.workCount} {client.workCount === 1 ? "trabalho" : "trabalhos"}
                  </span>
                </span>
                {client.nextDate && (
                  <span className="important-date">
                    <b>◇</b>
                    <span>
                      <small>{client.nextDateLabel}</small>
                      <strong>{client.nextDate}</strong>
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <footer className="clients-footer">
          Mostrando {filteredClients.length} de {clients.length} clientes
        </footer>
      </section>
    </div>
  );
}
