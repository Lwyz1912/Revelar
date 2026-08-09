"use client";

import { useMemo, useState } from "react";
import { achievementCategories, achievementTiers } from "@/lib/achievements";
import { formatDate } from "@/lib/format";
import type { AchievementEvaluation } from "@/lib/achievements";
import type {
  AchievementCategory,
  AchievementTier,
  AchievementUnlock,
  DiaryEntry,
  Work,
} from "@/types/revelar";

export function DiaryView({
  entries,
  setEntries,
  works,
  achievements,
  achievementUnlocks,
  toast,
}: {
  entries: DiaryEntry[];
  setEntries: React.Dispatch<React.SetStateAction<DiaryEntry[]>>;
  works: Work[];
  achievements: AchievementEvaluation[];
  achievementUnlocks: AchievementUnlock[];
  toast: (message: string) => void;
}) {
  const [tab, setTab] = useState<"diary" | "timeline" | "achievements">("diary");
  const [writing, setWriting] = useState(false);
  const [category, setCategory] = useState<"Todas" | AchievementCategory>("Todas");
  const [tier, setTier] = useState<"Todos" | AchievementTier>("Todos");
  const [achievementSearch, setAchievementSearch] = useState("");
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const achievementById = useMemo(
    () => new Map(achievements.map((achievement) => [achievement.id, achievement])),
    [achievements],
  );
  const timeline = useMemo(
    () =>
      [
        ...entries.map((entry) => ({
          id: entry.id,
          date: entry.date,
          type: "Diário",
          title: entry.title,
          detail: entry.body,
          icon: "✎",
        })),
        ...works.map((work) => ({
          id: `work-${work.id}`,
          date: work.date,
          type: work.status === "completed" ? "Entrega" : "Trabalho",
          title: work.title,
          detail: `${work.category} · ${work.location}`,
          icon: work.status === "completed" ? "✓" : "◇",
        })),
        ...achievementUnlocks.flatMap((unlock) => {
          const achievement = achievementById.get(unlock.id);
          if (!achievement) return [];
          return [
            {
              id: `achievement-${unlock.id}`,
              date: unlock.unlockedAt.slice(0, 10),
              type: "Conquista",
              title: achievement.title,
              detail: `${achievement.tier} · ${achievement.category}${
                unlock.retroactive ? " · Reconhecida a partir do histórico" : ""
              }`,
              icon: achievement.icon,
            },
          ];
        }),
      ].sort((a, b) => b.date.localeCompare(a.date)),
    [achievementById, achievementUnlocks, entries, works],
  );
  const visibleAchievements = useMemo(() => {
    const query = achievementSearch.trim().toLocaleLowerCase("pt-BR");
    return achievements.filter((achievement) => {
      if (category !== "Todas" && achievement.category !== category) return false;
      if (tier !== "Todos" && achievement.tier !== tier) return false;
      if (!query) return true;
      const searchable =
        achievement.secret && !achievement.unlocked
          ? `${achievement.category} ${achievement.tier} secreta`
          : `${achievement.title} ${achievement.description} ${achievement.category} ${achievement.tier}`;
      return searchable.toLocaleLowerCase("pt-BR").includes(query);
    });
  }, [achievementSearch, achievements, category, tier]);

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
                {unlockedCount}/{achievements.length}
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
              <i>{item.icon}</i>
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
        <>
          <section className="achievement-overview">
            <div>
              <span>PROGRESSO PROFISSIONAL</span>
              <strong>
                {unlockedCount} de {achievements.length}
              </strong>
              <p>As conquistas são reconhecidas automaticamente pelos dados do Revelar.</p>
            </div>
            <div
              className="achievement-overview-bar"
              aria-label={`${unlockedCount} de ${achievements.length} conquistas`}
            >
              <b style={{ width: `${(unlockedCount / achievements.length) * 100}%` }} />
            </div>
          </section>
          <section className="achievement-controls" aria-label="Filtros de conquistas">
            <div className="achievement-category-filter">
              {(["Todas", ...achievementCategories] as const).map((item) => (
                <button
                  key={item}
                  className={category === item ? "active" : ""}
                  onClick={() => setCategory(item)}
                >
                  {item}
                  {item !== "Todas" && (
                    <b>
                      {
                        achievements.filter(
                          (achievement) => achievement.category === item && achievement.unlocked,
                        ).length
                      }
                      /{achievements.filter((achievement) => achievement.category === item).length}
                    </b>
                  )}
                </button>
              ))}
            </div>
            <div className="achievement-search-row">
              <label>
                <span>Buscar conquista</span>
                <input
                  value={achievementSearch}
                  onChange={(event) => setAchievementSearch(event.target.value)}
                  placeholder="Nome, categoria ou nível"
                />
              </label>
              <label>
                <span>Nível</span>
                <select
                  value={tier}
                  onChange={(event) => setTier(event.target.value as "Todos" | AchievementTier)}
                >
                  <option>Todos</option>
                  {achievementTiers.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>
          <section className="achievement-grid">
            {visibleAchievements.map((item) => {
              const hidden = Boolean(item.secret && !item.unlocked);
              const percentage = item.goal ? Math.min(100, (item.progress / item.goal) * 100) : 0;
              return (
                <article
                  key={item.id}
                  className={`${item.unlocked ? "unlocked" : "locked"} tier-${item.tier.toLocaleLowerCase("pt-BR")} ${hidden ? "secret" : ""}`}
                >
                  <div className="achievement-card-top">
                    <i>{hidden ? "?" : item.icon}</i>
                    <em>{item.tier}</em>
                  </div>
                  <span>
                    {item.unlocked
                      ? "CONQUISTA DESBLOQUEADA"
                      : hidden
                        ? "CONQUISTA SECRETA"
                        : `${item.progress.toLocaleString("pt-BR")} DE ${item.goal.toLocaleString("pt-BR")}`}
                  </span>
                  <h2>{hidden ? "Conquista secreta" : item.title}</h2>
                  <p>
                    {hidden
                      ? "Continue registrando sua trajetória para revelar este marco."
                      : item.description}
                  </p>
                  <small>{item.category}</small>
                  <div className="achievement-progress">
                    <b style={{ width: `${hidden ? 0 : percentage}%` }} />
                  </div>
                </article>
              );
            })}
          </section>
          {visibleAchievements.length === 0 && (
            <p className="achievement-empty">Nenhuma conquista corresponde a estes filtros.</p>
          )}
        </>
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
