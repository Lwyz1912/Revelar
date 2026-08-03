import { appointments, dashboardJobs } from "@/data/demo";
import { addDays, agendaDateLabel, todayIso } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import type { AppSection, Work } from "@/types/revelar";

export function Dashboard({
  money,
  works,
  navigate,
  toast,
  onNewWork,
  onNewClient,
}: {
  money: { pending: string; month: string };
  works: Work[];
  navigate: (label: AppSection) => void;
  toast: (message: string) => void;
  onNewWork: () => void;
  onNewClient: () => void;
}) {
  const today = todayIso();
  const attentionLimit = addDays(today, 9);
  const todayLabel = agendaDateLabel(today, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).toLocaleUpperCase("pt-BR");
  const urgentDeliveries = works.filter(
    (work) =>
      work.status !== "completed" &&
      Boolean(work.deliveryDate) &&
      work.deliveryDate <= attentionLimit,
  );
  return (
    <div className="dashboard">
      <section className="welcome-row">
        <div>
          <p>{todayLabel}</p>
          <h1>Boa tarde, Maryana</h1>
          <span>Aqui está um resumo do seu estúdio hoje.</span>
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
            <strong>2</strong>
            <small>Próximo às 15:30</small>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon gold">
            <img src="/brand/revelar-icons-svg-monocromatico/10-fotografias.svg" alt="" />
          </span>
          <div>
            <p>FOTOS PARA EDITAR</p>
            <strong>286</strong>
            <small>Em 3 trabalhos</small>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon rose">
            <img src="/brand/revelar-icons-svg-monocromatico/11-entrega.svg" alt="" />
          </span>
          <div>
            <p>ENTREGAS PENDENTES</p>
            <strong>{works.filter((work) => work.status !== "completed").length}</strong>
            <small>{urgentDeliveries.length} exigem atenção</small>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon green">
            <img src="/brand/revelar-icons-svg-monocromatico/06-pagamentos.svg" alt="" />
          </span>
          <div>
            <p>A RECEBER</p>
            <strong>{money.pending}</strong>
            <small>3 pagamentos</small>
          </div>
        </article>
      </section>

      <section className="dashboard-grid first-grid">
        <article className="card next-job">
          <div className="card-heading">
            <div>
              <p>PRÓXIMO TRABALHO</p>
              <h2>Ensaio de aniversário — Camila</h2>
              <span>Hoje, 15:30 · MF Studio</span>
            </div>
            <button
              className="outline-button"
              type="button"
              onClick={() => toast("Abrindo detalhes do ensaio")}
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
                Pagamento<strong>50% recebido</strong>
              </p>
            </div>
            <div>
              <span>
                <img src="/brand/revelar-icons-svg-monocromatico/04-agenda.svg" alt="" />
              </span>
              <p>
                Cronograma<strong>5 etapas</strong>
              </p>
            </div>
            <div>
              <span>
                <img src="/brand/revelar-icons-svg-monocromatico/10-fotografias.svg" alt="" />
              </span>
              <p>
                Moodboard<strong>12 referências</strong>
              </p>
            </div>
          </div>
          <div className="progress-title">
            <span>Preparação do trabalho</span>
            <strong>75%</strong>
          </div>
          <div className="progress">
            <i style={{ width: "75%" }} />
          </div>
          <p className="ready-note">
            <span>✓</span> Quase tudo pronto para o ensaio!
          </p>
        </article>

        <article className="card weather">
          <div className="weather-top">
            <div>
              <p>CONDIÇÕES DE HOJE</p>
              <h2>Caruaru, PE</h2>
            </div>
            <span>☀</span>
          </div>
          <div className="temperature">
            <strong>26°</strong>
            <span>
              Parcialmente nublado<small>Sensação de 27°</small>
            </span>
          </div>
          <div className="weather-facts">
            <div>
              <span>↘</span>
              <p>
                Pôr do sol<strong>17:28</strong>
              </p>
            </div>
            <div>
              <span>☂</span>
              <p>
                Chuva<strong>18%</strong>
              </p>
            </div>
          </div>
          <p className="weather-note">Luz suave prevista para o fim da tarde.</p>
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
            {dashboardJobs.map((job) => (
              <div className="job-row" key={job.name}>
                <div className="progress-title">
                  <span>{job.name}</span>
                  <strong>
                    {job.edited}/{job.total}
                  </strong>
                </div>
                <div className="progress">
                  <i style={{ width: `${job.progress}%` }} />
                </div>
                <small>
                  {job.progress === 100 ? "Pronto para entrega" : `Entrega: ${job.due}`}
                </small>
              </div>
            ))}
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
            {appointments.map((item) => (
              <button type="button" key={item.day} onClick={() => toast(item.title)}>
                <span className={`date-box ${item.color}`}>
                  <small>{item.month}</small>
                  <strong>{item.day}</strong>
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.meta}</small>
                </span>
                <b>›</b>
              </button>
            ))}
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
          {urgentDeliveries.slice(0, 3).map((work) => (
            <button type="button" key={work.id} onClick={() => navigate("Trabalhos")}>
              <span
                className={`deadline-dot ${work.deliveryDate && work.deliveryDate < today ? "late" : "soon"}`}
              />
              <span>
                <strong>{work.title}</strong>
                <small>
                  {work.deliveryDate && work.deliveryDate < today
                    ? "Prazo atrasado"
                    : work.deliveryDate === today
                      ? "Entrega hoje"
                      : `Entrega em ${formatDate(work.deliveryDate)}`}
                </small>
              </span>
              <b>›</b>
            </button>
          ))}
        </div>
      </section>

      <section className="card financial-strip">
        <div>
          <p>FATURAMENTO DO MÊS</p>
          <strong>{money.month}</strong>
          <small>↑ 18% comparado a julho</small>
        </div>
        <div className="mini-bars" aria-label="Evolução do faturamento">
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
