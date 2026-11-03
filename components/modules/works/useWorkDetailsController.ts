import {
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { deleteAppFile, fileViewUrl, isAppFileRef, uploadAppFile } from "@/lib/app-files.client";
import { addDays, todayIso } from "@/lib/dates";
import { formatDate, formatMoney, normalizePhone } from "@/lib/format";
import { stageChecklist } from "@/lib/workflow";
import { workProgress } from "@/lib/works";
import type {
  Client,
  GalleryEvent,
  AppFileRef,
  ChecklistTemplate,
  MoodboardReference,
  Work,
  WorkGallery,
  WorkMoodboard,
  WorkStage,
  WorkStatus,
} from "@/types/revelar";
import { useUrlStringState } from "@/hooks/use-url-state";
import type { ShowToast } from "@/hooks/use-toast";
import { attachmentExtension } from "./work-attachments";
import { useWorkFinance } from "./useWorkFinance";
import { useWorkDocuments } from "./useWorkDocuments";

type WorkDetailTab =
  | "overview"
  | "moodboard"
  | "timeline"
  | "finance"
  | "contract"
  | "gallery"
  | "files";

type WorkUpdate = Work | ((current: Work) => Work);
type WorkCoordinates = { latitude: number; longitude: number };
type WorkWeather = {
  available: boolean;
  demo?: boolean;
  reason?: string;
  label?: string;
  max?: number;
  min?: number;
  rain?: number;
};

type LocalAttachment = { url: string; type: string; size: number };

function attachmentKind(name: string, type = "") {
  const extension = attachmentExtension(name);
  if (type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(extension))
    return "image";
  if (type === "application/pdf" || extension === "pdf") return "pdf";
  return "other";
}

function moodboardForWork(work: Work): WorkMoodboard {
  if (work.moodboard) {
    return {
      ...work.moodboard,
      palette: [...work.moodboard.palette],
      shotList: work.moodboard.shotList.map((item) => ({ ...item })),
      references: work.moodboard.references.map((item) => ({ ...item })),
    };
  }
  return {
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
        kind: "image",
        title: "Luz e movimento",
        value: "/demo/gallery/casamento.webp",
      },
      {
        id: "ref-2",
        kind: "image",
        title: "Composição",
        value: "/demo/gallery/ensaio-pessoal.webp",
      },
      {
        id: "ref-3",
        kind: "lighting",
        title: "Iluminação",
        value: "Luz lateral suave na hora dourada",
      },
      {
        id: "ref-4",
        kind: "equipment",
        title: "Equipamento",
        value: "35 mm + 85 mm · flash de apoio",
      },
    ],
  };
}

export const workDetailTabs: Array<{ id: WorkDetailTab; label: string; icon: string }> = [
  { id: "overview", label: "Visão geral", icon: "◇" },
  { id: "moodboard", label: "Direção visual", icon: "✦" },
  { id: "timeline", label: "Timeline", icon: "⌁" },
  { id: "finance", label: "Financeiro", icon: "＄" },
  { id: "gallery", label: "Galeria", icon: "▧" },
  { id: "files", label: "Documentos", icon: "□" },
];
// Preserve old work links while showing the former contract tab in Documents.
const workDetailTabIds: WorkDetailTab[] = [...workDetailTabs.map((item) => item.id), "contract"];

export function useWorkDetailsController({
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
  onUpdate: (update: WorkUpdate) => void;
  onDuplicate: (work: Work) => void;
  onArchive: (work: Work) => void;
  onCancel: (work: Work) => void;
  onPhotoExtras: (work: Work, gallery: WorkGallery) => void;
  referenceLibrary: MoodboardReference[];
  setReferenceLibrary: Dispatch<SetStateAction<MoodboardReference[]>>;
  checklistTemplates: ChecklistTemplate[];
  setChecklistTemplates: Dispatch<SetStateAction<ChecklistTemplate[]>>;
  toast: ShowToast;
}) {
  const today = todayIso();
  const soonLimit = addDays(today, 4);
  const [tab, setTab] = useUrlStringState<WorkDetailTab>("workTab", "overview", workDetailTabIds);
  const [selectedStageId, setSelectedStageId] = useState(
    work.stages.find((stage) => !stage.done)?.id || work.stages[0]?.id || "",
  );
  const [newStage, setNewStage] = useState("");

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

  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [overviewCoordinates, setOverviewCoordinates] = useState<WorkCoordinates | null>(null);
  const [overviewPlaceLabel, setOverviewPlaceLabel] = useState(work.location);
  const [overviewWeather, setOverviewWeather] = useState<WorkWeather | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [moodboardDraft, setMoodboardDraft] = useState<WorkMoodboard>(() => moodboardForWork(work));

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

  const linkedClients = clients.filter((client) => work.clientIds.includes(client.id));

  const selectedStage = work.stages.find((stage) => stage.id === selectedStageId) || work.stages[0];

  const progress = workProgress(work);
  const nextStage = work.stages.find((stage) => !stage.done);
  const currentPreview = previewFile ? localFiles[previewFile] : undefined;
  const currentPreviewKind = previewFile
    ? attachmentKind(previewFile, currentPreview?.type)
    : "other";
  const moodboard = moodboardDraft;

  const updateMoodboard = (next: WorkMoodboard) => {
    setMoodboardDraft(next);
    onUpdate((current) => ({ ...current, moodboard: next }));
  };

  useEffect(() => {
    if (tab !== "overview" || !work.location || work.location === "A definir") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setOverviewLoading(true);
      void fetch(`/api/geocode?q=${encodeURIComponent(work.location)}`, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("Local indisponível");
          return (await response.json()) as {
            results?: Array<WorkCoordinates & { label: string }>;
          };
        })
        .then(async (data) => {
          const location = data.results?.[0];
          if (!location || cancelled) return;
          setOverviewCoordinates({
            latitude: location.latitude,
            longitude: location.longitude,
          });
          setOverviewPlaceLabel(location.label);
          try {
            const weatherResponse = await fetch(
              `/api/weather?latitude=${location.latitude}&longitude=${location.longitude}&date=${encodeURIComponent(work.date)}`,
              { cache: "no-store" },
            );
            if (weatherResponse.ok && !cancelled) {
              const weather = (await weatherResponse.json()) as WorkWeather;
              const demoLocation = work.location
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLocaleLowerCase("pt-BR")
                .includes("villa jardim, caruaru");
              setOverviewWeather(
                !weather.available && demoLocation
                  ? {
                      available: true,
                      demo: true,
                      label: "Ensolarado",
                      max: 29,
                      min: 21,
                      rain: 20,
                      reason: "Exemplo visual; a previsão real aparece perto da data.",
                    }
                  : weather,
              );
            }
          } catch {
            if (!cancelled) {
              setOverviewWeather({
                available: false,
                reason: "A previsão está temporariamente indisponível; o mapa continua ativo.",
              });
            }
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOverviewCoordinates(null);
            setOverviewWeather({
              available: false,
              reason: "Não foi possível localizar o endereço.",
            });
          }
        })
        .finally(() => {
          if (!cancelled) setOverviewLoading(false);
        });
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tab, work.date, work.location]);

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
      toast(error instanceof Error ? error.message : "Não foi possível salvar a pose", "error");
    } finally {
      setSavingPose(false);
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
      onUpdate((current) => ({ ...current, photos }));
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
  const update = (changes: Partial<Work>) => onUpdate((current) => ({ ...current, ...changes }));
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
      toast(error instanceof Error ? error.message : "Não foi possível enviar o arquivo", "error");
    }
    event.target.value = "";
  };

  const openAttachment = (file: string | AppFileRef) => {
    if (isAppFileRef(file)) setPreviewStoredFile(file);
    else setPreviewFile(file);
  };

  const {
    incomeDraft,
    setIncomeDraft,
    costDraft,
    setCostDraft,
    editingIncomeId,
    editingCostId,
    financeView,
    setFinanceView,
    costItems,
    incomeItems,
    receivedIncome,
    paidCosts,
    receivedPercent,
    addIncome,
    removeIncome,
    editIncome,
    addCost,
    removeCost,
    editCost,
  } = useWorkFinance({ work, update, addActivity, toast });
  const {
    workFileRef,
    contractSourceFileRef,
    contractSignedFileRef,
    contract,
    sourceContractFile,
    signedContractFile,
    preferredContractFile,
    contractUpload,
    updateContract,
    uploadContractFile,
    removeContractFile,
    addWorkFiles,
  } = useWorkDocuments({ work, onUpdate, update, addActivity, toast });
  const whatsapp = linkedClients[0]?.whatsapp
    ? `https://wa.me/${normalizePhone(linkedClients[0].whatsapp)}`
    : "#";
  return {
    activities,
    addActivity,
    addChecklistItem,
    addCost,
    addCustomStage,
    addIncome,
    addStageFiles,
    addWorkFiles,
    applyChecklistTemplate,
    cancelOpen,
    checklistTemplates,
    clients,
    contract,
    contractSignedFileRef,
    contractSourceFileRef,
    contractUpload,
    costDraft,
    costItems,
    currentPreview,
    currentPreviewKind,
    editCost,
    editIncome,
    editing,
    editingCostId,
    editingIncomeId,
    editingPoseId,
    financeView,
    historyExpanded,
    incomeDraft,
    incomeItems,
    libraryOpen,
    moodboard,
    moveChecklistItem,
    moveStage,
    newChecklistItem,
    newStage,
    nextStage,
    onArchive,
    onBack,
    onCancel,
    onDuplicate,
    onPhotoExtras,
    openAttachment,
    openPoseEditor,
    overviewCoordinates,
    overviewLoading,
    overviewPlaceLabel,
    overviewWeather,
    paidCosts,
    poseDraft,
    poseEditorOpen,
    poseImage,
    preferredContractFile,
    previewFile,
    previewStoredFile,
    progress,
    receivedIncome,
    receivedPercent,
    referenceLibrary,
    removeContractFile,
    removeCost,
    removeIncome,
    removePose,
    saveChecklistTemplate,
    savePose,
    savePoseToLibrary,
    savingPose,
    selectedStage,
    selectedStageId,
    setCancelOpen,
    setCostDraft,
    setEditing,
    setFinanceView,
    setHistoryExpanded,
    setIncomeDraft,
    setLibraryOpen,
    setNewChecklistItem,
    setNewStage,
    setPoseDraft,
    setPoseEditorOpen,
    setPoseImage,
    setPreviewFile,
    setPreviewStoredFile,
    setSavePoseToLibrary,
    setSelectedStageId,
    setTab,
    signedContractFile,
    soonLimit,
    sourceContractFile,
    stageFileRef,
    syncGalleryEvents,
    syncGalleryStats,
    tab,
    toast,
    today,
    toggleStage,
    update,
    updateContract,
    updateMoodboard,
    updateStage,
    uploadContractFile,
    whatsapp,
    work,
    workFileRef,
  };
}

export type WorkDetailsController = ReturnType<typeof useWorkDetailsController>;
