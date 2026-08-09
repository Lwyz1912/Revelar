import { type Dispatch, type FormEvent, type SetStateAction, useMemo, useState } from "react";

import { agendaKindLabels } from "@/config/labels";
import { equivalentEventTime, otherEventTimezone, statusForDate } from "@/lib/agenda";
import {
  addDays,
  agendaDateLabel,
  calendarDays,
  endTime,
  monthStart,
  startOfWeek,
  todayIso,
} from "@/lib/dates";
import { inferredStageDate } from "@/lib/works";
import type {
  AgendaEvent,
  AgendaEventKind,
  AgendaViewMode,
  Client,
  EventRecurrence,
  EventTimezone,
  Work,
} from "@/types/revelar";

export function AgendaView({
  works,
  clients,
  customEvents,
  setCustomEvents,
  initialView,
  onOpenWork,
  toast,
}: {
  works: Work[];
  clients: Client[];
  customEvents: AgendaEvent[];
  setCustomEvents: Dispatch<SetStateAction<AgendaEvent[]>>;
  initialView: AgendaViewMode;
  onOpenWork: (work: Work) => void;
  toast: (message: string) => void;
}) {
  const today = todayIso();
  const [view, setView] = useState<AgendaViewMode>(initialView);
  const [focusDate, setFocusDate] = useState(today);
  const [kindFilter, setKindFilter] = useState<"all" | AgendaEventKind>("all");
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [dayPanelOpen, setDayPanelOpen] = useState(false);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [movedDates, setMovedDates] = useState<Record<string, string>>({});
  const [conflictWarning, setConflictWarning] = useState(false);
  const [draft, setDraft] = useState<Omit<AgendaEvent, "id" | "status" | "source">>({
    title: "",
    date: today,
    start: "09:00",
    end: "10:00",
    allDay: false,
    kind: "meeting",
    timezone: "America/Recife",
    recurrence: "none",
    reminder: "1 dia antes",
    location: "",
    notes: "",
  });

  const workEvents = useMemo<AgendaEvent[]>(
    () =>
      works.flatMap((work) => {
        if (work.status === "archived" || work.status === "cancelled") return [];
        const sessionStage = work.stages.find((stage) => stage.label === "Sessão");
        const deliveryStage = work.stages.find((stage) => stage.label === "Entrega");
        const base: AgendaEvent[] = [
          {
            id: `work-${work.id}-session`,
            title: work.title,
            date: work.date,
            start: work.time || "09:00",
            end: endTime(work.time || "09:00", work.duration),
            kind: "session",
            status: statusForDate(work.date, Boolean(sessionStage?.done)),
            clientId: work.clientIds[0],
            workId: work.id,
            location: work.location,
            timezone: work.currency === "EUR" ? "Europe/Lisbon" : "America/Recife",
            recurrence: "none",
            reminder: "1 dia antes",
            external: !/studio|estúdio|video/i.test(work.location),
            source: "work",
          },
          {
            id: `work-${work.id}-delivery`,
            title: `Entrega · ${work.title}`,
            date: work.deliveryDate,
            start: "17:00",
            end: "18:00",
            kind: "delivery",
            status: statusForDate(work.deliveryDate, Boolean(deliveryStage?.done)),
            clientId: work.clientIds[0],
            workId: work.id,
            location: "Online",
            timezone: work.currency === "EUR" ? "Europe/Lisbon" : "America/Recife",
            recurrence: "none",
            reminder: "1 dia antes",
            source: "work",
          },
        ];
        const stages = work.stages
          .filter((stage) => !["Sessão", "Entrega"].includes(stage.label))
          .map((stage): AgendaEvent => {
            const date =
              stage.dueDate ||
              inferredStageDate(
                work,
                work.stages.findIndex((item) => item.id === stage.id),
              );
            const payment = stage.label.toLowerCase().includes("pagamento");
            return {
              id: `work-${work.id}-stage-${stage.id}`,
              title: `${stage.label} · ${work.title}`,
              date,
              start: payment ? "10:00" : "09:00",
              end: payment ? "10:30" : "10:00",
              kind: payment ? "payment" : "stage",
              status: statusForDate(date, stage.done),
              clientId: work.clientIds[0],
              workId: work.id,
              location: "Revelar.",
              timezone: work.currency === "EUR" ? "Europe/Lisbon" : "America/Recife",
              recurrence: "none",
              reminder: payment ? "1 dia antes" : "2 horas antes",
              source: "work",
            };
          });
        return [...base, ...stages];
      }),
    [works],
  );

  const allEvents = useMemo(() => {
    const expanded = [...workEvents, ...customEvents].flatMap((event) => {
      const occurrences: AgendaEvent[] = [
        { ...event, status: event.source === "custom" ? statusForDate(event.date) : event.status },
      ];
      if (event.recurrence === "weekly") {
        for (let index = 1; index <= 5; index += 1)
          occurrences.push({
            ...event,
            id: `${event.id}-r${index}`,
            date: addDays(event.date, index * 7),
            status: statusForDate(addDays(event.date, index * 7)),
          });
      }
      if (event.recurrence === "monthly") {
        for (let index = 1; index <= 2; index += 1) {
          const date = new Date(`${event.date}T12:00:00`);
          date.setMonth(date.getMonth() + index);
          const value = date.toISOString().slice(0, 10);
          occurrences.push({
            ...event,
            id: `${event.id}-r${index}`,
            date: value,
            status: statusForDate(value),
          });
        }
      }
      return occurrences;
    });
    return expanded.map((event) =>
      movedDates[event.id]
        ? {
            ...event,
            date: movedDates[event.id],
            status: statusForDate(movedDates[event.id], event.status === "completed"),
          }
        : event,
    );
  }, [customEvents, movedDates, workEvents]);

  const visibleEvents = useMemo(
    () =>
      allEvents
        .filter((event) => kindFilter === "all" || event.kind === kindFilter)
        .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)),
    [allEvents, kindFilter],
  );
  const currentMonth = focusDate.slice(0, 7);
  const monthDays = useMemo(() => calendarDays(focusDate), [focusDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(focusDate), index)),
    [focusDate],
  );
  const eventsForDay = (date: string) => visibleEvents.filter((event) => event.date === date);
  const clientName = (id?: number) => clients.find((client) => client.id === id)?.name;
  const workName = (id?: number) => works.find((work) => work.id === id)?.title;

  const movePeriod = (amount: number) => {
    const date = new Date(`${focusDate}T12:00:00`);
    if (view === "month") date.setMonth(date.getMonth() + amount);
    else if (view === "week") date.setDate(date.getDate() + amount * 7);
    else date.setDate(date.getDate() + amount);
    setFocusDate(date.toISOString().slice(0, 10));
  };

  const openDay = (date: string) => {
    setFocusDate(date);
    setSelectedEvent(null);
    setDayPanelOpen(true);
  };

  const openNewEvent = (date = focusDate, kind: AgendaEventKind = "meeting") => {
    setDraft({
      title: kind === "blocked" ? "Indisponível" : "",
      date,
      start: kind === "blocked" ? "00:00" : "09:00",
      end: kind === "blocked" ? "23:59" : "10:00",
      allDay: kind === "blocked",
      kind,
      timezone: "America/Recife",
      recurrence: "none",
      reminder: "1 dia antes",
      location: "",
      notes: "",
    });
    setEditingEventId(null);
    setConflictWarning(false);
    setDayPanelOpen(false);
    setNewEventOpen(true);
  };

  const baseCustomEvent = (event: AgendaEvent) =>
    customEvents.find((item) => event.id === item.id || event.id.startsWith(`${item.id}-r`));

  const openEditEvent = (event: AgendaEvent) => {
    const original = baseCustomEvent(event);
    if (!original) return;
    const { id, status, source, ...editable } = original;
    void status;
    void source;
    setDraft({ ...editable, allDay: Boolean(editable.allDay) });
    setEditingEventId(id);
    setConflictWarning(false);
    setSelectedEvent(null);
    setNewEventOpen(true);
  };

  const hasConflict = allEvents.some((event) => {
    const base = baseCustomEvent(event);
    if (editingEventId && base?.id === editingEventId) return false;
    if (event.date !== draft.date) return false;
    if (draft.allDay || event.allDay) return true;
    return event.start < draft.end && event.end > draft.start;
  });
  const invalidTime = !draft.allDay && draft.end <= draft.start;
  const saveEvent = (event: FormEvent) => {
    event.preventDefault();
    const normalizedDraft = {
      ...draft,
      title: draft.title.trim() || (draft.kind === "blocked" ? "Indisponível" : ""),
      start: draft.allDay ? "00:00" : draft.start,
      end: draft.allDay ? "23:59" : draft.end,
    };
    if (
      !normalizedDraft.title ||
      (!normalizedDraft.allDay && normalizedDraft.end <= normalizedDraft.start)
    )
      return;
    if (hasConflict && !conflictWarning) {
      setConflictWarning(true);
      return;
    }
    if (editingEventId) {
      setCustomEvents((current) =>
        current.map((item) =>
          item.id === editingEventId
            ? {
                ...item,
                ...normalizedDraft,
                status: statusForDate(normalizedDraft.date),
                source: "custom",
              }
            : item,
        ),
      );
    } else {
      setCustomEvents((current) => [
        ...current,
        {
          ...normalizedDraft,
          id: `event-${Date.now()}`,
          status: statusForDate(normalizedDraft.date),
          source: "custom",
        },
      ]);
    }
    setNewEventOpen(false);
    setEditingEventId(null);
    setFocusDate(normalizedDraft.date);
    toast(
      editingEventId
        ? "Compromisso atualizado"
        : hasConflict
          ? "Compromisso salvo mesmo com conflito de horário"
          : "Compromisso adicionado à agenda",
    );
  };

  const deleteSelectedEvent = () => {
    if (!selectedEvent) return;
    const original = baseCustomEvent(selectedEvent);
    if (!original || !window.confirm(`Excluir “${original.title}” da agenda?`)) return;
    setCustomEvents((current) => current.filter((item) => item.id !== original.id));
    setSelectedEvent(null);
    toast(
      original.recurrence === "none" ? "Compromisso excluído" : "Série de compromissos excluída",
    );
  };

  const dropEvent = (date: string, id: string) => {
    const event = allEvents.find((item) => item.id === id);
    if (!event || event.date === date) return;
    if (
      !window.confirm(
        `Mover “${event.title}” para ${agendaDateLabel(date, { day: "2-digit", month: "long" })}?`,
      )
    )
      return;
    setMovedDates((current) => ({ ...current, [id]: date }));
    toast("Data do compromisso atualizada");
  };

  const eventButton = (event: AgendaEvent, compact = false) => (
    <button
      type="button"
      key={event.id}
      draggable
      className={`calendar-event kind-${event.kind} status-${event.status} ${compact ? "compact" : ""}`}
      onDragStart={(drag) => drag.dataTransfer.setData("text/plain", event.id)}
      onClick={(click) => {
        click.stopPropagation();
        setSelectedEvent(event);
        setDayPanelOpen(false);
      }}
      title={`${event.allDay ? "Dia inteiro" : event.start} · ${event.title}`}
    >
      <span>{event.allDay ? "Dia" : event.start}</span>
      <strong>{event.title}</strong>
    </button>
  );

  const weekStartLabel = agendaDateLabel(weekDays[0], {
    day: "2-digit",
    month: "short",
  });
  const weekEndLabel = agendaDateLabel(weekDays[6], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const title =
    view === "month"
      ? agendaDateLabel(monthStart(focusDate), { month: "long", year: "numeric" })
      : view === "week"
        ? `${weekStartLabel} — ${weekEndLabel}`
        : agendaDateLabel(focusDate, {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          });

  return (
    <div className="agenda-page">
      <section className="agenda-title-row">
        <div>
          <p>ORGANIZAÇÃO</p>
          <h1>Agenda</h1>
          <span>Sessões, prazos, pagamentos e compromissos em um só calendário.</span>
        </div>
        <div className="agenda-title-actions">
          <button
            className="outline-button"
            type="button"
            onClick={() => openNewEvent(focusDate, "blocked")}
          >
            Bloquear horário
          </button>
          <button className="primary-button" type="button" onClick={() => openNewEvent()}>
            ＋ Novo compromisso
          </button>
        </div>
      </section>

      <section className="agenda-summary" aria-label="Resumo da agenda">
        <article>
          <span>HOJE</span>
          <strong>{eventsForDay(today).length}</strong>
          <small>compromissos</small>
        </article>
        <article>
          <span>PRÓXIMOS 7 DIAS</span>
          <strong>
            {
              visibleEvents.filter(
                (event) => event.date >= today && event.date <= addDays(today, 7),
              ).length
            }
          </strong>
          <small>itens na agenda</small>
        </article>
        <article>
          <span>ATENÇÃO</span>
          <strong>
            {
              visibleEvents.filter((event) => event.status === "late" || event.status === "soon")
                .length
            }
          </strong>
          <small>prazos e eventos</small>
        </article>
        <article className="working-hours">
          <span>FUSO PADRÃO</span>
          <strong>Recife · America/Recife</strong>
          <small>Lisboa disponível em cada evento</small>
        </article>
      </section>

      <section className="calendar-shell">
        <header className="calendar-toolbar">
          <div className="calendar-navigation">
            <button type="button" onClick={() => movePeriod(-1)} aria-label="Período anterior">
              ‹
            </button>
            <button type="button" className="today-button" onClick={() => setFocusDate(today)}>
              Hoje
            </button>
            <button type="button" onClick={() => movePeriod(1)} aria-label="Próximo período">
              ›
            </button>
            <h2>{title}</h2>
          </div>
          <div className="calendar-controls">
            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value as "all" | AgendaEventKind)}
              aria-label="Filtrar agenda"
            >
              <option value="all">Todos os tipos</option>
              {(Object.keys(agendaKindLabels) as AgendaEventKind[]).map((kind) => (
                <option value={kind} key={kind}>
                  {agendaKindLabels[kind]}
                </option>
              ))}
            </select>
            <div className="calendar-view-switch" aria-label="Visualização do calendário">
              {(["month", "week", "day", "list"] as AgendaViewMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={view === mode ? "active" : ""}
                  onClick={() => setView(mode)}
                >
                  {mode === "month"
                    ? "Mês"
                    : mode === "week"
                      ? "Semana"
                      : mode === "day"
                        ? "Dia"
                        : "Lista"}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="calendar-legend">
          <span>
            <i className="kind-session" />
            Sessões
          </span>
          <span>
            <i className="kind-delivery" />
            Entregas
          </span>
          <span>
            <i className="kind-payment" />
            Pagamentos
          </span>
          <span>
            <i className="kind-meeting" />
            Compromissos
          </span>
          <span>
            <i className="status-late" />
            Atrasado
          </span>
          <span>
            <i className="status-completed" />
            Concluído
          </span>
        </div>

        {view === "month" && (
          <div className="month-calendar">
            {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((day) => (
              <div className="weekday" key={day}>
                {day}
              </div>
            ))}
            {monthDays.map((date) => {
              const dayEvents = eventsForDay(date);
              const unavailable = dayEvents.some(
                (event) => event.kind === "blocked" && event.allDay,
              );
              const dayClassName = [
                "calendar-day",
                date.slice(0, 7) !== currentMonth && "outside",
                date === today && "today",
                unavailable && "unavailable",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <div
                  key={date}
                  className={dayClassName}
                  onClick={() => openDay(date)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    dropEvent(date, event.dataTransfer.getData("text/plain"));
                  }}
                >
                  <button type="button" className="day-number" onClick={() => openDay(date)}>
                    {new Date(`${date}T12:00:00`).getDate()}
                  </button>
                  <div className="day-events">
                    {dayEvents.slice(0, 3).map((event) => eventButton(event, true))}
                    {dayEvents.length > 3 && (
                      <button
                        type="button"
                        className="more-events"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDay(date);
                        }}
                      >
                        + {dayEvents.length - 3} outros
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "week" && (
          <div className="week-calendar">
            {weekDays.map((date) => (
              <section
                key={date}
                className={date === today ? "today" : ""}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => dropEvent(date, event.dataTransfer.getData("text/plain"))}
              >
                <button
                  type="button"
                  className="week-day-heading"
                  onClick={() => {
                    setFocusDate(date);
                    setView("day");
                  }}
                >
                  <span>{agendaDateLabel(date, { weekday: "short" })}</span>
                  <strong>{new Date(`${date}T12:00:00`).getDate()}</strong>
                </button>
                <div className="week-day-events">
                  {eventsForDay(date).map((event) => eventButton(event))}
                  {eventsForDay(date).length === 0 && (
                    <button
                      type="button"
                      className="empty-day-add"
                      onClick={() => openNewEvent(date)}
                    >
                      ＋ Adicionar
                    </button>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}

        {view === "day" && (
          <div className="day-agenda">
            <aside>
              <strong>{new Date(`${focusDate}T12:00:00`).getDate()}</strong>
              <span>{agendaDateLabel(focusDate, { weekday: "long", month: "long" })}</span>
              <small>
                {eventsForDay(focusDate).some((event) => event.kind === "blocked" && event.allDay)
                  ? "Dia marcado como indisponível"
                  : "Disponibilidade definida pelos compromissos"}
              </small>
            </aside>
            <div>
              {eventsForDay(focusDate).length ? (
                eventsForDay(focusDate).map((event) => (
                  <article
                    key={event.id}
                    className={`agenda-list-event kind-${event.kind} status-${event.status}`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <time>
                      {event.allDay ? "Dia inteiro" : event.start}
                      {!event.allDay && <small>{event.end}</small>}
                    </time>
                    <div>
                      <span>{agendaKindLabels[event.kind]}</span>
                      <strong>{event.title}</strong>
                      <small>
                        {event.location || "Local não informado"}
                        {clientName(event.clientId) ? ` · ${clientName(event.clientId)}` : ""}
                      </small>
                    </div>
                    <b>›</b>
                  </article>
                ))
              ) : (
                <div className="agenda-empty">
                  <span>○</span>
                  <h3>Dia livre</h3>
                  <p>Nenhum compromisso marcado.</p>
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => openNewEvent(focusDate, "blocked")}
                  >
                    Marcar indisponível
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {view === "list" && (
          <div className="agenda-list-view">
            {visibleEvents
              .filter(
                (event) =>
                  event.date >= monthStart(focusDate) &&
                  event.date < addDays(monthStart(focusDate), 40),
              )
              .map((event, index, list) => (
                <div key={event.id} className="agenda-list-group">
                  {(index === 0 || list[index - 1].date !== event.date) && (
                    <button
                      type="button"
                      className="list-date"
                      onClick={() => {
                        setFocusDate(event.date);
                        setView("day");
                      }}
                    >
                      <strong>{new Date(`${event.date}T12:00:00`).getDate()}</strong>
                      <span>{agendaDateLabel(event.date, { weekday: "long", month: "long" })}</span>
                    </button>
                  )}
                  <article
                    className={`agenda-list-event kind-${event.kind} status-${event.status}`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <time>
                      {event.allDay ? "Dia inteiro" : event.start}
                      {!event.allDay && <small>{event.end}</small>}
                    </time>
                    <div>
                      <span>{agendaKindLabels[event.kind]}</span>
                      <strong>{event.title}</strong>
                      <small>
                        {event.location || "Local não informado"}
                        {clientName(event.clientId) ? ` · ${clientName(event.clientId)}` : ""}
                      </small>
                    </div>
                    <b>›</b>
                  </article>
                </div>
              ))}
          </div>
        )}
      </section>

      {dayPanelOpen && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={() => setDayPanelOpen(false)}
        >
          <aside
            className="agenda-side-panel"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p>AGENDA DO DIA</p>
                <h2>
                  {agendaDateLabel(focusDate, { weekday: "long", day: "2-digit", month: "long" })}
                </h2>
              </div>
              <button type="button" onClick={() => setDayPanelOpen(false)}>
                ×
              </button>
            </header>
            <div className="agenda-panel-body">
              {eventsForDay(focusDate).length ? (
                eventsForDay(focusDate).map((event) => (
                  <article
                    key={event.id}
                    className={`panel-event kind-${event.kind}`}
                    onClick={() => {
                      setDayPanelOpen(false);
                      setSelectedEvent(event);
                    }}
                  >
                    <time>{event.allDay ? "Dia" : event.start}</time>
                    <div>
                      <span>{agendaKindLabels[event.kind]}</span>
                      <strong>{event.title}</strong>
                      <small>{event.location || "Sem local"}</small>
                    </div>
                    <b>›</b>
                  </article>
                ))
              ) : (
                <div className="agenda-empty">
                  <span>○</span>
                  <h3>Nenhum compromisso</h3>
                  <p>Este dia está livre na agenda.</p>
                </div>
              )}
            </div>
            <footer>
              <button
                className="outline-button"
                type="button"
                onClick={() => openNewEvent(focusDate, "blocked")}
              >
                Marcar indisponível
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => openNewEvent(focusDate)}
              >
                ＋ Adicionar neste dia
              </button>
            </footer>
          </aside>
        </div>
      )}

      {selectedEvent && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedEvent(null)}
        >
          <aside
            className="agenda-side-panel event-detail-panel"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p>{agendaKindLabels[selectedEvent.kind].toUpperCase()}</p>
                <h2>{selectedEvent.title}</h2>
              </div>
              <button type="button" onClick={() => setSelectedEvent(null)}>
                ×
              </button>
            </header>
            <div className="agenda-panel-body">
              <div className={`event-status-banner status-${selectedEvent.status}`}>
                <i />
                {selectedEvent.status === "late"
                  ? "Atrasado"
                  : selectedEvent.status === "soon"
                    ? "Próximo do prazo"
                    : selectedEvent.status === "completed"
                      ? "Concluído"
                      : "Agendado"}
              </div>
              <dl className="event-facts">
                <div>
                  <dt>Data</dt>
                  <dd>
                    {agendaDateLabel(selectedEvent.date, {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                <div>
                  <dt>Horário</dt>
                  <dd>
                    {selectedEvent.allDay
                      ? "Dia inteiro"
                      : `${selectedEvent.start}–${selectedEvent.end}`}
                  </dd>
                </div>
                <div>
                  <dt>Fuso horário</dt>
                  <dd>
                    {selectedEvent.timezone === "America/Recife"
                      ? "Recife (Brasil)"
                      : "Lisboa (Portugal)"}
                  </dd>
                </div>
                {!selectedEvent.allDay && (
                  <div>
                    <dt>No outro fuso</dt>
                    <dd>
                      {equivalentEventTime(
                        selectedEvent.date,
                        selectedEvent.start,
                        selectedEvent.timezone,
                      )}{" "}
                      em{" "}
                      {otherEventTimezone(selectedEvent.timezone) === "Europe/Lisbon"
                        ? "Lisboa"
                        : "Recife"}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Lembrete</dt>
                  <dd>{selectedEvent.reminder}</dd>
                </div>
                <div>
                  <dt>Local</dt>
                  <dd>{selectedEvent.location || "Não informado"}</dd>
                </div>
                {clientName(selectedEvent.clientId) && (
                  <div>
                    <dt>Cliente</dt>
                    <dd>{clientName(selectedEvent.clientId)}</dd>
                  </div>
                )}
                {workName(selectedEvent.workId) && (
                  <div>
                    <dt>Trabalho</dt>
                    <dd>{workName(selectedEvent.workId)}</dd>
                  </div>
                )}
              </dl>
              {selectedEvent.notes && (
                <section className="event-notes">
                  <span>OBSERVAÇÕES</span>
                  <p>{selectedEvent.notes}</p>
                </section>
              )}
              {selectedEvent.external && (
                <section className="event-weather">
                  <div>
                    <span>PREVISÃO DEMONSTRATIVA</span>
                    <strong>24° · Parcialmente nublado</strong>
                  </div>
                  <div>
                    <span>PÔR DO SOL</span>
                    <strong>17:31</strong>
                  </div>
                  <p>
                    Condições e horário serão atualizados automaticamente quando o módulo de clima
                    for conectado.
                  </p>
                </section>
              )}
            </div>
            {(selectedEvent.workId || baseCustomEvent(selectedEvent)) && (
              <footer>
                {baseCustomEvent(selectedEvent) && (
                  <>
                    <button
                      className="danger-outline-button"
                      type="button"
                      onClick={deleteSelectedEvent}
                    >
                      Excluir
                    </button>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => openEditEvent(selectedEvent)}
                    >
                      {selectedEvent.recurrence === "none" ? "Editar" : "Editar série"}
                    </button>
                  </>
                )}
                {selectedEvent.workId && (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => {
                      const work = works.find((item) => item.id === selectedEvent.workId);
                      if (work) onOpenWork(work);
                    }}
                  >
                    Abrir trabalho completo
                  </button>
                )}
              </footer>
            )}
          </aside>
        </div>
      )}

      {newEventOpen && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={() => setNewEventOpen(false)}
        >
          <aside
            className="agenda-side-panel new-event-panel"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p>
                  {editingEventId
                    ? "EDITAR"
                    : draft.kind === "blocked"
                      ? "DISPONIBILIDADE"
                      : "NOVO COMPROMISSO"}
                </p>
                <h2>
                  {editingEventId
                    ? "Atualizar compromisso"
                    : draft.kind === "blocked"
                      ? "Marcar como indisponível"
                      : "Adicionar à agenda"}
                </h2>
              </div>
              <button type="button" onClick={() => setNewEventOpen(false)}>
                ×
              </button>
            </header>
            <form onSubmit={saveEvent}>
              <div className="agenda-panel-body">
                <label className="field full">
                  <span>Título *</span>
                  <input
                    autoFocus
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                    placeholder="Ex.: Reunião com cliente"
                  />
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>Data</span>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(event) => {
                        setDraft({ ...draft, date: event.target.value });
                        setConflictWarning(false);
                      }}
                    />
                  </label>
                  <label className="field">
                    <span>Tipo</span>
                    <select
                      value={draft.kind}
                      onChange={(event) => {
                        const kind = event.target.value as AgendaEventKind;
                        setDraft({
                          ...draft,
                          kind,
                          title:
                            kind === "blocked" && !draft.title.trim()
                              ? "Indisponível"
                              : draft.title,
                          allDay: kind === "blocked" ? draft.allDay : false,
                        });
                        setConflictWarning(false);
                      }}
                    >
                      {(["meeting", "personal", "session", "blocked"] as AgendaEventKind[]).map(
                        (kind) => (
                          <option value={kind} key={kind}>
                            {agendaKindLabels[kind]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  {draft.kind === "blocked" && (
                    <div className="field full availability-mode">
                      <span>Duração da indisponibilidade</span>
                      <div>
                        <button
                          type="button"
                          className={draft.allDay ? "active" : ""}
                          onClick={() => {
                            setDraft({ ...draft, allDay: true });
                            setConflictWarning(false);
                          }}
                        >
                          Dia inteiro
                        </button>
                        <button
                          type="button"
                          className={!draft.allDay ? "active" : ""}
                          onClick={() => {
                            setDraft({ ...draft, allDay: false, start: "09:00", end: "10:00" });
                            setConflictWarning(false);
                          }}
                        >
                          Apenas um horário
                        </button>
                      </div>
                    </div>
                  )}
                  {!draft.allDay && (
                    <>
                      <label className="field">
                        <span>Início</span>
                        <input
                          type="time"
                          value={draft.start}
                          onChange={(event) => {
                            setDraft({ ...draft, start: event.target.value });
                            setConflictWarning(false);
                          }}
                        />
                      </label>
                      <label className="field">
                        <span>Fim</span>
                        <input
                          type="time"
                          value={draft.end}
                          onChange={(event) => {
                            setDraft({ ...draft, end: event.target.value });
                            setConflictWarning(false);
                          }}
                        />
                      </label>
                    </>
                  )}
                  <label className="field">
                    <span>Fuso horário</span>
                    <select
                      value={draft.timezone}
                      onChange={(event) =>
                        setDraft({ ...draft, timezone: event.target.value as EventTimezone })
                      }
                    >
                      <option value="America/Recife">Recife (Brasil)</option>
                      <option value="Europe/Lisbon">Lisboa (Portugal)</option>
                    </select>
                  </label>
                  {!draft.allDay && (
                    <div className="timezone-preview field full">
                      <span>HORÁRIO EQUIVALENTE</span>
                      <strong>
                        {equivalentEventTime(draft.date, draft.start, draft.timezone)} em{" "}
                        {otherEventTimezone(draft.timezone) === "Europe/Lisbon"
                          ? "Lisboa"
                          : "Recife"}
                      </strong>
                    </div>
                  )}
                  <label className="field">
                    <span>Repetição</span>
                    <select
                      value={draft.recurrence}
                      onChange={(event) =>
                        setDraft({ ...draft, recurrence: event.target.value as EventRecurrence })
                      }
                    >
                      <option value="none">Não repetir</option>
                      <option value="weekly">Toda semana</option>
                      <option value="monthly">Todo mês</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Lembrete</span>
                    <select
                      value={draft.reminder}
                      onChange={(event) => setDraft({ ...draft, reminder: event.target.value })}
                    >
                      <option>1 dia antes</option>
                      <option>2 horas antes</option>
                      <option>30 minutos antes</option>
                      <option>Sem lembrete</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Cliente (opcional)</span>
                    <select
                      value={draft.clientId || ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          clientId: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                    >
                      <option value="">Nenhum cliente</option>
                      {clients.map((client) => (
                        <option value={client.id} key={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field full">
                    <span>Trabalho (opcional)</span>
                    <select
                      value={draft.workId || ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          workId: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                    >
                      <option value="">Nenhum trabalho</option>
                      {works.map((work) => (
                        <option value={work.id} key={work.id}>
                          {work.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field full">
                    <span>Local</span>
                    <input
                      value={draft.location || ""}
                      onChange={(event) => setDraft({ ...draft, location: event.target.value })}
                      placeholder="Endereço, estúdio ou videochamada"
                    />
                  </label>
                  <label className="field full">
                    <span>Observações</span>
                    <textarea
                      rows={3}
                      value={draft.notes || ""}
                      onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                    />
                  </label>
                </div>
                {hasConflict && (
                  <div className={`calendar-conflict ${conflictWarning ? "confirmed" : ""}`}>
                    <span>!</span>
                    <div>
                      <strong>Conflito de horário</strong>
                      <p>Já existe outro compromisso neste período. Você ainda pode salvar.</p>
                    </div>
                  </div>
                )}
                {invalidTime && (
                  <div className="calendar-conflict">
                    <span>!</span>
                    <div>
                      <strong>Revise o horário</strong>
                      <p>O horário final precisa ser posterior ao horário inicial.</p>
                    </div>
                  </div>
                )}
              </div>
              <footer>
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => setNewEventOpen(false)}
                >
                  Cancelar
                </button>
                <button className="primary-button" type="submit" disabled={invalidTime}>
                  {hasConflict && conflictWarning
                    ? "Salvar mesmo assim"
                    : editingEventId
                      ? "Salvar alterações"
                      : draft.kind === "blocked"
                        ? "Salvar indisponibilidade"
                        : "Salvar compromisso"}
                </button>
              </footer>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
