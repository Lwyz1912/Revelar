import { useEffect, useState } from "react";
import { greetingForHour, hourInTimeZone, type DashboardOverview } from "@/lib/dashboard";
import { agendaDateLabel, todayIso } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import type { AppSection, Currency, Work } from "@/types/revelar";

const inactiveStatuses = new Set<Work["status"]>(["completed", "archived", "cancelled"]);

type ScheduleItem = {
  id: string;
  date: string;
  title: string;
  meta: string;
  color: "gold" | "green" | "rose";
  work: Work;
};

function scheduleItems(works: Work[], today: string, featuredId?: number): ScheduleItem[] {
  return works
    .filter((work) => !inactiveStatuses.has(work.status))
    .flatMap((work): ScheduleItem[] => {
      const items: ScheduleItem[] = [];

      if (work.id !== featuredId && work.date >= today) {
        items.push({
          id: `session-${work.id}`,
          date: work.date,
          title: work.title,
          meta: `${work.time || "Horário a definir"} · ${work.location || "Local a definir"}`,
          color: "gold",
          work,
        });
      }

      if (work.deliveryDate >= today) {
        items.push({
          id: `delivery-${work.id}`,
          date: work.deliveryDate,
          title: `Entrega · ${work.title}`,
          meta: "Prazo de entrega",
          color: "rose",
          work,
        });
      }

      return items;
    })
    .sort((first, second) => first.date.localeCompare(second.date))
    .slice(0, 3);
}

function dateParts(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return {
    day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(date)
      .replace(".", "")
      .toLocaleUpperCase("pt-BR"),
  };
}

type SessionWeather = {
  current?: { temperature?: number; label: string; code?: number };
  label?: string;
  rain?: number;
  reason?: string;
};

function SessionForecast({ location, date }: { location?: string; date?: string }) {
  const [weather, setWeather] = useState<SessionWeather>();

  useEffect(() => {
    if (!location || location === "A definir" || !date) return;
    const sessionDate = date;
    const sessionLocation = location;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    async function load() {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(sessionLocation)}`,
        options,
      );
      if (!response.ok) throw new Error();
      const { results } = (await response.json()) as {
        results?: { latitude: number; longitude: number }[];
      };
      const place = results?.[0];
      if (!place) {
        setWeather({ reason: "Local não encontrado para consultar o clima." });
        return;
      }
      const query = new URLSearchParams({
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        date: sessionDate,
        current: "1",
      });
      const forecast = await fetch(`/api/weather?${query}`, options);
      if (!forecast.ok) throw new Error();
      const data = (await forecast.json()) as SessionWeather;
      if (!controller.signal.aborted) setWeather(data);
    }
    void load().catch(() => {
      if (!controller.signal.aborted) setWeather({ reason: "Clima indisponível no momento." });
    });
    return () => controller.abort();
  }, [location, date]);

  const code = weather?.current?.code;
  let symbol = "—";
  if (code === 0) symbol = "☀";
  if (code === 1 || code === 2) symbol = "⛅︎";
  if (code === 3 || code === 45 || code === 48) symbol = "☁";
  if (code !== undefined && [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    symbol = "🌧︎";
  if (code !== undefined && [71, 73, 75, 77, 85, 86].includes(code)) symbol = "🌨︎";
  if (code !== undefined && [95, 96, 99].includes(code)) symbol = "⛈︎";

  return (
    <>
      <div className="weather-top">
        <div>
          <p>PLANEJAMENTO EXTERNO</p>
          <h2>Antes de sair</h2>
        </div>
        <span aria-hidden="true">{symbol}</span>
      </div>
      <div className="weather-facts">
        <div>
          <p>
            Local<strong>{location || "A definir"}</strong>
          </p>
        </div>
        {location && location !== "A definir" && date ? (
          <div>
            <p>
              Tempo agora
              <strong>
                {typeof weather?.current?.temperature === "number"
                  ? `${Math.round(weather.current.temperature)} °C · ${weather.current.label}`
                  : weather
                    ? "Indisponível"
                    : "Consultando…"}
              </strong>
            </p>
            <p>
              Na data da sessão
              <strong>
                {typeof weather?.rain === "number"
                  ? `${weather.rain}% de chance de chuva`
                  : weather?.label || weather?.reason || "Consultando…"}
              </strong>
            </p>
          </div>
        ) : (
          <div>
            <p>
              Previsão<strong>Local a definir</strong>
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function FinanceSummary({
  overview,
  currency,
  open,
}: {
  overview: DashboardOverview;
  currency: Currency;
  open: () => void;
}) {
  const [selected, select] = useState<string>();
  const [hovered, hover] = useState<string>();
  const active = hovered ?? selected;
  const items = [
    { id: "income", label: "Recebido no mês", value: overview.receivedThisMonth },
    { id: "expense", label: "Gastos pagos no mês", value: overview.spentThisMonth },
    { id: "pending", label: "A receber · total", value: overview.pendingIncome },
  ];
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const highlighted = items.find((item) => item.id === active);
  let offset = 0;

  return (
    <section className="card finance-summary" aria-label="Resumo financeiro">
      <div className="card-heading compact">
        <h2>Resumo financeiro</h2>
        <button className="text-button" type="button" onClick={open}>
          Ver financeiro ›
        </button>
      </div>
      <div className="finance-summary-body">
        <div className="finance-ring">
          <svg viewBox="0 0 160 160" aria-hidden="true">
            <circle cx="80" cy="80" r="66" fill="none" stroke="var(--border)" strokeWidth="16" />
            {items
              .filter((item) => item.value > 0)
              .map((item) => {
                const length = (item.value / total) * 100;
                const start = offset;
                offset += length;
                return (
                  <circle
                    key={item.id}
                    className={`finance-${item.id}`}
                    cx="80"
                    cy="80"
                    r="66"
                    pathLength="100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={active === item.id ? 21 : 16}
                    strokeDasharray={`${length} ${100 - length}`}
                    strokeDashoffset={-start}
                    transform="rotate(-90 80 80)"
                    opacity={active && active !== item.id ? 0.35 : 1}
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") hover(item.id);
                    }}
                    onPointerLeave={() => hover(undefined)}
                    onClick={() => select(selected === item.id ? undefined : item.id)}
                  />
                );
              })}
          </svg>
          <div className="finance-ring-label" aria-live="polite">
            <small>{highlighted?.label ?? "Saldo do mês"}</small>
            <strong>
              {formatMoney(
                highlighted?.value ?? overview.receivedThisMonth - overview.spentThisMonth,
                currency,
              )}
            </strong>
          </div>
        </div>
        <div className="finance-legend">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={selected === item.id}
              data-active={active === item.id}
              onMouseEnter={() => hover(item.id)}
              onMouseLeave={() => hover(undefined)}
              onFocus={() => hover(item.id)}
              onBlur={() => hover(undefined)}
              onClick={() => select(selected === item.id ? undefined : item.id)}
            >
              <span className={`finance-${item.id}`} aria-hidden="true">
                ●
              </span>
              <span>{item.label}</span>
              <strong>{formatMoney(item.value, currency)}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Dashboard({
  overview,
  currency,
  works,
  navigate,
  onOpenWork,
  onNewWork,
  onNewClient,
  onCreateDemoWork,
}: {
  overview: DashboardOverview;
  currency: Currency;
  works: Work[];
  navigate: (label: AppSection) => void;
  onOpenWork: (work: Work) => void;
  onNewWork: () => void;
  onNewClient: () => void;
  onCreateDemoWork: () => void;
}) {
  const today = todayIso();
  const todayLabel = agendaDateLabel(today, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).toLocaleUpperCase("pt-BR");
  const editingWorks = works
    .filter(
      (work) => !inactiveStatuses.has(work.status) && work.photos.selected > work.photos.edited,
    )
    .sort((first, second) => first.deliveryDate.localeCompare(second.deliveryDate))
    .slice(0, 3);
  const nextWork = overview.nextWork;
  const upcoming = scheduleItems(works, today, nextWork?.id);
  const nextLocation = nextWork?.location.trim();
  const mapLocation = nextLocation;
  const mapQuery = mapLocation ? encodeURIComponent(mapLocation) : "";
  const completedStages = nextWork?.stages.filter((stage) => stage.done).length || 0;
  const stageProgress = nextWork?.stages.length
    ? Math.round((completedStages / nextWork.stages.length) * 100)
    : 0;

  const priorities = works
    .filter((work) => !inactiveStatuses.has(work.status))
    .flatMap((work) => {
      const items = [];
      if (work.deliveryDate && work.deliveryDate <= today) {
        items.push({
          work,
          label: work.deliveryDate < today ? "Entrega atrasada" : "Entrega hoje",
        });
      }
      if (work.contract?.status === "sent") {
        items.push({ work, label: "Aguardando assinatura" });
      }
      return items;
    })
    .sort(
      (first, second) =>
        Number(second.label !== "Aguardando assinatura") -
        Number(first.label !== "Aguardando assinatura"),
    )
    .slice(0, 3);

  return (
    <div className="dashboard">
      <section className="welcome-row">
        <div>
          <p>{todayLabel}</p>
          <h1>{greetingForHour(hourInTimeZone())}, Maryana</h1>
          <span>Aqui está o que precisa da sua atenção hoje.</span>
        </div>
        <button className="primary-button desktop-new" type="button" onClick={onNewWork}>
          ＋ Novo trabalho
        </button>
      </section>

      <section className="quick-start card" aria-label="Guia rápido">
        <div className="quick-start-copy">
          <p>COMECE POR AQUI</p>
          <h2>Qual é o próximo passo?</h2>
          <span>Escolha uma ação e o Revelar leva você direto ao lugar certo.</span>
        </div>
        <div className="quick-start-actions">
          <button type="button" onClick={onNewClient}>
            <b>1</b>
            <span>
              <strong>Cadastrar cliente</strong>
              <small>Primeiro contato</small>
            </span>
          </button>
          <button type="button" onClick={() => navigate("Orçamentos")}>
            <b>2</b>
            <span>
              <strong>Montar orçamento</strong>
              <small>Proposta personalizada</small>
            </span>
          </button>
          <button type="button" onClick={() => navigate("Agenda")}>
            <b>3</b>
            <span>
              <strong>Organizar agenda</strong>
              <small>Sessões e prazos</small>
            </span>
          </button>
        </div>
      </section>

      <section className="card deadline-alerts" aria-labelledby="dashboard-priorities-title">
        <div className="card-heading compact">
          <div>
            <p>PRAZOS E CONTRATOS</p>
            <h2 id="dashboard-priorities-title">Precisa de atenção</h2>
          </div>
          <button className="text-button" type="button" onClick={() => navigate("Trabalhos")}>
            Ver trabalhos ›
          </button>
        </div>
        <div className="deadline-alert-list">
          {priorities.length ? (
            priorities.map(({ work, label }) => (
              <button key={`${work.id}-${label}`} type="button" onClick={() => onOpenWork(work)}>
                <span
                  className={`deadline-dot ${label === "Entrega atrasada" ? "late" : "soon"}`}
                />
                <span>
                  <strong>{work.title}</strong>
                  <small>{label}</small>
                </span>
                <b aria-hidden="true">›</b>
              </button>
            ))
          ) : (
            <p className="empty-copy">Nenhuma entrega urgente ou assinatura pendente.</p>
          )}
        </div>
      </section>

      <section className="dashboard-grid first-grid">
        <div className="dashboard-main-stack">
          <article className="card next-job">
            {nextWork ? (
              <>
                <div className="card-heading">
                  <div>
                    <p>PRÓXIMO TRABALHO</p>
                    <h2>{nextWork.title}</h2>
                    <span>
                      {formatDate(nextWork.date)}
                      {nextWork.time ? `, ${nextWork.time}` : ""} ·{" "}
                      {nextWork.location || "Local a definir"}
                    </span>
                  </div>
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => onOpenWork(nextWork)}
                  >
                    Ver detalhes <b>›</b>
                  </button>
                </div>
                {nextWork.stages.length > 0 && (
                  <>
                    <div className="progress-title">
                      <span>
                        Preparação · {completedStages}/{nextWork.stages.length} etapas
                      </span>
                      <strong>{stageProgress}%</strong>
                    </div>
                    <div className="progress">
                      <i style={{ width: `${stageProgress}%` }} />
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="dashboard-empty">
                <p>PRÓXIMO TRABALHO</p>
                <h2>Sua agenda futura está livre</h2>
                <span>Crie um trabalho ou converta um orçamento aprovado.</span>
                <button className="outline-button" type="button" onClick={onNewWork}>
                  Criar trabalho
                </button>
                <button className="text-button" type="button" onClick={onCreateDemoWork}>
                  Criar ensaio de teste em Caruaru
                </button>
              </div>
            )}
          </article>
          <FinanceSummary
            overview={overview}
            currency={currency}
            open={() => navigate("Financeiro")}
          />
        </div>
        <article className="card weather">
          <SessionForecast
            key={`${nextLocation}-${nextWork?.date}`}
            location={nextLocation}
            date={nextWork?.date}
          />
          {mapQuery && (
            <div className="dashboard-next-map">
              <iframe
                title={`Mapa do próximo trabalho`}
                src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <a
                className="outline-button"
                href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir rota ↗
              </a>
            </div>
          )}
          {!mapQuery && (
            <p className="weather-note">
              {nextWork
                ? "Informe o local do trabalho para abrir o mapa."
                : "O mapa aparece quando houver uma sessão agendada com local."}
            </p>
          )}
        </article>
      </section>

      <section className="dashboard-grid second-grid">
        <article className="card editing-flow">
          <div className="card-heading compact">
            <div>
              <p>FLUXO DE EDIÇÃO</p>
              <h2>Trabalhos em andamento</h2>
            </div>
            <button className="text-button" type="button" onClick={() => navigate("Trabalhos")}>
              Ver todos ›
            </button>
          </div>
          <div className="jobs-list">
            {editingWorks.length ? (
              editingWorks.map((work) => {
                const total = work.photos.selected;
                const edited = work.photos.edited;
                const progress = total ? Math.round((edited / total) * 100) : 0;
                return (
                  <button
                    className="job-row"
                    type="button"
                    key={work.id}
                    onClick={() => onOpenWork(work)}
                  >
                    <span className="progress-title">
                      <span>{work.title}</span>
                      <strong>
                        {edited}/{total}
                      </strong>
                    </span>
                    <span className="progress">
                      <i style={{ width: `${progress}%` }} />
                    </span>
                    <small>Entrega: {formatDate(work.deliveryDate)}</small>
                  </button>
                );
              })
            ) : (
              <p className="empty-copy">Nenhum trabalho aguardando edição.</p>
            )}
          </div>
        </article>

        <article className="card agenda-card">
          <div className="card-heading compact">
            <div>
              <p>AGENDA PRÓXIMA</p>
              <h2>Próximos compromissos</h2>
            </div>
            <button className="text-button" type="button" onClick={() => navigate("Agenda")}>
              Calendário ›
            </button>
          </div>
          <div className="appointment-list">
            {upcoming.length ? (
              upcoming.map((item) => {
                const date = dateParts(item.date);
                return (
                  <button type="button" key={item.id} onClick={() => onOpenWork(item.work)}>
                    <span className={`date-box ${item.color}`}>
                      <small>{date.month}</small>
                      <strong>{date.day}</strong>
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.meta}</small>
                    </span>
                    <b>›</b>
                  </button>
                );
              })
            ) : (
              <p className="empty-copy">Sem próximos compromissos.</p>
            )}
          </div>
        </article>
      </section>

      <section className="metrics" aria-label="Resumo do estúdio">
        <article className="metric-card">
          <span className="metric-icon green">
            <img src="/brand/revelar-icons-svg-monocromatico/04-agenda.svg" alt="" />
          </span>
          <div>
            <p>ENSAIOS HOJE</p>
            <strong>{overview.todayJobs}</strong>
            <small>
              {nextWork
                ? `Próximo: ${formatDate(nextWork.date)}${nextWork.time ? ` às ${nextWork.time}` : ""}`
                : "Nenhum trabalho futuro"}
            </small>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon gold">
            <img src="/brand/revelar-icons-svg-monocromatico/10-fotografias.svg" alt="" />
          </span>
          <div>
            <p>FOTOS PARA EDITAR</p>
            <strong>{overview.photosToEdit.toLocaleString("pt-BR")}</strong>
            <small>
              Em {editingWorks.length} {editingWorks.length === 1 ? "trabalho" : "trabalhos"}
            </small>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon rose">
            <img src="/brand/revelar-icons-svg-monocromatico/11-entrega.svg" alt="" />
          </span>
          <div>
            <p>ENTREGAS PENDENTES</p>
            <strong>{overview.pendingDeliveries}</strong>
            <small>{overview.urgentDeliveries.length} exigem atenção</small>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon green">
            <img src="/brand/revelar-icons-svg-monocromatico/06-pagamentos.svg" alt="" />
          </span>
          <div>
            <p>A RECEBER</p>
            <strong>{formatMoney(overview.pendingIncome, currency)}</strong>
            <small>
              {overview.pendingIncomeCount}{" "}
              {overview.pendingIncomeCount === 1 ? "valor" : "valores"}
            </small>
          </div>
        </article>
      </section>
    </div>
  );
}
