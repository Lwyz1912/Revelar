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

function scheduleItems(works: Work[], today: string): ScheduleItem[] {
  return works
    .filter((work) => !inactiveStatuses.has(work.status))
    .flatMap((work): ScheduleItem[] => {
      const items: ScheduleItem[] = [];

      if (work.date >= today) {
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

export function Dashboard({
  overview,
  currency,
  works,
  navigate,
  onOpenWork,
  onNewWork,
  onNewClient,
}: {
  overview: DashboardOverview;
  currency: Currency;
  works: Work[];
  navigate: (label: AppSection) => void;
  onOpenWork: (work: Work) => void;
  onNewWork: () => void;
  onNewClient: () => void;
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
  const upcoming = scheduleItems(works, today);
  const nextWork = overview.nextWork;
  const completedStages = nextWork?.stages.filter((stage) => stage.done).length || 0;
  const stageProgress = nextWork?.stages.length
    ? Math.round((completedStages / nextWork.stages.length) * 100)
    : 0;
  const paymentProgress = nextWork?.totalValue
    ? Math.min(100, Math.round((nextWork.entryValue / nextWork.totalValue) * 100))
    : 0;
  const externalWorks = works.filter(
    (work) =>
      !inactiveStatuses.has(work.status) &&
      Boolean(work.location) &&
      !/studio|estúdio|online|video/i.test(work.location),
  ).length;

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

      <section className="dashboard-grid first-grid">
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
              <div className="job-facts">
                <div>
                  <span>
                    <img src="/brand/revelar-icons-svg-monocromatico/06-pagamentos.svg" alt="" />
                  </span>
                  <p>
                    Pagamento<strong>{paymentProgress}% recebido</strong>
                  </p>
                </div>
                <div>
                  <span>
                    <img src="/brand/revelar-icons-svg-monocromatico/04-agenda.svg" alt="" />
                  </span>
                  <p>
                    Cronograma
                    <strong>
                      {completedStages}/{nextWork.stages.length} etapas
                    </strong>
                  </p>
                </div>
                <div>
                  <span>
                    <img src="/brand/revelar-icons-svg-monocromatico/09-arquivos.svg" alt="" />
                  </span>
                  <p>
                    Arquivos
                    <strong>
                      {nextWork.attachments.length}{" "}
                      {nextWork.attachments.length === 1 ? "anexo" : "anexos"}
                    </strong>
                  </p>
                </div>
              </div>
              <div className="progress-title">
                <span>Preparação do trabalho</span>
                <strong>{stageProgress}%</strong>
              </div>
              <div className="progress">
                <i style={{ width: `${stageProgress}%` }} />
              </div>
              <p className="ready-note">
                <span>✓</span>{" "}
                {stageProgress >= 75
                  ? "Quase tudo pronto para o trabalho!"
                  : "Confira as próximas etapas antes da sessão."}
              </p>
            </>
          ) : (
            <div className="dashboard-empty">
              <p>PRÓXIMO TRABALHO</p>
              <h2>Sua agenda futura está livre</h2>
              <span>Crie um trabalho ou converta um orçamento aprovado.</span>
              <button className="outline-button" type="button" onClick={onNewWork}>
                Criar trabalho
              </button>
            </div>
          )}
        </article>

        <article className="card weather">
          <div className="weather-top">
            <div>
              <p>PLANEJAMENTO EXTERNO</p>
              <h2>Antes de sair</h2>
            </div>
            <span>☀</span>
          </div>
          <div className="temperature">
            <strong>{externalWorks}</strong>
            <span>
              {externalWorks === 1 ? "trabalho externo ativo" : "trabalhos externos ativos"}
              <small>Clima ainda não conectado</small>
            </span>
          </div>
          <div className="weather-facts">
            <div>
              <span>✓</span>
              <p>
                Local<strong>Confirmar acesso</strong>
              </p>
            </div>
            <div>
              <span>☂</span>
              <p>
                Previsão<strong>Conferir antes</strong>
              </p>
            </div>
          </div>
          <p className="weather-note">O Revelar não mostra clima em tempo real nesta versão.</p>
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
              <p className="empty-copy">Nenhum compromisso futuro cadastrado.</p>
            )}
          </div>
        </article>
      </section>

      <section className="card deadline-alerts">
        <div className="card-heading compact">
          <div>
            <p>PRAZOS IMPORTANTES</p>
            <h2>Entregas no calendário</h2>
          </div>
          <button className="text-button" type="button" onClick={() => navigate("Agenda")}>
            Abrir calendário ›
          </button>
        </div>
        <div className="deadline-alert-list">
          {overview.urgentDeliveries.length ? (
            overview.urgentDeliveries.slice(0, 3).map((work) => (
              <button type="button" key={work.id} onClick={() => onOpenWork(work)}>
                <span className={`deadline-dot ${work.deliveryDate < today ? "late" : "soon"}`} />
                <span>
                  <strong>{work.title}</strong>
                  <small>
                    {work.deliveryDate < today
                      ? "Prazo atrasado"
                      : work.deliveryDate === today
                        ? "Entrega hoje"
                        : `Entrega em ${formatDate(work.deliveryDate)}`}
                  </small>
                </span>
                <b>›</b>
              </button>
            ))
          ) : (
            <p className="empty-copy">Nenhum prazo urgente nos próximos dias.</p>
          )}
        </div>
      </section>

      <section className="card financial-strip">
        <div>
          <p>RECEBIDO NESTE MÊS</p>
          <strong>{formatMoney(overview.receivedThisMonth, currency)}</strong>
          <small>Valores confirmados no Financeiro</small>
        </div>
        <div className="mini-bars" aria-hidden="true">
          <i style={{ height: "32%" }} />
          <i style={{ height: "48%" }} />
          <i style={{ height: "39%" }} />
          <i style={{ height: "64%" }} />
          <i style={{ height: "58%" }} />
          <i style={{ height: "82%" }} />
          <i style={{ height: "100%" }} />
        </div>
        <button className="outline-button" type="button" onClick={() => navigate("Financeiro")}>
          Ver financeiro ›
        </button>
      </section>
    </div>
  );
}
