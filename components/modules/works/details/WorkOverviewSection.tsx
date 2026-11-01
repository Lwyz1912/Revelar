import { OpenMap } from "@/components/modules/locations/OpenMap";
import { formatDate, formatMoney } from "@/lib/format";
import type { WorkDetailsController } from "../useWorkDetailsController";

type Props = {
  state: Pick<
    WorkDetailsController,
    | "activities"
    | "historyExpanded"
    | "moodboard"
    | "nextStage"
    | "overviewCoordinates"
    | "overviewLoading"
    | "overviewPlaceLabel"
    | "overviewWeather"
    | "progress"
    | "receivedPercent"
    | "setHistoryExpanded"
    | "setSelectedStageId"
    | "setTab"
    | "toast"
    | "today"
    | "work"
  >;
};

export function WorkOverviewSection({ state }: Props) {
  const {
    activities,
    historyExpanded,
    moodboard,
    nextStage,
    overviewCoordinates,
    overviewLoading,
    overviewPlaceLabel,
    overviewWeather,
    progress,
    receivedPercent,
    setHistoryExpanded,
    setSelectedStageId,
    setTab,
    toast,
    today,
    work,
  } = state;
  return (
    <div className="work-overview-layout">
      <section className="work-overview-main">
        <div className="overview-status-strip">
          <article>
            <span>SESSÃO</span>
            <strong>
              {formatDate(work.date)} · {work.time}
            </strong>
            <small>{work.duration}</small>
          </article>
          <article>
            <span>ENTREGA</span>
            <strong
              className={work.deliveryDate && work.deliveryDate <= today ? "text-danger" : ""}
            >
              {formatDate(work.deliveryDate)}
            </strong>
            <small>
              {work.deliveryDate && work.deliveryDate < today
                ? "Prazo atrasado"
                : "Prazo confirmado"}
            </small>
          </article>
          <article>
            <span>SALDO A RECEBER</span>
            <strong>
              {formatMoney(Math.max(0, work.totalValue - work.entryValue), work.currency)}
            </strong>
            <small>{receivedPercent}% do contrato recebido</small>
          </article>
          <article>
            <span>ANDAMENTO</span>
            <strong>{progress}%</strong>
            <small>{nextStage?.label || "Trabalho concluído"}</small>
          </article>
        </div>

        <section className="overview-location-weather">
          <article className="card overview-location-card">
            <div className="overview-card-heading">
              <div>
                <span>LOCAL DO ENSAIO</span>
                <h2>{work.location || "A definir"}</h2>
                <p title={overviewPlaceLabel}>{overviewPlaceLabel}</p>
              </div>
              <div className="overview-location-actions">
                <button
                  type="button"
                  disabled={!work.location || work.location === "A definir"}
                  onClick={async () => {
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(work.location)}`;
                    if (navigator.share) {
                      await navigator
                        .share({ title: work.title, text: work.location, url: mapsUrl })
                        .catch(() => undefined);
                    } else {
                      await navigator.clipboard.writeText(mapsUrl);
                      toast("Localização copiada");
                    }
                  }}
                >
                  ⧉ Compartilhar
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(work.location)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  ↗ Abrir no GPS
                </a>
              </div>
            </div>
            <div className="overview-mini-map">
              {overviewCoordinates ? (
                <OpenMap locations={[]} editablePosition={overviewCoordinates} compact />
              ) : (
                <div className="overview-map-placeholder">
                  <span>⌖</span>
                  <strong>{overviewLoading ? "Localizando…" : "Mapa indisponível"}</strong>
                  <small>Defina um endereço completo para visualizar o mapa.</small>
                </div>
              )}
            </div>
          </article>
          <article className="card overview-weather-card">
            <span>
              CONDIÇÕES NO DIA
              {overviewWeather?.demo && <b className="weather-demo-badge">DEMONSTRAÇÃO</b>}
            </span>
            {overviewWeather?.available ? (
              <>
                <strong>{overviewWeather.label}</strong>
                <div>
                  <b>{Math.round(overviewWeather.max || 0)}°</b>
                  <small>Mín. {Math.round(overviewWeather.min || 0)}°</small>
                </div>
                <p>{Math.round(overviewWeather.rain || 0)}% de chance de chuva</p>
                {overviewWeather.demo && <small>{overviewWeather.reason}</small>}
              </>
            ) : (
              <>
                <strong>
                  {overviewLoading ? "Consultando previsão…" : "Previsão ainda indisponível"}
                </strong>
                <p>
                  {overviewWeather?.reason ||
                    "Ela aparecerá automaticamente quando a data estiver próxima."}
                </p>
              </>
            )}
          </article>
        </section>

        <section className="overview-insight-grid">
          <article className="card overview-photo-pipeline">
            <div className="overview-card-heading">
              <div>
                <span>GALERIA</span>
                <h2>Fluxo das fotos</h2>
              </div>
              <button type="button" onClick={() => setTab("gallery")}>
                Abrir galeria
              </button>
            </div>
            <div>
              {[
                ["Enviadas", work.photos.captured],
                ["Escolhidas", work.photos.selected],
                ["Editadas", work.photos.edited],
                ["Entregues", work.photos.delivered],
              ].map(([label, value]) => (
                <span key={label}>
                  <strong>{value}</strong>
                  <small>{label}</small>
                </span>
              ))}
            </div>
          </article>
          <article className="card overview-visual-summary">
            <div className="overview-card-heading">
              <div>
                <span>DIREÇÃO VISUAL</span>
                <h2>{moodboard.style}</h2>
              </div>
              <button type="button" onClick={() => setTab("moodboard")}>
                Editar direção
              </button>
            </div>
            <div className="overview-palette">
              {moodboard.palette.map((color, index) => (
                <i key={`${color}-${index}`} style={{ background: color }} />
              ))}
            </div>
            <p>{moodboard.notes}</p>
            <small>
              {moodboard.references.length} referências · {moodboard.shotList.length} fotos
              obrigatórias
            </small>
          </article>
        </section>

        <article className="card overview-progress-card">
          <div className="overview-card-heading">
            <div>
              <span>PRÓXIMA AÇÃO</span>
              <h2>{nextStage?.label || "Tudo concluído"}</h2>
              <p>
                {nextStage
                  ? `Responsável: ${nextStage.responsible || "A definir"}`
                  : "Todas as etapas foram finalizadas."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTab("timeline");
                if (nextStage) setSelectedStageId(nextStage.id);
              }}
            >
              Abrir timeline
            </button>
          </div>
          <div className="progress large">
            <i style={{ width: `${progress}%` }} />
          </div>
        </article>
      </section>

      <aside className="overview-history card">
        <div className="overview-card-heading">
          <div>
            <span>HISTÓRICO</span>
            <h2>Atividades recentes</h2>
          </div>
          <small>{activities.length}</small>
        </div>
        <div className="activity-list">
          {activities.slice(0, historyExpanded ? activities.length : 5).map((item) => (
            <div key={item.id}>
              <span>{item.icon}</span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </div>
            </div>
          ))}
        </div>
        {activities.length > 5 && (
          <button
            className="overview-history-toggle"
            type="button"
            onClick={() => setHistoryExpanded((current) => !current)}
          >
            {historyExpanded ? "Mostrar menos" : "Ver histórico completo"}
          </button>
        )}
      </aside>
    </div>
  );
}
