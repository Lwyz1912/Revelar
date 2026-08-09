"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import type { Client, DiaryEntry, Work } from "@/types/revelar";

export function DiaryView({
  entries,
  setEntries,
  works,
  clients,
  toast,
}: {
  entries: DiaryEntry[];
  setEntries: React.Dispatch<React.SetStateAction<DiaryEntry[]>>;
  works: Work[];
  clients: Client[];
  toast: (message: string) => void;
}) {
  const [tab, setTab] = useState<"diary" | "timeline" | "achievements">("diary");
  const [writing, setWriting] = useState(false);
  const completed = works.filter((work) => work.status === "completed").length;
  const achievements = [
    {
      icon: "◇",
      title: "Primeira revelação",
      description: "Concluir o primeiro trabalho",
      unlocked: completed >= 1,
      progress: Math.min(completed, 1),
      goal: 1,
    },
    {
      icon: "✦",
      title: "Histórias em série",
      description: "Cadastrar 10 trabalhos",
      unlocked: works.length >= 10,
      progress: Math.min(works.length, 10),
      goal: 10,
    },
    {
      icon: "♡",
      title: "Olhar de confiança",
      description: "Ter 3 clientes recorrentes",
      unlocked: clients.filter((client) => client.workCount >= 2).length >= 3,
      progress: Math.min(clients.filter((client) => client.workCount >= 2).length, 3),
      goal: 3,
    },
    {
      icon: "✓",
      title: "Tudo no prazo",
      description: "Entregar 5 trabalhos",
      unlocked: completed >= 5,
      progress: Math.min(completed, 5),
      goal: 5,
    },
    {
      icon: "◎",
      title: "Mapa de memórias",
      description: "Fotografar em 5 locais",
      unlocked: false,
      progress: 3,
      goal: 5,
    },
    {
      icon: "☼",
      title: "Temporada de casamentos",
      description: "Concluir 5 casamentos",
      unlocked:
        works.filter((work) => work.category === "Casamento" && work.status === "completed")
          .length >= 5,
      progress: Math.min(
        works.filter((work) => work.category === "Casamento" && work.status === "completed").length,
        5,
      ),
      goal: 5,
    },
  ];
  const timeline = useMemo(
    () =>
      [
        ...entries.map((entry) => ({
          id: entry.id,
          date: entry.date,
          type: "Diário",
          title: entry.title,
          detail: entry.body,
        })),
        ...works.map((work) => ({
          id: `work-${work.id}`,
          date: work.date,
          type: work.status === "completed" ? "Entrega" : "Trabalho",
          title: work.title,
          detail: `${work.category} · ${work.location}`,
        })),
      ].sort((a, b) => b.date.localeCompare(a.date)),
    [entries, works],
  );
  return (
    <div className="diary-view">
      <header className="diary-heading">
        <div>
          <p>TRAJETÓRIA DA FOTÓGRAFA</p>
          <h1>Diário</h1>
          <span>Memórias, aprendizados e marcos em um só lugar.</span>
        </div>
        <button className="primary-button" onClick={() => setWriting(true)}>
          ＋ Nova entrada
        </button>
      </header>
      <nav className="diary-tabs">
        {(
          [
            ["diary", "Diário"],
            ["timeline", "Linha do tempo"],
            ["achievements", "Conquistas"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {label}
            {id === "achievements" && (
              <b>
                {achievements.filter((item) => item.unlocked).length}/{achievements.length}
              </b>
            )}
          </button>
        ))}
      </nav>
      {tab === "diary" && (
        <section className="diary-grid">
          {entries.map((entry) => (
            <article key={entry.id}>
              <div>
                <span>{entry.mood}</span>
                <time>{formatDate(entry.date)}</time>
              </div>
              <h2>{entry.title}</h2>
              <p>{entry.body}</p>
              {entry.workId && (
                <small>{works.find((work) => work.id === entry.workId)?.title}</small>
              )}
            </article>
          ))}
        </section>
      )}
      {tab === "timeline" && (
        <section className="story-timeline">
          {timeline.map((item) => (
            <article key={item.id}>
              <time>{formatDate(item.date)}</time>
              <i>{item.type === "Diário" ? "✎" : item.type === "Entrega" ? "✓" : "◇"}</i>
              <div>
                <span>{item.type}</span>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </section>
      )}
      {tab === "achievements" && (
        <section className="achievement-grid">
          {achievements.map((item) => (
            <article key={item.title} className={item.unlocked ? "unlocked" : "locked"}>
              <i>{item.icon}</i>
              <span>
                {item.unlocked ? "CONQUISTA DESBLOQUEADA" : `${item.progress} DE ${item.goal}`}
              </span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <div>
                <b style={{ width: `${(item.progress / item.goal) * 100}%` }} />
              </div>
            </article>
          ))}
        </section>
      )}
      {writing && (
        <div className="drawer-backdrop" onMouseDown={() => setWriting(false)}>
          <form
            className="diary-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const entry: DiaryEntry = {
                id: crypto.randomUUID(),
                title: String(form.get("title")),
                body: String(form.get("body")),
                date: String(form.get("date")),
                mood: String(form.get("mood")) as DiaryEntry["mood"],
                workId: Number(form.get("workId")) || undefined,
              };
              setEntries((current) => [entry, ...current]);
              setWriting(false);
              toast("Entrada adicionada ao diário");
            }}
          >
            <button className="close" type="button" onClick={() => setWriting(false)}>
              ×
            </button>
            <span>NOVA MEMÓRIA</span>
            <h2>O que vale guardar?</h2>
            <label>
              Título
              <input name="title" required />
            </label>
            <label>
              Data
              <input
                name="date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </label>
            <label>
              Clima
              <select name="mood">
                <option value="inspirada">Inspirada</option>
                <option value="orgulhosa">Orgulhosa</option>
                <option value="tranquila">Tranquila</option>
                <option value="aprendizado">Aprendizado</option>
              </select>
            </label>
            <label>
              Trabalho
              <select name="workId">
                <option value="">Nenhum</option>
                {works.map((work) => (
                  <option key={work.id} value={work.id}>
                    {work.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Texto
              <textarea name="body" rows={6} required />
            </label>
            <button className="primary-button" type="submit">
              Guardar no diário
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
