"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { RevelarIcon } from "@/components/shared/RevelarIcon";
import { useStoredJsonState } from "@/hooks/use-persisted-state";
import { storageKeys } from "@/lib/storage";
import type { Client, Work } from "@/types/revelar";

type Conversation = {
  id: number;
  name: string;
  message: string;
  time: string;
  unread: number;
  tag: string;
  clientId: number;
};

type DemoMessage = {
  id: string;
  direction: "incoming" | "outgoing";
  text: string;
  time: string;
};

type DemoMessages = Record<string, DemoMessage[]>;

const conversations: Conversation[] = [
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

const initialMessages: DemoMessages = {
  "1": [
    {
      id: "1-welcome",
      direction: "incoming",
      text: "Olá, Mary! Estamos procurando fotografia para o nosso casamento.",
      time: "10:36",
    },
    {
      id: "1-reply",
      direction: "outgoing",
      text: "Oi! Que alegria receber vocês por aqui. Qual seria a data?",
      time: "10:39",
    },
    {
      id: "1-latest",
      direction: "incoming",
      text: conversations[0].message,
      time: "10:42",
    },
  ],
  "2": [
    {
      id: "2-welcome",
      direction: "incoming",
      text: "Oi, Mary! As referências da próxima coleção estão prontas.",
      time: "16:18",
    },
    {
      id: "2-reply",
      direction: "outgoing",
      text: "Perfeito. Pode mandar por aqui que eu organizo no moodboard do editorial.",
      time: "16:26",
    },
  ],
  "3": [
    {
      id: "3-welcome",
      direction: "incoming",
      text: "Terminei de escolher as 30 fotos 💛",
      time: "18:04",
    },
    {
      id: "3-reply",
      direction: "outgoing",
      text: "Recebi a seleção! Agora começo a edição e aviso assim que estiver pronta.",
      time: "18:12",
    },
  ],
};

function nowTime() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

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
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [approved, setApproved] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [messages, setMessages] = useStoredJsonState<DemoMessages>(
    storageKeys.whatsappDemoMessages,
    initialMessages,
  );
  const messageEndRef = useRef<HTMLDivElement>(null);
  const selected = conversations.find((item) => item.id === selectedId) ?? conversations[0];
  const selectedMessages =
    messages[String(selectedId)] ?? initialMessages[String(selectedId)] ?? [];
  const filtered = conversations.filter((item) =>
    `${item.name} ${item.message}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const suggestions = useMemo(
    () =>
      selectedId === 1
        ? [
            {
              id: "lead",
              icon: "plus" as const,
              title: "Criar cliente",
              detail: "Juliana & Rafael · casamento",
              sensitive: false,
            },
            {
              id: "date",
              icon: "agenda" as const,
              title: "Reservar data",
              detail: "12 de outubro · aguardando confirmação",
              sensitive: false,
            },
            {
              id: "quote",
              icon: "quotes" as const,
              title: "Preparar orçamento",
              detail: "Pacote Essência",
              sensitive: true,
            },
          ]
        : selectedId === 3
          ? [
              {
                id: "selection",
                icon: "works" as const,
                title: "Atualizar trabalho",
                detail: "Marcar seleção como concluída",
                sensitive: false,
              },
              {
                id: "reply",
                icon: "send" as const,
                title: "Preparar resposta",
                detail: "Agradecer e informar o prazo de edição",
                sensitive: true,
              },
            ]
          : [
              {
                id: "references",
                icon: "gallery" as const,
                title: "Adicionar referências",
                detail: "Vincular ao moodboard do editorial",
                sensitive: false,
              },
            ],
    [selectedId],
  );

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedId, selectedMessages.length]);

  const selectConversation = (id: number) => {
    setSelectedId(id);
    setMobileChatOpen(true);
    setAssistantOpen(false);
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draftMessage.trim();
    if (!text) return;

    const message: DemoMessage = {
      id: `${selectedId}-${Date.now()}`,
      direction: "outgoing",
      text,
      time: nowTime(),
    };
    setMessages((current) => ({
      ...current,
      [String(selectedId)]: [...(current[String(selectedId)] ?? []), message],
    }));
    setDraftMessage("");
    toast("Mensagem adicionada somente nesta demonstração");
  };

  const previewFor = (chat: Conversation) => {
    const chatMessages = messages[String(chat.id)];
    return chatMessages?.at(-1)?.text ?? chat.message;
  };

  return (
    <div className={`wa-view ${mobileChatOpen ? "mobile-chat-open" : ""}`}>
      <header className="wa-compact-heading">
        <div className="wa-title-row">
          <span className="wa-title-icon">
            <RevelarIcon name="whatsapp" />
          </span>
          <div>
            <p>ATENDIMENTO</p>
            <h1>WhatsApp e IA</h1>
          </div>
          <span className="wa-demo-pill">Demonstração</span>
        </div>
        <p className="wa-demo-copy">
          Caixa de entrada de teste · {works.length} trabalhos disponíveis para vínculo
        </p>
        <button
          type="button"
          className="wa-connect"
          onClick={() =>
            toast("A conexão oficial será ativada com as credenciais da Meta Business")
          }
        >
          <RevelarIcon name="whatsapp" />
          Conectar WhatsApp Business
        </button>
      </header>

      <div className="wa-layout">
        <aside className="wa-inbox" aria-label="Conversas">
          <div className="wa-inbox-heading">
            <div>
              <strong>Conversas</strong>
              <small>{conversations.length} atendimentos</small>
            </div>
            <button
              type="button"
              aria-label="Nova conversa"
              onClick={() => toast("Nova conversa de demonstração")}
            >
              <RevelarIcon name="plus" />
            </button>
          </div>
          <label className="wa-search">
            <RevelarIcon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar conversa"
              aria-label="Buscar conversa"
            />
          </label>
          <div className="wa-conversation-list">
            {filtered.map((chat) => (
              <button
                type="button"
                key={chat.id}
                className={selectedId === chat.id ? "active" : ""}
                onClick={() => selectConversation(chat.id)}
              >
                <i>{chat.name.slice(0, 2).toUpperCase()}</i>
                <span>
                  <strong>{chat.name}</strong>
                  <small>{previewFor(chat)}</small>
                  <em>{chat.tag}</em>
                </span>
                <time>{chat.time}</time>
                {chat.unread > 0 && <b>{chat.unread}</b>}
              </button>
            ))}
            {filtered.length === 0 && <p className="wa-empty">Nenhuma conversa encontrada.</p>}
          </div>
        </aside>

        <section className="wa-chat" aria-label={`Conversa com ${selected.name}`}>
          <header>
            <button
              type="button"
              className="wa-mobile-back"
              onClick={() => {
                setMobileChatOpen(false);
                setAssistantOpen(false);
              }}
              aria-label="Voltar para conversas"
            >
              <RevelarIcon name="back" />
            </button>
            <i>{selected.name.slice(0, 2).toUpperCase()}</i>
            <div>
              <strong>{selected.name}</strong>
              <span>
                {clients.find((client) => client.id === selected.clientId)?.whatsapp ||
                  "Novo contato"}
              </span>
            </div>
            <button
              type="button"
              className="wa-more"
              aria-label="Mais opções da conversa"
              onClick={() => toast("Opções da conversa abertas na demonstração")}
            >
              <RevelarIcon name="more" />
            </button>
          </header>
          <div className="wa-messages" aria-live="polite">
            <span>HOJE</span>
            {selectedMessages.map((message) => (
              <p key={message.id} className={message.direction}>
                {message.text}
                <time>{message.time}</time>
              </p>
            ))}
            <div ref={messageEndRef} />
          </div>
          <form onSubmit={sendMessage}>
            <button
              type="button"
              aria-label="Adicionar anexo"
              onClick={() => toast("Anexos serão conectados ao armazenamento na próxima fase")}
            >
              <RevelarIcon name="plus" />
            </button>
            <input
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder="Escreva uma mensagem"
              aria-label="Mensagem"
            />
            <button type="submit" aria-label="Enviar mensagem" disabled={!draftMessage.trim()}>
              <RevelarIcon name="send" />
            </button>
          </form>
        </section>

        {assistantOpen && (
          <button
            type="button"
            className="wa-assistant-backdrop"
            onClick={() => setAssistantOpen(false)}
            aria-label="Fechar Assistente Revelar"
          />
        )}
        <aside className={`ai-panel ${assistantOpen ? "mobile-open" : ""}`}>
          <div className="ai-title">
            <span>
              <RevelarIcon name="sparkle" />
            </span>
            <div>
              <strong>Assistente Revelar</strong>
              <small>{suggestions.length} ações encontradas nesta conversa</small>
            </div>
            <button
              type="button"
              className="ai-mobile-close"
              onClick={() => setAssistantOpen(false)}
              aria-label="Fechar assistente"
            >
              ×
            </button>
          </div>
          <div className="ai-summary">
            <span>RESUMO</span>
            <p>
              {selectedId === 1
                ? "Casal interessado no pacote Essência para casamento em 12 de outubro. Ainda falta confirmar local e horário."
                : selectedId === 3
                  ? "A cliente concluiu a seleção de 30 fotos. O trabalho pode avançar para a etapa de edição."
                  : "As referências da próxima coleção estão prontas e podem ser vinculadas ao moodboard do editorial."}
            </p>
          </div>
          <div className="ai-actions">
            {suggestions.map((suggestion) => {
              const approvalId = `${selectedId}-${suggestion.id}`;
              const isDone = approved.includes(approvalId);
              return (
                <article key={suggestion.id} className={isDone ? "done" : ""}>
                  <i>
                    <RevelarIcon name={suggestion.icon} />
                  </i>
                  <div>
                    <strong>{suggestion.title}</strong>
                    <small>{suggestion.detail}</small>
                    {suggestion.sensitive && <em>EXIGE CONFIRMAÇÃO</em>}
                  </div>
                  {isDone ? (
                    <b>✓</b>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setApproved((current) => [...current, approvalId]);
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
              );
            })}
          </div>
          <small className="ai-privacy">
            A IA nunca envia mensagens nem altera dados importantes sem confirmação.
          </small>
        </aside>

        <button
          type="button"
          className="wa-assistant-toggle"
          onClick={() => setAssistantOpen(true)}
          aria-expanded={assistantOpen}
        >
          <RevelarIcon name="sparkle" />
          <span>Assistente</span>
          <b>{suggestions.length}</b>
        </button>
      </div>
    </div>
  );
}
