import {
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
} from "react";

import { FileViewer } from "@/components/shared/FileViewer";
import { workStatusLabels } from "@/config/labels";
import {
  deleteAppFile,
  fileDownloadUrl,
  fileViewUrl,
  formatFileSize,
  isAppFileRef,
  uploadAppFile,
} from "@/lib/app-files.client";
import { addDays, todayIso } from "@/lib/dates";
import { formatDate, formatMoney, normalizePhone } from "@/lib/format";
import { stageChecklist } from "@/lib/workflow";
import { inferredStageDate, namesForClients, workProgress } from "@/lib/works";
import type {
  Client,
  GalleryEvent,
  AppFileRef,
  ChecklistTemplate,
  MoodboardReference,
  Work,
  WorkContractStatus,
  WorkCost,
  WorkIncome,
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
  | "contract"
  | "gallery"
  | "files";

type LocalAttachment = { url: string; type: string; size: number };

function attachmentName(file: string | AppFileRef) {
  return typeof file === "string" ? file : file.name;
}

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
  { id: "moodboard", label: "Direção visual", icon: "✦" },
  { id: "timeline", label: "Timeline", icon: "⌁" },
  { id: "finance", label: "Financeiro", icon: "＄" },
  { id: "contract", label: "Contrato", icon: "▱" },
  { id: "gallery", label: "Galeria", icon: "▧" },
  { id: "files", label: "Documentos", icon: "□" },
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
  referenceLibrary,
  setReferenceLibrary,
  checklistTemplates,
  setChecklistTemplates,
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
  referenceLibrary: MoodboardReference[];
  setReferenceLibrary: Dispatch<SetStateAction<MoodboardReference[]>>;
  checklistTemplates: ChecklistTemplate[];
  setChecklistTemplates: Dispatch<SetStateAction<ChecklistTemplate[]>>;
  toast: (message: string) => void;
}) {
  const today = todayIso();
  const soonLimit = addDays(today, 4);
  const [tab, setTab] = useState<WorkDetailTab>("overview");
  const [selectedStageId, setSelectedStageId] = useState(
    work.stages.find((stage) => !stage.done)?.id || work.stages[0]?.id || "",
  );
  const [newStage, setNewStage] = useState("");
  const [incomeDraft, setIncomeDraft] = useState({
    name: "Pagamento do cliente",
    category: "Pagamento" as WorkIncome["category"],
    tags: "",
    amount: 0,
    status: "received" as WorkIncome["status"],
    date: work.date,
  });
  const [costDraft, setCostDraft] = useState({
    name: "",
    category: "Transporte",
    tags: "",
    amount: 0,
    status: "planned" as WorkCost["status"],
    date: work.date,
  });
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewStoredFile, setPreviewStoredFile] = useState<AppFileRef | null>(null);
  const [poseEditorOpen, setPoseEditorOpen] = useState(false);
  const [editingPoseId, setEditingPoseId] = useState<string | null>(null);
  const [poseDraft, setPoseDraft] = useState({ title: "", notes: "", link: "" });
  const [poseImage, setPoseImage] = useState<File | null>(null);
  const [savingPose, setSavingPose] = useState(false);
  const [savePoseToLibrary, setSavePoseToLibrary] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const localFiles: Record<string, LocalAttachment> = {};
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
  const contractFileRef = useRef<HTMLInputElement>(null);
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
  const incomeItems: WorkIncome[] = work.incomeItems?.length
    ? work.incomeItems
    : work.entryValue > 0
      ? [
          {
            id: `legacy-income-${work.id}`,
            name: "Pagamentos recebidos",
            category: "Pagamento",
            tags: [work.category],
            amount: work.entryValue,
            status: "received",
            date: work.date,
            countsTowardContract: true,
          },
        ]
      : [];
  const receivedIncome = incomeItems
    .filter((item) => item.status === "received")
    .reduce((sum, item) => sum + item.amount, 0);
  const paidCosts = costItems
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + item.amount, 0);
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
  const contract = work.contract ?? {
    status: (work.stages.find((stage) => stage.label === "Contrato")?.done
      ? "signed"
      : "pending") as WorkContractStatus,
    title: `Contrato · ${work.title}`,
    content: "",
    updatedAt: new Date().toISOString(),
  };
  const updateMoodboard = (next: typeof moodboard) => onUpdate({ ...work, moodboard: next });

  const openPoseEditor = (reference?: (typeof moodboard.references)[number]) => {
    setEditingPoseId(reference?.id || null);
    setPoseDraft({
      title: reference?.title || "",
      notes: reference?.notes || (reference?.kind === "pose" ? reference.value : ""),
      link: reference?.file ? "" : reference?.kind === "pose" ? "" : reference?.value || "",
    });
    setPoseImage(null);
    setSavePoseToLibrary(false);
    setPoseEditorOpen(true);
  };

  const savePose = async () => {
    if (!poseDraft.title.trim()) return;
    setSavingPose(true);
    try {
      const previous = editingPoseId
        ? moodboard.references.find((reference) => reference.id === editingPoseId)
        : undefined;
      const uploaded = poseImage
        ? await uploadAppFile(poseImage, "moodboard", String(work.id))
        : previous?.file;
      if (poseImage && previous?.file) await deleteAppFile(previous.file).catch(() => undefined);
      const reference = {
        id: editingPoseId || crypto.randomUUID(),
        kind: "pose" as const,
        title: poseDraft.title.trim(),
        value: uploaded ? fileViewUrl(uploaded) : poseDraft.link.trim(),
        notes: poseDraft.notes.trim(),
        file: uploaded,
      };
      updateMoodboard({
        ...moodboard,
        references: previous
          ? moodboard.references.map((item) => (item.id === previous.id ? reference : item))
          : [...moodboard.references, reference],
      });
      if (savePoseToLibrary) {
        setReferenceLibrary((current) => {
          const libraryReference = { ...reference, id: `library-${reference.id}` };
          const exists = current.some((item) => item.id === libraryReference.id);
          return exists
            ? current.map((item) => (item.id === libraryReference.id ? libraryReference : item))
            : [libraryReference, ...current];
        });
      }
      setPoseEditorOpen(false);
      setPoseImage(null);
      toast(previous ? "Ideia de pose atualizada" : "Ideia de pose adicionada ao trabalho");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível salvar a pose");
    } finally {
      setSavingPose(false);
    }
  };

  const updateContract = (changes: Partial<typeof contract>) => {
    onUpdate({
      ...work,
      contract: { ...contract, ...changes, updatedAt: new Date().toISOString() },
    });
  };

  const uploadContractFile = async (file?: File) => {
    if (!file) return;
    try {
      const uploaded = await uploadAppFile(file, "contract", String(work.id));
      if (contract.file) await deleteAppFile(contract.file).catch(() => undefined);
      updateContract({
        file: uploaded,
        status: contract.status === "not_required" ? "pending" : contract.status,
      });
      toast("Contrato enviado e vinculado ao trabalho");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível enviar o contrato");
    }
  };

  const removePose = async (id: string) => {
    const reference = moodboard.references.find((item) => item.id === id);
    if (reference?.file) await deleteAppFile(reference.file).catch(() => undefined);
    updateMoodboard({
      ...moodboard,
      references: moodboard.references.filter((item) => item.id !== id),
    });
    toast("Ideia de pose removida");
  };

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
  const addChecklistItem = () => {
    if (!selectedStage || !newChecklistItem.trim()) return;
    updateStage(selectedStage.id, {
      checklist: [
        ...(selectedStage.checklist || []),
        { id: crypto.randomUUID(), label: newChecklistItem.trim(), done: false },
      ],
    });
    setNewChecklistItem("");
  };
  const moveChecklistItem = (itemId: string, direction: -1 | 1) => {
    if (!selectedStage) return;
    const checklist = [...(selectedStage.checklist || [])];
    const index = checklist.findIndex((item) => item.id === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= checklist.length) return;
    [checklist[index], checklist[target]] = [checklist[target], checklist[index]];
    updateStage(selectedStage.id, { checklist });
  };
  const saveChecklistTemplate = () => {
    if (!selectedStage?.checklist?.length) return;
    const name = window.prompt("Nome deste modelo de checklist", selectedStage.label)?.trim();
    if (!name) return;
    const template: ChecklistTemplate = {
      id: crypto.randomUUID(),
      name,
      items: selectedStage.checklist.map((item) => ({
        id: crypto.randomUUID(),
        label: item.label,
      })),
    };
    setChecklistTemplates((current) => [template, ...current]);
    toast("Modelo de checklist salvo para outros trabalhos");
  };
  const applyChecklistTemplate = (templateId: string) => {
    if (!selectedStage) return;
    const template = checklistTemplates.find((item) => item.id === templateId);
    if (!template) return;
    const completed = (selectedStage.checklist || []).filter((item) => item.done);
    const completedLabels = new Set(completed.map((item) => item.label.trim().toLowerCase()));
    updateStage(selectedStage.id, {
      checklist: [
        ...completed,
        ...template.items
          .filter((item) => !completedLabels.has(item.label.trim().toLowerCase()))
          .map((item) => ({
            id: crypto.randomUUID(),
            label: item.label,
            done: false,
          })),
      ],
    });
    toast(`Modelo “${template.name}” aplicado`);
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
  const addIncome = () => {
    if (!incomeDraft.name.trim() || incomeDraft.amount <= 0) return;
    const countsTowardContract = incomeDraft.category === "Pagamento";
    const item: WorkIncome = {
      id: editingIncomeId || `income-${Date.now()}`,
      name: incomeDraft.name.trim(),
      category: incomeDraft.category,
      tags: incomeDraft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      amount: incomeDraft.amount,
      status: incomeDraft.status,
      date: incomeDraft.date || work.date,
      countsTowardContract,
    };
    const next = editingIncomeId
      ? incomeItems.map((income) => (income.id === editingIncomeId ? item : income))
      : [...incomeItems, item];
    const contractReceived = Math.min(
      work.totalValue,
      next
        .filter((income) => income.status === "received" && income.countsTowardContract)
        .reduce((sum, income) => sum + income.amount, 0),
    );
    update({ incomeItems: next, entryValue: contractReceived });
    setEditingIncomeId(null);
    setIncomeDraft({
      name: "Pagamento do cliente",
      category: "Pagamento",
      tags: "",
      amount: 0,
      status: "received",
      date: work.date,
    });
    addActivity(`${item.category} de ${formatMoney(item.amount, work.currency)} registrada`, "＄");
    toast(
      item.category === "Gorjeta"
        ? "Gorjeta registrada como ganho extra"
        : "Receita registrada e sincronizada com o Financeiro",
    );
  };
  const removeIncome = (id: string) => {
    const removed = incomeItems.find((item) => item.id === id);
    const next = incomeItems.filter((item) => item.id !== id);
    const nextContractReceived = next
      .filter((item) => item.countsTowardContract && item.status === "received")
      .reduce((sum, item) => sum + item.amount, 0);
    update({
      incomeItems: next,
      entryValue: removed?.countsTowardContract
        ? Math.min(work.totalValue, nextContractReceived)
        : work.entryValue,
    });
  };
  const editIncome = (item: WorkIncome) => {
    setEditingIncomeId(item.id);
    setIncomeDraft({
      name: item.name,
      category: item.category,
      tags: item.tags.join(", "),
      amount: item.amount,
      status: item.status,
      date: item.date || work.date,
    });
  };
  const addCost = () => {
    if (!costDraft.name.trim() || costDraft.amount <= 0) return;
    const item: WorkCost = {
      id: editingCostId || `cost-${Date.now()}`,
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
    const next = editingCostId
      ? costItems.map((cost) => (cost.id === editingCostId ? item : cost))
      : [...costItems, item];
    update({ costItems: next, costs: next.reduce((sum, cost) => sum + cost.amount, 0) });
    setEditingCostId(null);
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
  const editCost = (item: WorkCost) => {
    setEditingCostId(item.id);
    setCostDraft({
      name: item.name,
      category: item.category,
      tags: item.tags.join(", "),
      amount: item.amount,
      status: item.status,
      date: item.date || work.date,
    });
  };
  const addWorkFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    try {
      const uploaded: AppFileRef[] = [];
      for (const file of selectedFiles) {
        uploaded.push(await uploadAppFile(file, "work", String(work.id)));
      }
      update({ attachments: [...work.attachments, ...uploaded] });
      addActivity(`${uploaded.length} arquivo(s) enviado(s) e sincronizado(s)`, "□");
      toast("Arquivos salvos no trabalho");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível enviar os arquivos");
    }
    event.target.value = "";
  };
  const addStageFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedStage) return;
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    try {
      const uploaded: AppFileRef[] = [];
      for (const file of selectedFiles) {
        uploaded.push(await uploadAppFile(file, "work-stage", `${work.id}:${selectedStage.id}`));
      }
      updateStage(selectedStage.id, {
        attachments: [...(selectedStage.attachments || []), ...uploaded],
      });
      addActivity(`Arquivo salvo na etapa ${selectedStage.label}`, "□");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível enviar o arquivo");
    }
    event.target.value = "";
  };

  const openAttachment = (file: string | AppFileRef) => {
    if (isAppFileRef(file)) setPreviewStoredFile(file);
    else setPreviewFile(file);
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
                <h2>Conceito e referências</h2>
              </div>
              <span>Somente interno</span>
            </div>
            <div className="moodboard-actionbar">
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://unsplash.com/s/photos/${encodeURIComponent(`${work.category} photography inspiration poses`)}`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                ⌕ Pesquisar
              </button>
              <button type="button" onClick={() => setLibraryOpen((current) => !current)}>
                ▦ Biblioteca ({referenceLibrary.length})
              </button>
              <button
                type="button"
                onClick={() =>
                  toast("Geração com IA preparada; falta conectar o serviço de imagens")
                }
              >
                ✦ Gerar com IA
              </button>
              <button className="primary-button" type="button" onClick={() => openPoseEditor()}>
                ＋ Enviar referência
              </button>
            </div>
            <div className="moodboard-section-title">
              <div>
                <span>REFERÊNCIAS PRINCIPAIS</span>
                <p>Imagens que definem luz, enquadramento, cores e atmosfera.</p>
              </div>
            </div>
            <div className="moodboard-reference-grid">
              {moodboard.references
                .filter((reference) => reference.kind === "image")
                .map((reference) => (
                  <article key={reference.id}>
                    <img
                      src={reference.file ? fileViewUrl(reference.file) : reference.value}
                      alt={reference.title}
                    />
                    <strong>{reference.title}</strong>
                    <button
                      className="reference-remove"
                      type="button"
                      onClick={() =>
                        updateMoodboard({
                          ...moodboard,
                          references: moodboard.references.filter(
                            (item) => item.id !== reference.id,
                          ),
                        })
                      }
                      aria-label={`Remover ${reference.title}`}
                    >
                      ×
                    </button>
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
                .filter((reference) => reference.kind !== "image" && reference.kind !== "pose")
                .map((reference) => (
                  <article key={reference.id}>
                    <span>{reference.kind.toUpperCase()}</span>
                    <strong>{reference.title}</strong>
                    <p>{reference.value}</p>
                  </article>
                ))}
            </div>
            <section className="pose-ideas-section">
              <div className="pose-ideas-heading">
                <div>
                  <span>IDEIAS DE POSES</span>
                  <p>Orientações específicas que podem ser consultadas durante o ensaio.</p>
                </div>
              </div>
              {libraryOpen && (
                <div className="reference-library-picker">
                  {referenceLibrary.map((reference) => (
                    <article key={reference.id}>
                      {reference.file || reference.value.startsWith("http") ? (
                        <img
                          src={reference.file ? fileViewUrl(reference.file) : reference.value}
                          alt=""
                        />
                      ) : (
                        <span>POSE</span>
                      )}
                      <div>
                        <strong>{reference.title}</strong>
                        <small>{reference.notes || "Sem observações"}</small>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          updateMoodboard({
                            ...moodboard,
                            references: [
                              ...moodboard.references,
                              { ...reference, id: crypto.randomUUID() },
                            ],
                          });
                          toast("Referência adicionada a este trabalho");
                        }}
                      >
                        Usar
                      </button>
                    </article>
                  ))}
                  {referenceLibrary.length === 0 && (
                    <p>Salve uma referência na biblioteca para reutilizá-la aqui.</p>
                  )}
                </div>
              )}
              <div className="pose-ideas-grid">
                {moodboard.references
                  .filter((reference) => reference.kind === "pose")
                  .map((reference) => (
                    <article key={reference.id}>
                      {reference.file || reference.value.startsWith("http") ? (
                        <button
                          className="pose-image-button"
                          type="button"
                          onClick={() => {
                            if (reference.file) setPreviewStoredFile(reference.file);
                            else window.open(reference.value, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <img
                            src={reference.file ? fileViewUrl(reference.file) : reference.value}
                            alt={reference.title}
                          />
                        </button>
                      ) : (
                        <div className="pose-placeholder">POSE</div>
                      )}
                      <div>
                        <strong>{reference.title}</strong>
                        <p>{reference.notes || "Sem observações."}</p>
                      </div>
                      <footer>
                        <button type="button" onClick={() => openPoseEditor(reference)}>
                          Editar
                        </button>
                        <button
                          className="danger-action"
                          type="button"
                          onClick={() => void removePose(reference.id)}
                        >
                          Excluir
                        </button>
                      </footer>
                    </article>
                  ))}
                {!moodboard.references.some((reference) => reference.kind === "pose") && (
                  <button
                    className="pose-empty-card"
                    type="button"
                    onClick={() => openPoseEditor()}
                  >
                    <span>＋</span>
                    <strong>Adicionar a primeira ideia de pose</strong>
                    <small>Pode usar uma foto, um link ou apenas uma descrição.</small>
                  </button>
                )}
              </div>
            </section>
          </section>
          <aside className="moodboard-side">
            <details className="card moodboard-collapsible" open>
              <summary>
                <span>PALETA</span>
                <small>Editar cores</small>
              </summary>
              <div className="moodboard-palette moodboard-panel-content">
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
            </details>
            <details className="card moodboard-collapsible" open>
              <summary>
                <span>FOTOS OBRIGATÓRIAS</span>
                <small>
                  {moodboard.shotList.filter((shot) => shot.done).length}/
                  {moodboard.shotList.length}
                </small>
              </summary>
              <div className="moodboard-shots moodboard-panel-content">
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
            </details>
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
                  {(selectedStage.checklist || []).map((item, index) => (
                    <div className={item.done ? "done" : ""} key={item.id}>
                      <button
                        type="button"
                        className="check-toggle"
                        onClick={() =>
                          updateStage(selectedStage.id, {
                            checklist: selectedStage.checklist?.map((check) =>
                              check.id === item.id ? { ...check, done: !check.done } : check,
                            ),
                          })
                        }
                        aria-label={item.done ? `Reabrir ${item.label}` : `Concluir ${item.label}`}
                      >
                        {item.done ? "✓" : ""}
                      </button>
                      <input
                        value={item.label}
                        onChange={(event) =>
                          updateStage(selectedStage.id, {
                            checklist: selectedStage.checklist?.map((check) =>
                              check.id === item.id
                                ? { ...check, label: event.target.value }
                                : check,
                            ),
                          })
                        }
                        aria-label="Nome do item"
                      />
                      <span className="checklist-order-actions">
                        <button
                          type="button"
                          onClick={() => moveChecklistItem(item.id, -1)}
                          disabled={index === 0}
                          aria-label="Mover para cima"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveChecklistItem(item.id, 1)}
                          disabled={index === (selectedStage.checklist?.length || 0) - 1}
                          aria-label="Mover para baixo"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="danger-action"
                          onClick={() =>
                            updateStage(selectedStage.id, {
                              checklist: selectedStage.checklist?.filter(
                                (check) => check.id !== item.id,
                              ),
                            })
                          }
                          aria-label={`Excluir ${item.label}`}
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="checklist-add-row">
                  <input
                    value={newChecklistItem}
                    onChange={(event) => setNewChecklistItem(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addChecklistItem();
                      }
                    }}
                    placeholder="Novo item personalizado"
                  />
                  <button type="button" onClick={addChecklistItem}>
                    ＋ Adicionar
                  </button>
                </div>
                <div className="checklist-template-actions">
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) applyChecklistTemplate(event.target.value);
                      event.target.value = "";
                    }}
                  >
                    <option value="">Aplicar modelo…</option>
                    {checklistTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={saveChecklistTemplate}>
                    Salvar como modelo
                  </button>
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
                {selectedStage.attachments?.map((file, index) => (
                  <button
                    className="mini-file"
                    type="button"
                    key={`${isAppFileRef(file) ? file.id : file}-${index}`}
                    onClick={() => openAttachment(file)}
                  >
                    <span>□ {attachmentName(file)}</span>
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
              <p>FINANCEIRO DO TRABALHO</p>
              <h2>Recebimentos, ganhos e custos</h2>
            </div>
            <span>Sincronizado com o Financeiro geral</span>
          </div>
          <div className="work-finance-summary">
            <article>
              <span>CONTRATADO</span>
              <strong>{formatMoney(work.totalValue, work.currency)}</strong>
              <small>{work.packageName}</small>
            </article>
            <article>
              <span>PAGO PELO CLIENTE</span>
              <strong>{formatMoney(work.entryValue, work.currency)}</strong>
              <small>{receivedPercent}% do contrato</small>
            </article>
            <article>
              <span>OUTROS GANHOS</span>
              <strong>
                {formatMoney(Math.max(0, receivedIncome - work.entryValue), work.currency)}
              </strong>
              <small>Gorjetas, adicionais e reembolsos</small>
            </article>
            <article className="result">
              <span>RESULTADO ATUAL</span>
              <strong>{formatMoney(receivedIncome - paidCosts, work.currency)}</strong>
              <small>Entradas recebidas menos custos pagos</small>
            </article>
          </div>

          <div className="work-finance-section">
            <div className="work-finance-section-heading">
              <div>
                <span>RECEBIMENTOS E GANHOS</span>
                <h3>Entradas deste trabalho</h3>
              </div>
              <small>{incomeItems.length} lançamento(s)</small>
            </div>
            <div className="income-entry-grid">
              <label className="field">
                <span>Descrição</span>
                <input
                  value={incomeDraft.name}
                  onChange={(event) => setIncomeDraft({ ...incomeDraft, name: event.target.value })}
                  placeholder="Ex.: gorjeta da cliente"
                />
              </label>
              <label className="field">
                <span>Tipo</span>
                <select
                  value={incomeDraft.category}
                  onChange={(event) =>
                    setIncomeDraft({
                      ...incomeDraft,
                      category: event.target.value as WorkIncome["category"],
                      name:
                        event.target.value === "Gorjeta" &&
                        incomeDraft.name === "Pagamento do cliente"
                          ? "Gorjeta da cliente"
                          : incomeDraft.name,
                    })
                  }
                >
                  {(["Pagamento", "Gorjeta", "Adicional", "Reembolso", "Outro"] as const).map(
                    (category) => (
                      <option key={category}>{category}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="field">
                <span>Tags</span>
                <input
                  value={incomeDraft.tags}
                  onChange={(event) => setIncomeDraft({ ...incomeDraft, tags: event.target.value })}
                  placeholder="cliente, casamento"
                />
              </label>
              <label className="field">
                <span>Valor ({work.currency})</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={incomeDraft.amount || ""}
                  onChange={(event) =>
                    setIncomeDraft({ ...incomeDraft, amount: Number(event.target.value) })
                  }
                />
              </label>
              <label className="field">
                <span>Data</span>
                <input
                  type="date"
                  value={incomeDraft.date}
                  onChange={(event) => setIncomeDraft({ ...incomeDraft, date: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Situação</span>
                <select
                  value={incomeDraft.status}
                  onChange={(event) =>
                    setIncomeDraft({
                      ...incomeDraft,
                      status: event.target.value as WorkIncome["status"],
                    })
                  }
                >
                  <option value="received">Recebido</option>
                  <option value="pending">Pendente</option>
                </select>
              </label>
              <button className="primary-button" type="button" onClick={addIncome}>
                {editingIncomeId ? "✓ Salvar ganho" : "＋ Adicionar ganho"}
              </button>
            </div>
            <div className="work-money-list">
              {incomeItems.map((item) => (
                <article key={item.id}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {formatDate(item.date)} · {item.category}
                      {item.tags.length ? ` · #${item.tags.join(" #")}` : ""}
                    </small>
                  </span>
                  <span className={`income-state ${item.status}`}>
                    {item.status === "received" ? "Recebido" : "Pendente"}
                  </span>
                  <strong>＋ {formatMoney(item.amount, work.currency)}</strong>
                  <span className="money-row-actions">
                    <button
                      type="button"
                      onClick={() => editIncome(item)}
                      aria-label={`Editar ${item.name}`}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => removeIncome(item.id)}
                      aria-label={`Remover ${item.name}`}
                    >
                      ×
                    </button>
                  </span>
                </article>
              ))}
              {incomeItems.length === 0 && <p>Nenhuma entrada registrada.</p>}
            </div>
          </div>

          <div className="work-finance-section">
            <div className="work-finance-section-heading">
              <div>
                <span>CUSTOS</span>
                <h3>Gastos deste trabalho</h3>
              </div>
              <small>{formatMoney(work.costs, work.currency)} cadastrados</small>
            </div>
            <div className="cost-entry-grid compact-finance-entry">
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
                  step="0.01"
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
              <button className="primary-button" type="button" onClick={addCost}>
                {editingCostId ? "✓ Salvar custo" : "＋ Adicionar custo"}
              </button>
            </div>
            <div className="work-money-list costs-list">
              {costItems.map((item) => (
                <article key={item.id}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {formatDate(item.date)} · {item.category}
                      {item.tags.length ? ` · #${item.tags.join(" #")}` : ""}
                    </small>
                  </span>
                  <span className={`cost-state ${item.status}`}>
                    {item.status === "paid" ? "Pago" : "Previsto"}
                  </span>
                  <strong>− {formatMoney(item.amount, work.currency)}</strong>
                  <span className="money-row-actions">
                    <button
                      type="button"
                      onClick={() => editCost(item)}
                      aria-label={`Editar ${item.name}`}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCost(item.id)}
                      aria-label={`Remover ${item.name}`}
                    >
                      ×
                    </button>
                  </span>
                </article>
              ))}
              {costItems.length === 0 && <p>Nenhum custo cadastrado.</p>}
            </div>
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
            ◇ Pagamentos contam para o contrato; gorjetas e ganhos adicionais aumentam o resultado
            sem alterar o saldo que a cliente ainda deve.
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

      {tab === "contract" && (
        <section className="work-contract-panel card">
          <div className="detail-section-heading">
            <div>
              <p>CONTRATO DO TRABALHO</p>
              <h2>{contract.title}</h2>
            </div>
            <label className={`work-contract-status status-${contract.status}`}>
              <span>Situação</span>
              <select
                value={contract.status}
                onChange={(event) =>
                  updateContract({ status: event.target.value as WorkContractStatus })
                }
              >
                <option value="not_required">Não necessário</option>
                <option value="pending">Pendente</option>
                <option value="sent">Enviado</option>
                <option value="signed">Assinado</option>
              </select>
            </label>
          </div>
          {contract.status === "not_required" ? (
            <div className="contract-not-required">
              <span>✓</span>
              <div>
                <strong>Este trabalho foi marcado como sem contrato</strong>
                <p>
                  Se a necessidade mudar, crie o contrato sem perder nenhuma informação do trabalho.
                </p>
              </div>
              <button type="button" onClick={() => updateContract({ status: "pending" })}>
                Criar contrato
              </button>
            </div>
          ) : (
            <>
              <div className="work-contract-editor">
                <label>
                  <span>Nome do documento</span>
                  <input
                    value={contract.title}
                    onChange={(event) => updateContract({ title: event.target.value })}
                  />
                </label>
                <label>
                  <span>Conteúdo editável</span>
                  <textarea
                    rows={16}
                    value={contract.content}
                    onChange={(event) => updateContract({ content: event.target.value })}
                    placeholder="Escreva ou cole aqui o conteúdo do contrato."
                  />
                </label>
              </div>
              <div className="work-contract-file">
                <div>
                  <strong>{contract.file?.name || "Nenhum arquivo anexado"}</strong>
                  <small>
                    {contract.file
                      ? `${formatFileSize(contract.file.size)} · sincronizado`
                      : "PDF ou DOCX pode ser visualizado dentro do Revelar."}
                  </small>
                </div>
                {contract.file && (
                  <>
                    <button type="button" onClick={() => setPreviewStoredFile(contract.file!)}>
                      Visualizar
                    </button>
                    <a href={fileDownloadUrl(contract.file)} download={contract.file.name}>
                      Baixar
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        void deleteAppFile(contract.file!).catch(() => undefined);
                        updateContract({ file: undefined });
                      }}
                    >
                      Excluir
                    </button>
                  </>
                )}
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => contractFileRef.current?.click()}
                >
                  {contract.file ? "Substituir" : "Enviar contrato"}
                </button>
                <input
                  ref={contractFileRef}
                  hidden
                  type="file"
                  accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => {
                    void uploadContractFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>
            </>
          )}
        </section>
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
              <article key={`${isAppFileRef(file) ? file.id : file}-${index}`}>
                <span>□</span>
                <button
                  className="file-main-action"
                  type="button"
                  onClick={() => openAttachment(file)}
                >
                  <strong>{attachmentName(file)}</strong>
                  <small>
                    {attachmentExtension(attachmentName(file)).toUpperCase()}
                    {isAppFileRef(file)
                      ? ` · ${formatFileSize(file.size)} · sincronizado`
                      : " · demonstrativo"}
                  </small>
                </button>
                <span className="file-actions">
                  <button type="button" onClick={() => openAttachment(file)}>
                    Visualizar
                  </button>
                  {isAppFileRef(file) && (
                    <a href={fileDownloadUrl(file)} download={file.name}>
                      Baixar
                    </a>
                  )}
                  <button
                    className="remove-file"
                    type="button"
                    aria-label={`Remover ${attachmentName(file)}`}
                    onClick={() => {
                      if (isAppFileRef(file)) void deleteAppFile(file).catch(() => undefined);
                      update({
                        attachments: work.attachments.filter((_, fileIndex) => fileIndex !== index),
                      });
                    }}
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
      {poseEditorOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setPoseEditorOpen(false)}
        >
          <section
            className="pose-editor-dialog"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p>{editingPoseId ? "EDITAR REFERÊNCIA" : "NOVA REFERÊNCIA"}</p>
                <h2>Ideia de pose</h2>
              </div>
              <button type="button" onClick={() => setPoseEditorOpen(false)}>
                ×
              </button>
            </header>
            <div className="field-grid">
              <label className="field full">
                <span>Nome da pose *</span>
                <input
                  value={poseDraft.title}
                  onChange={(event) => setPoseDraft({ ...poseDraft, title: event.target.value })}
                  placeholder="Ex.: Caminhando e olhando um para o outro"
                />
              </label>
              <label className="field full">
                <span>Orientações e observações</span>
                <textarea
                  rows={4}
                  value={poseDraft.notes}
                  onChange={(event) => setPoseDraft({ ...poseDraft, notes: event.target.value })}
                  placeholder="Movimento, enquadramento, posição das mãos, expressão…"
                />
              </label>
              <label className="field full">
                <span>Link de referência (opcional)</span>
                <input
                  type="url"
                  value={poseDraft.link}
                  onChange={(event) => setPoseDraft({ ...poseDraft, link: event.target.value })}
                  placeholder="https://..."
                />
              </label>
              <label className="field full pose-file-field">
                <span>Imagem de referência (opcional)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={(event) => setPoseImage(event.target.files?.[0] || null)}
                />
                <small>{poseImage?.name || "JPG, PNG, WEBP ou SVG · fica salvo no trabalho"}</small>
              </label>
              <label className="checkbox-field full">
                <input
                  type="checkbox"
                  checked={savePoseToLibrary}
                  onChange={(event) => setSavePoseToLibrary(event.target.checked)}
                />
                <span>
                  <strong>Salvar também na Biblioteca de referências</strong>
                  <small>Permite reutilizar esta ideia em outros trabalhos.</small>
                </span>
              </label>
            </div>
            <footer>
              <button type="button" onClick={() => setPoseEditorOpen(false)}>
                Cancelar
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={savingPose || !poseDraft.title.trim()}
                onClick={() => void savePose()}
              >
                {savingPose ? "Salvando…" : "Salvar referência"}
              </button>
            </footer>
          </section>
        </div>
      )}
      {previewStoredFile && (
        <FileViewer file={previewStoredFile} onClose={() => setPreviewStoredFile(null)} />
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
