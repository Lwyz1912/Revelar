import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

import { workStatusLabels } from "@/config/labels";
import { addDays, todayIso } from "@/lib/dates";
import { formatDate, formatMoney, normalizePhone } from "@/lib/format";
import { stageChecklist } from "@/lib/workflow";
import { inferredStageDate, namesForClients, workProgress } from "@/lib/works";
import type {
  Client,
  GalleryEvent,
  Work,
  WorkCost,
  WorkGallery,
  WorkStage,
  WorkStatus,
} from "@/types/revelar";
import { WorkFilesHub } from "@/components/modules/works/WorkFilesHub";

type WorkDetailTab =
  | "overview"
  | "moodboard"
  | "timeline"
  | "finance"
  | "gallery"
  | "files"
  | "costs";

type LocalAttachment = { url: string; type: string; size: number };

function attachmentExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "arquivo";
}

function attachmentKind(name: string, type = "") {
  const extension = attachmentExtension(name);
  if (type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(extension))
    return "image";
  if (type === "application/pdf" || extension === "pdf") return "pdf";
  return "other";
}

const workDetailTabs: Array<{ id: WorkDetailTab; label: string; icon: string }> = [
  { id: "overview", label: "Visão geral", icon: "◇" },
  { id: "moodboard", label: "Moodboard", icon: "✦" },
  { id: "timeline", label: "Timeline", icon: "⌁" },
  { id: "finance", label: "Financeiro", icon: "＄" },
  { id: "gallery", label: "Galeria", icon: "▧" },
  { id: "files", label: "Documentos", icon: "□" },
  { id: "costs", label: "Custos", icon: "−" },
];

export function WorkDetails({
  work,
  clients,
  onBack,
  onUpdate,
  onDuplicate,
  onArchive,
  onCancel,
  onPhotoExtras,
  toast,
}: {
  work: Work;
  clients: Client[];
  onBack: () => void;
  onUpdate: (work: Work) => void;
  onDuplicate: (work: Work) => void;
  onArchive: (work: Work) => void;
  onCancel: (work: Work) => void;
  onPhotoExtras: (work: Work, gallery: WorkGallery) => void;
  toast: (message: string) => void;
}) {
  const today = todayIso();
  const soonLimit = addDays(today, 4);
  const [tab, setTab] = useState<WorkDetailTab>("overview");
  const [selectedStageId, setSelectedStageId] = useState(
    work.stages.find((stage) => !stage.done)?.id || work.stages[0]?.id || "",
  );
  const [newStage, setNewStage] = useState("");
  const [payment, setPayment] = useState("");
  const [costDraft, setCostDraft] = useState({
    name: "",
    category: "Transporte",
    tags: "",
    amount: 0,
    status: "planned" as WorkCost["status"],
    date: work.date,
  });
  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [localFiles, setLocalFiles] = useState<Record<string, LocalAttachment>>({});
  const localFilesRef = useRef<Record<string, LocalAttachment>>({});
  const [activities, setActivities] = useState<
    Array<{ id: string | number; icon: string; title: string; meta: string }>
  >([
    { id: 1, icon: "✓", title: "Seleção concluída", meta: "Maryana · hoje, 10:42" },
    {
      id: 2,
      icon: "＄",
      title: `${formatMoney(work.entryValue, work.currency)} registrados como recebidos`,
      meta: "Maryana · 22 jul, 14:18",
    },
    {
      id: 3,
      icon: "◇",
      title: "Prazo de entrega definido",
      meta: `${formatDate(work.deliveryDate)} · 18 jul, 19:05`,
    },
    { id: 4, icon: "＋", title: "Trabalho criado", meta: "Maryana · 02 jun, 09:30" },
  ]);
  const stageFileRef = useRef<HTMLInputElement>(null);
  const workFileRef = useRef<HTMLInputElement>(null);
  const linkedClients = clients.filter((client) => work.clientIds.includes(client.id));
  const costItems: WorkCost[] = work.costItems?.length
    ? work.costItems
    : work.costs > 0
      ? [
          {
            id: `legacy-${work.id}`,
            name: "Custos anteriores",
            category: "Produção",
            tags: [work.category],
            amount: work.costs,
            status: "planned",
            date: work.date,
          },
        ]
      : [];
  const selectedStage = work.stages.find((stage) => stage.id === selectedStageId) || work.stages[0];
  const receivedPercent = work.totalValue
    ? Math.min(100, Math.round((work.entryValue / work.totalValue) * 100))
    : 0;
  const progress = workProgress(work);
  const nextStage = work.stages.find((stage) => !stage.done);
  const currentPreview = previewFile ? localFiles[previewFile] : undefined;
  const currentPreviewKind = previewFile
    ? attachmentKind(previewFile, currentPreview?.type)
    : "other";
  const moodboard = work.moodboard ?? {
    style: work.category === "Casamento" ? "Romântico documental" : "Natural e espontâneo",
    palette: ["#EEE4D4", "#B8906D", "#6F7860", "#302D29"],
    notes: "Priorizar movimento, luz natural e momentos espontâneos.",
    shotList: [
      { id: "shot-1", label: "Retratos principais", done: false },
      { id: "shot-2", label: "Detalhes do ambiente", done: false },
      { id: "shot-3", label: "Momentos espontâneos", done: false },
    ],
    references: [
      {
        id: "ref-1",
        kind: "image" as const,
        title: "Luz e movimento",
        value: "/demo/gallery/casamento.webp",
      },
      {
        id: "ref-2",
        kind: "image" as const,
        title: "Composição",
        value: "/demo/gallery/ensaio-pessoal.webp",
      },
      {
        id: "ref-3",
        kind: "lighting" as const,
        title: "Iluminação",
        value: "Luz lateral suave na hora dourada",
      },
      {
        id: "ref-4",
        kind: "equipment" as const,
        title: "Equipamento",
        value: "35 mm + 85 mm · flash de apoio",
      },
    ],
  };
  const updateMoodboard = (next: typeof moodboard) => onUpdate({ ...work, moodboard: next });

  const syncGalleryStats = useCallback(
    (photos: Work["photos"]) => {
      if (
        photos.captured === work.photos.captured &&
        photos.selected === work.photos.selected &&
        photos.edited === work.photos.edited &&
        photos.delivered === work.photos.delivered
      )
        return;
      onUpdate({ ...work, photos });
    },
    [onUpdate, work],
  );

  const syncGalleryEvents = useCallback((events: GalleryEvent[]) => {
    setActivities((current) => {
      const existing = new Set(current.map((activity) => String(activity.id)));
      const incoming = events
        .filter((event) => !existing.has(event.id))
        .map((event) => ({
          id: event.id,
          icon: event.eventType.includes("download")
            ? "⇩"
            : event.eventType.includes("comment")
              ? "●"
              : "◇",
          title: event.detail,
          meta: `Galeria · ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.createdAt))}`,
        }));
      return incoming.length ? [...incoming, ...current].slice(0, 80) : current;
    });
  }, []);

  useEffect(
    () => () => {
      Object.values(localFilesRef.current).forEach((file) => URL.revokeObjectURL(file.url));
    },
    [],
  );

  const addActivity = (title: string, icon = "◇") =>
    setActivities((current) => [
      { id: Date.now(), icon, title, meta: "Maryana · agora" },
      ...current,
    ]);
  const update = (changes: Partial<Work>) => onUpdate({ ...work, ...changes });
  const updateStage = (stageId: string, changes: Partial<WorkStage>) => {
    const stages = work.stages.map((stage) =>
      stage.id === stageId ? { ...stage, ...changes } : stage,
    );
    const done = stages.filter((stage) => stage.done).length;
    const status: WorkStatus =
      done === stages.length
        ? "completed"
        : done >= 7
          ? "delivery"
          : done >= 6
            ? "editing"
            : work.date
              ? "scheduled"
              : "planning";
    update({ stages, status });
  };
  const toggleStage = (stage: WorkStage) => {
    if (
      !stage.done &&
      stage.label === "Pagamento dos 50%" &&
      work.entryValue < work.totalValue / 2
    ) {
      toast(
        `Registre pelo menos ${formatMoney(work.totalValue / 2, work.currency)} antes de confirmar esta etapa.`,
      );
      setTab("finance");
      return;
    }
    if (!stage.done && stage.label === "Pagamento completo" && work.entryValue < work.totalValue) {
      toast("O saldo ainda não foi totalmente recebido.");
      setTab("finance");
      return;
    }
    updateStage(stage.id, { done: !stage.done });
    addActivity(`${stage.label} ${stage.done ? "reaberta" : "concluída"}`, stage.done ? "↻" : "✓");
  };
  const moveStage = (stageId: string, direction: -1 | 1) => {
    const index = work.stages.findIndex((stage) => stage.id === stageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= work.stages.length) return;
    const stages = [...work.stages];
    [stages[index], stages[target]] = [stages[target], stages[index]];
    update({ stages });
    addActivity("Ordem das etapas alterada", "↕");
  };
  const addCustomStage = () => {
    const label = newStage.trim();
    if (!label) return;
    const id = `custom-${Date.now()}`;
    update({
      stages: [
        ...work.stages,
        {
          id,
          label,
          done: false,
          custom: true,
          responsible: "Maryana",
          checklist: stageChecklist(label, id),
          attachments: [],
        },
      ],
    });
    setNewStage("");
    setSelectedStageId(id);
    addActivity(`Etapa “${label}” adicionada`, "＋");
  };
  const registerPayment = () => {
    const amount = Number(payment.replace(",", "."));
    if (!amount || amount <= 0) return;
    const received = Math.min(work.totalValue, work.entryValue + amount);
    update({ entryValue: received });
    setPayment("");
    addActivity(`Pagamento de ${formatMoney(amount, work.currency)} registrado`, "＄");
    toast("Pagamento registrado. Confirme manualmente a etapa correspondente.");
  };
  const addCost = () => {
    if (!costDraft.name.trim() || costDraft.amount <= 0) return;
    const item: WorkCost = {
      id: `cost-${Date.now()}`,
      name: costDraft.name.trim(),
      category: costDraft.category || "Outros",
      tags: costDraft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      amount: costDraft.amount,
      status: costDraft.status,
      date: costDraft.date || work.date,
    };
    const next = [...costItems, item].filter(
      (cost) => !cost.id.startsWith("legacy-") || costItems.length === 1,
    );
    update({ costItems: next, costs: next.reduce((sum, cost) => sum + cost.amount, 0) });
    setCostDraft({
      name: "",
      category: "Transporte",
      tags: "",
      amount: 0,
      status: "planned",
      date: work.date,
    });
    addActivity(`Custo “${item.name}” adicionado`, "−");
    toast("Custo detalhado e sincronizado com o Financeiro");
  };
  const removeCost = (id: string) => {
    const next = costItems.filter((item) => item.id !== id);
    update({ costItems: next, costs: next.reduce((sum, item) => sum + item.amount, 0) });
  };
  const rememberFiles = (files: File[]) => {
    const entries = Object.fromEntries(
      files.map((file) => [
        file.name,
        { url: URL.createObjectURL(file), type: file.type, size: file.size },
      ]),
    );
    localFilesRef.current = { ...localFilesRef.current, ...entries };
    setLocalFiles((current) => ({ ...current, ...entries }));
  };
  const addWorkFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    rememberFiles(selectedFiles);
    update({ attachments: [...work.attachments, ...selectedFiles.map((file) => file.name)] });
    addActivity(`${selectedFiles.length} arquivo(s) anexado(s)`, "□");
    event.target.value = "";
  };
  const addStageFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedStage) return;
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    rememberFiles(selectedFiles);
    updateStage(selectedStage.id, {
      attachments: [
        ...(selectedStage.attachments || []),
        ...selectedFiles.map((file) => file.name),
      ],
    });
    addActivity(`Arquivo anexado à etapa ${selectedStage.label}`, "□");
    event.target.value = "";
  };
  const whatsapp = linkedClients[0]?.whatsapp
    ? `https://wa.me/${normalizePhone(linkedClients[0].whatsapp)}`
    : "#";

  return (
    <div className="work-details-page">
      <button className="detail-back" type="button" onClick={onBack}>
        ← Voltar para trabalhos
      </button>
      <section className="work-detail-hero">
        <div className="work-detail-title">
          <span className={`work-category-icon status-${work.status}`}>▱</span>
          <div>
            <span className={`status-badge status-${work.status}`}>
              {workStatusLabels[work.status]}
            </span>
            <h1>{work.title}</h1>
            <p>
              {work.category} · {namesForClients(work.clientIds, clients)}
            </p>
          </div>
        </div>
        <div className="work-detail-actions">
          <a className="whatsapp-button" href={whatsapp} target="_blank" rel="noreferrer">
            ◉ WhatsApp
          </a>
          <button type="button" onClick={() => setEditing(!editing)}>
            ✎ Editar
          </button>
          <button type="button" onClick={() => onDuplicate(work)}>
            ⧉ Duplicar
          </button>
          <button type="button" onClick={() => onArchive(work)}>
            ⌑ Arquivar
          </button>
          <button className="danger-action" type="button" onClick={() => setCancelOpen(true)}>
            × Cancelar
          </button>
        </div>
      </section>

      {editing && (
        <section className="detail-inline-edit card">
          <div className="field-grid">
            <label className="field">
              <span>Título</span>
              <input
                value={work.title}
                onChange={(event) => update({ title: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Local</span>
              <input
                value={work.location}
                onChange={(event) => update({ location: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Data</span>
              <input
                type="date"
                value={work.date}
                onChange={(event) => update({ date: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Horário</span>
              <input
                type="time"
                value={work.time}
                onChange={(event) => update({ time: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Entrega</span>
              <input
                type="date"
                value={work.deliveryDate}
                onChange={(event) => update({ deliveryDate: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Equipe</span>
              <input
                value={work.team.join(", ")}
                onChange={(event) =>
                  update({
                    team: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setEditing(false);
              addActivity("Dados principais atualizados", "✎");
              toast("Alterações salvas neste navegador");
            }}
          >
            Concluir edição
          </button>
        </section>
      )}

      <nav className="work-detail-tabs" aria-label="Seções do trabalho">
        {workDetailTabs.map((item) => (
          <button
            type="button"
            key={item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="detail-content-grid">
          <section className="detail-main-column">
            <div className="detail-summary-grid">
              <article>
                <span>SESSÃO</span>
                <strong>
                  {formatDate(work.date)} · {work.time}
                </strong>
                <small>
                  {work.duration} · {work.location}
                </small>
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
                    : work.deliveryDate === today
                      ? "Entrega hoje"
                      : "Prazo confirmado"}
                </small>
              </article>
              <article>
                <span>FINANCEIRO</span>
                <strong>
                  {formatMoney(work.entryValue, work.currency)} de{" "}
                  {formatMoney(work.totalValue, work.currency)}
                </strong>
                <small>{receivedPercent}% recebido</small>
              </article>
              <article>
                <span>FOTOS</span>
                <strong>
                  {work.photos.edited} de {work.photos.selected} editadas
                </strong>
                <small>{work.photos.captured} capturadas</small>
              </article>
            </div>
            <article className="card detail-progress-card">
              <div className="detail-section-heading">
                <div>
                  <p>ANDAMENTO</p>
                  <h2>Fluxo do trabalho</h2>
                </div>
                <strong>{progress}%</strong>
              </div>
              <div className="progress large">
                <i style={{ width: `${progress}%` }} />
              </div>
              <div className="next-stage-callout">
                <span>→</span>
                <div>
                  <small>PRÓXIMA ETAPA</small>
                  <strong>{nextStage?.label || "Trabalho concluído"}</strong>
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
            </article>
            <article className="card">
              <div className="detail-section-heading">
                <div>
                  <p>PRODUÇÃO</p>
                  <h2>Informações do trabalho</h2>
                </div>
              </div>
              <div className="info-list">
                <div>
                  <span>Pacote contratado</span>
                  <strong>{work.packageName}</strong>
                </div>
                <div>
                  <span>Equipe</span>
                  <strong>{work.team.join(" · ")}</strong>
                </div>
                <div>
                  <span>Clientes</span>
                  <strong>{namesForClients(work.clientIds, clients)}</strong>
                </div>
                <div>
                  <span>Arquivos anexados</span>
                  <strong>{work.attachments.length}</strong>
                </div>
              </div>
            </article>
          </section>
          <aside className="detail-activity card">
            <div className="detail-section-heading">
              <div>
                <p>HISTÓRICO</p>
                <h2>Atividades recentes</h2>
              </div>
            </div>
            <div className="activity-list">
              {activities.map((item) => (
                <div key={item.id}>
                  <span>{item.icon}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.meta}</small>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {tab === "moodboard" && (
        <div className="moodboard-layout">
          <section className="moodboard-main card">
            <div className="detail-section-heading">
              <div>
                <p>DIREÇÃO VISUAL</p>
                <h2>Referências do trabalho</h2>
              </div>
              <span>Somente interno</span>
            </div>
            <div className="moodboard-reference-grid">
              {moodboard.references
                .filter((reference) => reference.kind === "image")
                .map((reference) => (
                  <article key={reference.id}>
                    <img src={reference.value} alt={reference.title} />
                    <strong>{reference.title}</strong>
                  </article>
                ))}
              <button
                type="button"
                onClick={() => {
                  const value = window.prompt("Cole o link da imagem de referência");
                  if (!value) return;
                  updateMoodboard({
                    ...moodboard,
                    references: [
                      ...moodboard.references,
                      { id: crypto.randomUUID(), kind: "image", title: "Nova referência", value },
                    ],
                  });
                  toast("Referência adicionada ao moodboard");
                }}
              >
                ＋<span>Adicionar imagem ou link</span>
              </button>
            </div>
            <div className="moodboard-notes-grid">
              <label>
                <span>ESTILO DESEJADO</span>
                <input
                  value={moodboard.style}
                  onChange={(event) => updateMoodboard({ ...moodboard, style: event.target.value })}
                />
              </label>
              <label>
                <span>OBSERVAÇÕES CRIATIVAS</span>
                <textarea
                  rows={4}
                  value={moodboard.notes}
                  onChange={(event) => updateMoodboard({ ...moodboard, notes: event.target.value })}
                />
              </label>
            </div>
            <div className="moodboard-reference-notes">
              {moodboard.references
                .filter((reference) => reference.kind !== "image")
                .map((reference) => (
                  <article key={reference.id}>
                    <span>{reference.kind.toUpperCase()}</span>
                    <strong>{reference.title}</strong>
                    <p>{reference.value}</p>
                  </article>
                ))}
            </div>
          </section>
          <aside className="moodboard-side">
            <section className="card">
              <span>PALETA</span>
              <div className="moodboard-palette">
                {moodboard.palette.map((color, index) => (
                  <label key={`${color}-${index}`} style={{ background: color }}>
                    <input
                      type="color"
                      value={color}
                      onChange={(event) =>
                        updateMoodboard({
                          ...moodboard,
                          palette: moodboard.palette.map((item, itemIndex) =>
                            itemIndex === index ? event.target.value : item,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </section>
            <section className="card">
              <span>FOTOS OBRIGATÓRIAS</span>
              <div className="moodboard-shots">
                {moodboard.shotList.map((shot) => (
                  <label key={shot.id}>
                    <input
                      type="checkbox"
                      checked={shot.done}
                      onChange={() =>
                        updateMoodboard({
                          ...moodboard,
                          shotList: moodboard.shotList.map((item) =>
                            item.id === shot.id ? { ...item, done: !item.done } : item,
                          ),
                        })
                      }
                    />
                    <span>{shot.label}</span>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const label = window.prompt("Qual foto não pode faltar?");
                    if (label)
                      updateMoodboard({
                        ...moodboard,
                        shotList: [
                          ...moodboard.shotList,
                          { id: crypto.randomUUID(), label, done: false },
                        ],
                      });
                  }}
                >
                  ＋ Adicionar foto
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}

      {tab === "timeline" && (
        <div className="timeline-layout">
          <section className="timeline-panel card">
            <div className="detail-section-heading">
              <div>
                <p>CRONOGRAMA</p>
                <h2>Etapas do trabalho</h2>
              </div>
              <span>
                {work.stages.filter((stage) => stage.done).length} de {work.stages.length}{" "}
                concluídas
              </span>
            </div>
            <div className="timeline-list">
              {work.stages.map((stage, index) => {
                const due = stage.dueDate || inferredStageDate(work, index);
                const state = stage.done
                  ? "done"
                  : due && due < today
                    ? "late"
                    : due && due <= soonLimit
                      ? "soon"
                      : "pending";
                return (
                  <div
                    key={stage.id}
                    className={`timeline-item ${state} ${selectedStageId === stage.id ? "selected" : ""}`}
                  >
                    <button
                      className="stage-check"
                      type="button"
                      onClick={() => toggleStage(stage)}
                      aria-label={stage.done ? `Reabrir ${stage.label}` : `Concluir ${stage.label}`}
                    >
                      {stage.done ? "✓" : index + 1}
                    </button>
                    <button
                      className="stage-open"
                      type="button"
                      onClick={() => setSelectedStageId(stage.id)}
                    >
                      <strong>{stage.label}</strong>
                      <small>
                        <span>
                          {state === "late"
                            ? "Atrasada"
                            : state === "soon"
                              ? "Prazo próximo"
                              : stage.done
                                ? "Concluída"
                                : formatDate(due)}
                        </span>{" "}
                        · {stage.responsible || "Sem responsável"}
                      </small>
                    </button>
                    <span className="stage-move">
                      <button
                        type="button"
                        onClick={() => moveStage(stage.id, -1)}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStage(stage.id, 1)}
                        disabled={index === work.stages.length - 1}
                      >
                        ↓
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="timeline-add">
              <input
                value={newStage}
                onChange={(event) => setNewStage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addCustomStage();
                }}
                placeholder="Nova etapa personalizada"
              />
              <button type="button" onClick={addCustomStage}>
                ＋ Adicionar etapa
              </button>
            </div>
          </section>
          {selectedStage && (
            <aside className="stage-detail card">
              <div className="stage-detail-head">
                <div>
                  <p>DETALHES DA ETAPA</p>
                  <h2>{selectedStage.label}</h2>
                </div>
                {selectedStage.custom && (
                  <button
                    type="button"
                    onClick={() => {
                      update({
                        stages: work.stages.filter((stage) => stage.id !== selectedStage.id),
                      });
                      setSelectedStageId(work.stages[0]?.id || "");
                    }}
                  >
                    Remover
                  </button>
                )}
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Prazo</span>
                  <input
                    type="date"
                    value={
                      selectedStage.dueDate ||
                      inferredStageDate(
                        work,
                        work.stages.findIndex((stage) => stage.id === selectedStage.id),
                      )
                    }
                    onChange={(event) => {
                      updateStage(selectedStage.id, { dueDate: event.target.value });
                      addActivity(`Prazo de ${selectedStage.label} alterado`, "◇");
                    }}
                  />
                </label>
                <label className="field">
                  <span>Responsável</span>
                  <select
                    value={selectedStage.responsible || "Maryana"}
                    onChange={(event) =>
                      updateStage(selectedStage.id, { responsible: event.target.value })
                    }
                  >
                    {[...new Set(["Maryana", ...work.team])].map((person) => (
                      <option key={person}>{person}</option>
                    ))}
                  </select>
                </label>
                <label className="field full">
                  <span>Observações</span>
                  <textarea
                    rows={3}
                    value={selectedStage.notes || ""}
                    onChange={(event) =>
                      updateStage(selectedStage.id, { notes: event.target.value })
                    }
                    placeholder="Orientações, detalhes ou pendências desta etapa."
                  />
                </label>
              </div>
              <div className="stage-subsection">
                <div>
                  <strong>Checklist</strong>
                  <small>
                    {(selectedStage.checklist || []).filter((item) => item.done).length}/
                    {(selectedStage.checklist || []).length}
                  </small>
                </div>
                <div className="stage-checklist">
                  {(selectedStage.checklist || []).map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={item.done ? "done" : ""}
                      onClick={() =>
                        updateStage(selectedStage.id, {
                          checklist: selectedStage.checklist?.map((check) =>
                            check.id === item.id ? { ...check, done: !check.done } : check,
                          ),
                        })
                      }
                    >
                      <span>{item.done ? "✓" : ""}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="stage-subsection">
                <div>
                  <strong>Anexos da etapa</strong>
                  <small>{selectedStage.attachments?.length || 0}</small>
                </div>
                <input ref={stageFileRef} type="file" multiple hidden onChange={addStageFiles} />
                <button
                  className="stage-upload"
                  type="button"
                  onClick={() => stageFileRef.current?.click()}
                >
                  ＋ Anexar arquivo
                </button>
                {selectedStage.attachments?.map((file) => (
                  <button
                    className="mini-file"
                    type="button"
                    key={file}
                    onClick={() => setPreviewFile(file)}
                  >
                    <span>□ {file}</span>
                    <strong>Visualizar</strong>
                  </button>
                ))}
              </div>
              <button
                className={
                  selectedStage.done ? "cancel-button full-button" : "primary-button full-button"
                }
                type="button"
                onClick={() => toggleStage(selectedStage)}
              >
                {selectedStage.done ? "Reabrir etapa" : "Concluir etapa"}
              </button>
            </aside>
          )}
        </div>
      )}

      {tab === "finance" && (
        <section className="tab-single card finance-tab">
          <div className="detail-section-heading">
            <div>
              <p>FINANCEIRO</p>
              <h2>Pagamentos do trabalho</h2>
            </div>
            <span>{receivedPercent}% recebido</span>
          </div>
          <div className="finance-detail-grid">
            <article>
              <span>VALOR TOTAL</span>
              <strong>{formatMoney(work.totalValue, work.currency)}</strong>
              <small>{work.packageName}</small>
            </article>
            <article>
              <span>RECEBIDO</span>
              <strong>{formatMoney(work.entryValue, work.currency)}</strong>
              <small>
                {receivedPercent >= 50
                  ? "Entrada mínima alcançada"
                  : `Faltam ${formatMoney(work.totalValue / 2 - work.entryValue, work.currency)} para 50%`}
              </small>
            </article>
            <article>
              <span>SALDO</span>
              <strong>
                {formatMoney(Math.max(0, work.totalValue - work.entryValue), work.currency)}
              </strong>
              <small>{work.installments} parcela(s) combinadas</small>
            </article>
          </div>
          <div className="progress large">
            <i style={{ width: `${receivedPercent}%` }} />
          </div>
          <div className="payment-register">
            <label className="field">
              <span>Novo pagamento ({work.currency === "BRL" ? "R$" : "€"})</span>
              <input
                type="number"
                min="0"
                value={payment}
                onChange={(event) => setPayment(event.target.value)}
                placeholder="0,00"
              />
            </label>
            <button className="primary-button" type="button" onClick={registerPayment}>
              Registrar pagamento
            </button>
          </div>
          <div className="payment-milestones">
            <div className={receivedPercent >= 50 ? "ready" : "blocked"}>
              <span>{receivedPercent >= 50 ? "✓" : "⌛"}</span>
              <div>
                <strong>Pagamento dos 50%</strong>
                <small>
                  {receivedPercent >= 50
                    ? "Valor alcançado · aguardando confirmação manual"
                    : "Será liberado ao atingir metade do total"}
                </small>
              </div>
              <button
                type="button"
                disabled={receivedPercent < 50}
                onClick={() => {
                  const stage = work.stages.find((item) => item.label === "Pagamento dos 50%");
                  if (stage) toggleStage(stage);
                }}
              >
                Confirmar
              </button>
            </div>
            <div className={receivedPercent >= 100 ? "ready" : "blocked"}>
              <span>{receivedPercent >= 100 ? "✓" : "⌛"}</span>
              <div>
                <strong>Pagamento completo</strong>
                <small>
                  {receivedPercent >= 100
                    ? "Valor quitado · aguardando confirmação manual"
                    : "Será liberado quando o saldo chegar a zero"}
                </small>
              </div>
              <button
                type="button"
                disabled={receivedPercent < 100}
                onClick={() => {
                  const stage = work.stages.find((item) => item.label === "Pagamento completo");
                  if (stage) toggleStage(stage);
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
          <p className="automation-note">
            ◇ No futuro, pagamentos integrados poderão atualizar estas etapas automaticamente. A
            confirmação permanece manual nesta versão.
          </p>
        </section>
      )}

      {tab === "gallery" && (
        <WorkFilesHub
          work={work}
          clients={clients}
          onStats={syncGalleryStats}
          onEvents={syncGalleryEvents}
          onPhotoExtras={(gallery) => onPhotoExtras(work, gallery)}
          toast={toast}
        />
      )}

      {tab === "files" && (
        <section className="tab-single card">
          <div className="detail-section-heading">
            <div>
              <p>ARQUIVOS</p>
              <h2>Materiais do trabalho</h2>
            </div>
            <button
              className="outline-button"
              type="button"
              onClick={() => workFileRef.current?.click()}
            >
              ＋ Adicionar arquivo
            </button>
          </div>
          <input ref={workFileRef} type="file" multiple hidden onChange={addWorkFiles} />
          <div className="work-file-grid">
            {work.attachments.map((file, index) => (
              <article key={`${file}-${index}`}>
                <span>□</span>
                <button
                  className="file-main-action"
                  type="button"
                  onClick={() => setPreviewFile(file)}
                >
                  <strong>{file}</strong>
                  <small>{attachmentExtension(file).toUpperCase()} · clique para visualizar</small>
                </button>
                <span className="file-actions">
                  <button type="button" onClick={() => setPreviewFile(file)}>
                    Visualizar
                  </button>
                  <button
                    className="remove-file"
                    type="button"
                    aria-label={`Remover ${file}`}
                    onClick={() =>
                      update({
                        attachments: work.attachments.filter((_, fileIndex) => fileIndex !== index),
                      })
                    }
                  >
                    ×
                  </button>
                </span>
              </article>
            ))}
            {work.attachments.length === 0 && (
              <div className="empty-state">
                <span>□</span>
                <h2>Nenhum arquivo anexado</h2>
                <p>Adicione contratos, comprovantes ou referências.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "costs" && (
        <section className="tab-single card">
          <div className="detail-section-heading">
            <div>
              <p>CUSTOS DETALHADOS</p>
              <h2>Origem de cada gasto</h2>
            </div>
            <span>Sincronizado com o Financeiro</span>
          </div>
          <div className="cost-summary">
            <article>
              <span>RECEITA</span>
              <strong>{formatMoney(work.totalValue, work.currency)}</strong>
            </article>
            <b>−</b>
            <article>
              <span>CUSTOS</span>
              <strong>{formatMoney(work.costs, work.currency)}</strong>
            </article>
            <b>=</b>
            <article className="result">
              <span>RESULTADO</span>
              <strong>{formatMoney(work.totalValue - work.costs, work.currency)}</strong>
            </article>
          </div>
          <div className="cost-entry-grid">
            <label className="field">
              <span>Nome do custo</span>
              <input
                value={costDraft.name}
                onChange={(event) => setCostDraft({ ...costDraft, name: event.target.value })}
                placeholder="Ex.: combustível para o casamento"
              />
            </label>
            <label className="field">
              <span>Categoria</span>
              <input
                list="work-cost-categories"
                value={costDraft.category}
                onChange={(event) => setCostDraft({ ...costDraft, category: event.target.value })}
              />
              <datalist id="work-cost-categories">
                <option value="Transporte" />
                <option value="Equipamento" />
                <option value="Alimentação" />
                <option value="Aluguel" />
                <option value="Equipe" />
                <option value="Impressão" />
                <option value="Cliente" />
              </datalist>
            </label>
            <label className="field">
              <span>Tags</span>
              <input
                value={costDraft.tags}
                onChange={(event) => setCostDraft({ ...costDraft, tags: event.target.value })}
                placeholder="viagem, casamento"
              />
            </label>
            <label className="field">
              <span>Valor ({work.currency})</span>
              <input
                type="number"
                min="0"
                value={costDraft.amount || ""}
                onChange={(event) =>
                  setCostDraft({ ...costDraft, amount: Number(event.target.value) })
                }
              />
            </label>
            <label className="field">
              <span>Data</span>
              <input
                type="date"
                value={costDraft.date}
                onChange={(event) => setCostDraft({ ...costDraft, date: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Situação</span>
              <select
                value={costDraft.status}
                onChange={(event) =>
                  setCostDraft({ ...costDraft, status: event.target.value as WorkCost["status"] })
                }
              >
                <option value="planned">Previsto</option>
                <option value="paid">Pago</option>
              </select>
            </label>
            <button className="primary-button cost-add-button" type="button" onClick={addCost}>
              ＋ Adicionar custo
            </button>
          </div>
          <div className="cost-list-head">
            <span>Gasto</span>
            <span>Categoria / tags</span>
            <span>Situação</span>
            <span>Valor</span>
            <span />
          </div>
          <div className="cost-item-list">
            {costItems.map((item) => (
              <article key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  <small>{formatDate(item.date)}</small>
                </span>
                <span>
                  <strong>{item.category}</strong>
                  <small>
                    {item.tags.length ? item.tags.map((tag) => `#${tag}`).join(" ") : "Sem tags"}
                  </small>
                </span>
                <span className={`cost-state ${item.status}`}>
                  {item.status === "paid" ? "Pago" : "Previsto"}
                </span>
                <strong>{formatMoney(item.amount, work.currency)}</strong>
                <button
                  type="button"
                  onClick={() => removeCost(item.id)}
                  aria-label={`Remover ${item.name}`}
                >
                  ×
                </button>
              </article>
            ))}
            {costItems.length === 0 && (
              <div className="finance-empty">
                <p>Nenhum custo cadastrado neste trabalho.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {cancelOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setCancelOpen(false)}
        >
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-work-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span>!</span>
            <h2 id="cancel-work-title">Cancelar este trabalho?</h2>
            <p>
              O trabalho continuará no histórico com o status “Cancelado”. Nenhum dado será apagado.
            </p>
            <div>
              <button className="cancel-button" type="button" onClick={() => setCancelOpen(false)}>
                Voltar
              </button>
              <button className="danger-button" type="button" onClick={() => onCancel(work)}>
                Sim, cancelar trabalho
              </button>
            </div>
          </section>
        </div>
      )}
      {previewFile && (
        <div
          className="modal-backdrop file-preview-backdrop"
          role="presentation"
          onMouseDown={() => setPreviewFile(null)}
        >
          <section
            className="file-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="file-preview-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p>VISUALIZAÇÃO DO ANEXO</p>
                <h2 id="file-preview-title">{previewFile}</h2>
                <span>
                  {currentPreview
                    ? `${attachmentExtension(previewFile).toUpperCase()} · arquivo enviado nesta sessão`
                    : "Arquivo demonstrativo"}
                </span>
              </div>
              <button
                type="button"
                aria-label="Fechar visualização"
                onClick={() => setPreviewFile(null)}
              >
                ×
              </button>
            </header>
            <div className="file-preview-body">
              {currentPreview && currentPreviewKind === "image" && (
                <img src={currentPreview.url} alt={`Prévia de ${previewFile}`} />
              )}
              {currentPreview && currentPreviewKind === "pdf" && (
                <object data={currentPreview.url} type="application/pdf">
                  <div className="unsupported-preview">
                    <span>PDF</span>
                    <h3>Prévia indisponível neste navegador</h3>
                    <p>Use o botão de baixar para abrir o arquivo.</p>
                  </div>
                </object>
              )}
              {!currentPreview && currentPreviewKind === "image" && (
                <div className="demo-image-preview">
                  <span>PRÉVIA DEMONSTRATIVA</span>
                  <div className="demo-photo-shape">
                    <i />
                    <i />
                    <i />
                  </div>
                  <h3>Referência visual do ensaio</h3>
                  <p>Quando um arquivo real for enviado, a imagem original aparecerá aqui.</p>
                </div>
              )}
              {!currentPreview && currentPreviewKind === "pdf" && (
                <div className="demo-document">
                  <div className="demo-document-top">
                    <span>REVELAR.</span>
                    <b>PRÉVIA DEMONSTRATIVA</b>
                  </div>
                  <h3>
                    {previewFile.toLowerCase().includes("comprovante")
                      ? "Comprovante de pagamento"
                      : previewFile.toLowerCase().includes("contrato")
                        ? "Contrato de prestação fotográfica"
                        : "Documento do trabalho"}
                  </h3>
                  <p>Casamento Amanda e João</p>
                  <div className="demo-document-grid">
                    <span>
                      <small>CLIENTE</small>
                      <strong>Amanda e João</strong>
                    </span>
                    <span>
                      <small>DATA</small>
                      <strong>18 de julho de 2026</strong>
                    </span>
                    <span>
                      <small>STATUS</small>
                      <strong>Documento conferido</strong>
                    </span>
                    <span>
                      <small>RESPONSÁVEL</small>
                      <strong>Maryana</strong>
                    </span>
                  </div>
                  <div className="demo-document-lines">
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="demo-signature">Assinatura / confirmação</div>
                </div>
              )}
              {currentPreview && currentPreviewKind === "other" && (
                <div className="unsupported-preview">
                  <span>{attachmentExtension(previewFile).toUpperCase()}</span>
                  <h3>Este formato não possui prévia</h3>
                  <p>O arquivo original continua disponível para baixar.</p>
                </div>
              )}
              {!currentPreview && currentPreviewKind === "other" && (
                <div className="unsupported-preview">
                  <span>{attachmentExtension(previewFile).toUpperCase()}</span>
                  <h3>Arquivo demonstrativo</h3>
                  <p>Envie um arquivo real para habilitar a visualização ou download.</p>
                </div>
              )}
            </div>
            <footer>
              <p>
                {currentPreview
                  ? "O arquivo ficará disponível apenas durante esta sessão demonstrativa."
                  : "Esta é uma prévia ilustrativa; os arquivos reais serão persistidos após conectarmos o banco."}
              </p>
              {currentPreview ? (
                <a className="primary-button" href={currentPreview.url} download={previewFile}>
                  ↓ Baixar arquivo
                </a>
              ) : (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setPreviewFile(null)}
                >
                  Entendi
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
