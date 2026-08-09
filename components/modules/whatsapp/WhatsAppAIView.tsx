"use client";

import { useMemo, useState } from "react";
import type { Client, Work } from "@/types/revelar";

const conversations = [
  {
    id: 1,
    name: "Juliana & Rafael",
    message: "Gostamos do pacote Essência. A data seria 12 de outubro.",
    time: "10:42",
    unread: 2,
    tag: "Novo orçamento",
    clientId: 1,
  },
  {
    id: 2,
    name: "Loja Aurora",
    message: "As referências da próxima coleção estão prontas.",
    time: "ontem",
    unread: 0,
    tag: "Editorial",
    clientId: 4,
  },
  {
    id: 3,
    name: "Camila Ferreira",
    message: "Terminei de escolher as 30 fotos 💛",
    time: "ontem",
    unread: 1,
    tag: "Seleção concluída",
    clientId: 2,
  },
];

export function WhatsAppAIView({
  clients,
  works,
  toast,
}: {
  clients: Client[];
  works: Work[];
  toast: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(1);
  const [approved, setApproved] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const selected = conversations.find((item) => item.id === selectedId)!;
  const filtered = conversations.filter((item) =>
    `${item.name} ${item.message}`.toLowerCase().includes(query.toLowerCase()),
  );
  const suggestions = useMemo(
    () =>
      selectedId === 1
        ? [
            {
              id: "lead",
              icon: "＋",
              title: "Criar cliente",
              detail: "Juliana & Rafael · casamento",
              sensitive: false,
            },
            {
              id: "date",
              icon: "◇",
              title: "Reservar data",
              detail: "12 de outubro · aguardando confirmação",
              sensitive: false,
            },
            {
              id: "quote",
              icon: "＄",
              title: "Preparar orçamento",
              detail: "Pacote Essência",
              sensitive: true,
            },
          ]
        : selectedId === 3
          ? [
              {
                id: "selection",
                icon: "✓",
                title: "Atualizar trabalho",
                detail: "Marcar seleção como concluída",
                sensitive: false,
              },
              {
                id: "reply",
                icon: "↗",
                title: "Responder cliente",
                detail: "Agradecer e informar o prazo de edição",
                sensitive: true,
              },
            ]
          : [
              {
                id: "references",
                icon: "▧",
                title: "Adicionar referências",
                detail: "Vincular ao moodboard do editorial",
                sensitive: false,
              },
            ],
    [selectedId],
  );
  return (
    <div className="wa-view">
      <header className="wa-heading">
        <div>
          <p>ATENDIMENTO INTELIGENTE</p>
          <h1>WhatsApp e IA</h1>
          <span>Conversas organizadas, decisões sempre sob seu controle.</span>
        </div>
        <button
          className="wa-connect"
          onClick={() =>
            toast("A conexão oficial será ativada com as credenciais da Meta Business")
          }
        >
          ◉ Conectar WhatsApp Business
        </button>
      </header>
      <div className="wa-demo-badge">
        <span>DEMONSTRAÇÃO</span>
        <p>
          A caixa de entrada é fictícia. {works.length} trabalhos estão disponíveis para vínculo e
          nenhuma mensagem será enviada.
        </p>
      </div>
      <div className="wa-layout">
        <aside className="wa-inbox">
          <label>
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar conversa"
            />
          </label>
          {filtered.map((chat) => (
            <button
              key={chat.id}
              className={selectedId === chat.id ? "active" : ""}
              onClick={() => setSelectedId(chat.id)}
            >
              <i>{chat.name.slice(0, 2).toUpperCase()}</i>
              <span>
                <strong>{chat.name}</strong>
                <small>{chat.message}</small>
                <em>{chat.tag}</em>
              </span>
              <time>{chat.time}</time>
              {chat.unread > 0 && <b>{chat.unread}</b>}
            </button>
          ))}
        </aside>
        <section className="wa-chat">
          <header>
            <i>{selected.name.slice(0, 2).toUpperCase()}</i>
            <div>
              <strong>{selected.name}</strong>
              <span>
                {clients.find((client) => client.id === selected.clientId)?.whatsapp ||
                  "Novo contato"}
              </span>
            </div>
            <button>⋯</button>
          </header>
          <div className="wa-messages">
            <span>HOJE</span>
            <p className="incoming">
              Olá, Mary! Estamos procurando fotografia para o nosso casamento.
            </p>
            <p className="outgoing">Oi! Que alegria receber vocês por aqui. Qual seria a data?</p>
            <p className="incoming">{selected.message}</p>
          </div>
          <footer>
            <button>＋</button>
            <input placeholder="Escreva uma mensagem" />
            <button>➤</button>
          </footer>
        </section>
        <aside className="ai-panel">
          <div className="ai-title">
            <span>✦</span>
            <div>
              <strong>Assistente Revelar</strong>
              <small>Encontrou {suggestions.length} ações</small>
            </div>
          </div>
          <div className="ai-summary">
            <span>RESUMO</span>
            <p>
              {selectedId === 1
                ? "Casal interessado no pacote Essência para casamento em 12 de outubro. Ainda falta confirmar local e horário."
                : "A conversa foi analisada e pode atualizar o fluxo sem enviar mensagens automaticamente."}
            </p>
          </div>
          <div className="ai-actions">
            {suggestions.map((suggestion) => (
              <article
                key={suggestion.id}
                className={approved.includes(suggestion.id) ? "done" : ""}
              >
                <i>{suggestion.icon}</i>
                <div>
                  <strong>{suggestion.title}</strong>
                  <small>{suggestion.detail}</small>
                  {suggestion.sensitive && <em>EXIGE CONFIRMAÇÃO</em>}
                </div>
                {approved.includes(suggestion.id) ? (
                  <b>✓</b>
                ) : (
                  <button
                    onClick={() => {
                      setApproved((current) => [...current, suggestion.id]);
                      toast(
                        suggestion.sensitive
                          ? "Ação aprovada apenas na demonstração"
                          : "Ação interna aplicada na demonstração",
                      );
                    }}
                  >
                    Aprovar
                  </button>
                )}
              </article>
            ))}
          </div>
          <small className="ai-privacy">
            IA analisa prévias e referências. Originais em alta só entram com autorização.
          </small>
        </aside>
      </div>
    </div>
  );
}
