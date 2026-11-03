"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createProtectedPreview } from "@/lib/gallery-preview";
import { formatMoney } from "@/lib/format";
import { readApiJson } from "@/lib/api-response.client";
import {
  GALLERY_MULTIPART_THRESHOLD,
  uploadGalleryFileMultipart,
} from "@/lib/gallery-multipart.client";
import type { ShowToast } from "@/hooks/use-toast";
import type {
  Client,
  GalleryEvent,
  GalleryFolder,
  GalleryPhase,
  Work,
  WorkGallery,
} from "@/types/revelar";

type ManagerFolder = GalleryFolder | "trash";
type UploadQueueStatus = "preparing" | "uploading" | "done" | "partial" | "error";
type UploadQueueItem = {
  id: string;
  file: File;
  folder: GalleryFolder;
  status: UploadQueueStatus;
  error?: string;
  photoId?: string;
};

const uploadStatusLabel: Record<UploadQueueStatus, string> = {
  preparing: "Preparando arquivo",
  uploading: "Enviando com segurança",
  done: "Envio concluído",
  partial: "Prévia salva · original pendente",
  error: "Envio não concluído",
};

const folders: Array<{
  id: ManagerFolder;
  label: string;
  icon: string;
  accent: string;
}> = [
  { id: "preview", label: "Fotos enviadas", icon: "◫", accent: "Provas que o cliente verá" },
  { id: "selection", label: "Escolhidas", icon: "♡", accent: "Seleção feita pelo cliente" },
  { id: "edited", label: "Para aprovação", icon: "✦", accent: "Fotos editadas em revisão" },
  { id: "delivered", label: "Entrega final", icon: "⇩", accent: "Alta e redes sociais" },
  { id: "trash", label: "Lixeira", icon: "⌫", accent: "Recuperável por 30 dias" },
];

function GalleryFolderIcon({ folder }: { folder: ManagerFolder }) {
  if (folder === "selection") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    );
  }
  if (folder === "edited") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Zm6.5 11 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1ZM5 13l1.1 2.9L9 17l-2.9 1.1L5 21l-1.1-2.9L1 17l2.9-1.1L5 13Z" />
      </svg>
    );
  }
  if (folder === "delivered") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3" />
      </svg>
    );
  }
  if (folder === "trash") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8" cy="9" r="1.5" />
      <path d="m5 17 4.3-4.3 3.2 3.2 2.2-2.2L19 18" />
    </svg>
  );
}

const phaseLabels: Record<GalleryPhase, string> = {
  selection: "Cliente escolhendo",
  approval: "Cliente aprovando",
  delivery: "Entrega liberada",
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function folderCount(gallery: WorkGallery, folder: ManagerFolder) {
  if (folder === "trash") return gallery.photos.filter((photo) => photo.deletedAt).length;
  if (folder === "selection")
    return gallery.photos.filter((photo) => photo.selected && !photo.deletedAt).length;
  return gallery.photos.filter((photo) => photo.folder === folder && !photo.deletedAt).length;
}

function localDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function friendlyUploadError(error: unknown, filename: string) {
  const message = error instanceof Error ? error.message : "";
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return `${filename}: a conexão foi interrompida antes de o servidor concluir o envio.`;
  }
  if (/quota|storage|armazenamento|r2/i.test(message)) {
    return `${filename}: o armazenamento recusou o arquivo temporariamente.`;
  }
  return message || `${filename}: não foi possível concluir o envio.`;
}

export function WorkFilesHub({
  work,
  clients,
  onStats,
  onEvents,
  onPhotoExtras,
  toast,
}: {
  work: Work;
  clients: Client[];
  onStats: (photos: Work["photos"]) => void;
  onEvents: (events: GalleryEvent[]) => void;
  onPhotoExtras: (gallery: WorkGallery) => void;
  toast: ShowToast;
}) {
  const clientName =
    clients
      .filter((client) => work.clientIds.includes(client.id))
      .map((client) => client.name)
      .join(" e ") || "Cliente";
  const [gallery, setGallery] = useState<WorkGallery | null>(null);
  const [folder, setFolder] = useState<ManagerFolder>("preview");
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [replyDraft, setReplyDraft] = useState("");
  const [responderName, setResponderName] = useState("Profissional");
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [pinTouched, setPinTouched] = useState(false);
  const [settings, setSettings] = useState({
    pin: "",
    expiresAt: "",
    selectionLimit: work.photos.selected || 30,
    extraPrice: 0,
    revisionLimit: 2,
    watermarkLabel: "Revelar.",
    storageMode: "smart" as "smart" | "backup",
  });
  const photoInput = useRef<HTMLInputElement>(null);
  const watermarkInput = useRef<HTMLInputElement>(null);
  const conversationThread = useRef<HTMLDivElement>(null);
  const replyInput = useRef<HTMLTextAreaElement>(null);
  const callbacks = useRef({ onStats, onEvents, onPhotoExtras });

  useEffect(() => {
    callbacks.current = { onStats, onEvents, onPhotoExtras };
  }, [onEvents, onPhotoExtras, onStats]);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/galleries?workId=${work.id}`, { cache: "no-store" });
    if (response.status === 401) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    if (!response.ok) {
      setLoading(false);
      return;
    }
    const data = (await response.json()) as {
      gallery: WorkGallery | null;
      responderName?: string;
    };
    setGallery(data.gallery);
    if (data.responderName) setResponderName(data.responderName);
    if (data.gallery) {
      setSettings({
        pin: "",
        expiresAt: localDateTime(data.gallery.expiresAt),
        selectionLimit: data.gallery.selectionLimit,
        extraPrice: data.gallery.extraPriceCents / 100,
        revisionLimit: data.gallery.revisionLimit,
        watermarkLabel: data.gallery.watermarkLabel,
        storageMode: data.gallery.storageMode,
      });
    }
    setLoading(false);
  }, [work.id]);

  const openPhoto = (photoId: string) => {
    setReplyDraft("");
    setActivePhotoId(photoId);
  };

  const closePhoto = () => {
    setReplyDraft("");
    setActivePhotoId(null);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!gallery) return;
    callbacks.current.onStats({
      captured: gallery.stats.captured,
      selected: gallery.stats.selected,
      edited: gallery.stats.edited,
      delivered: gallery.stats.delivered,
    });
    callbacks.current.onEvents(gallery.events);
    if (gallery.selectionLocked && gallery.stats.extraAmount > 0) {
      callbacks.current.onPhotoExtras(gallery);
    }
  }, [gallery]);

  useEffect(() => {
    const watermark = gallery?.assets.find((asset) => asset.kind === "watermark");
    if (!gallery || !watermark || watermarkFile) return;
    let cancelled = false;
    void fetch(`/api/galleries/${gallery.id}/assets/${watermark.id}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!cancelled && blob) {
          setWatermarkFile(new File([blob], watermark.filename, { type: blob.type }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gallery, watermarkFile]);

  const create = async () => {
    setBusy(true);
    const response = await fetch("/api/galleries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workId: work.id,
        workTitle: work.title,
        clientName,
        currency: work.currency,
      }),
    });
    if (response.status === 401) setAuthRequired(true);
    else if (response.ok) {
      const data = (await response.json()) as {
        gallery: WorkGallery;
        responderName?: string;
      };
      setGallery(data.gallery);
      if (data.responderName) setResponderName(data.responderName);
      toast("Galeria privada criada");
    }
    setBusy(false);
  };

  const patchGallery = async (changes: Record<string, unknown>) => {
    if (!gallery) return;
    setBusy(true);
    const response = await fetch(`/api/galleries/${gallery.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(changes),
    });
    if (response.ok) {
      const data = (await response.json()) as { gallery: WorkGallery };
      setGallery(data.gallery);
    }
    setBusy(false);
  };

  const saveSettings = async () => {
    const changes: Record<string, unknown> = {
      expiresAt: settings.expiresAt ? new Date(settings.expiresAt).toISOString() : null,
      selectionLimit: settings.selectionLimit,
      extraPriceCents: Math.round(settings.extraPrice * 100),
      revisionLimit: settings.revisionLimit,
      watermarkLabel: settings.watermarkLabel,
      storageMode: settings.storageMode,
    };
    if (pinTouched) changes.pin = settings.pin || null;
    await patchGallery(changes);
    setPinTouched(false);
    setSettingsOpen(false);
    toast("Galeria atualizada");
  };

  const uploadWatermark = async (file: File) => {
    if (!gallery) return;
    const form = new FormData();
    form.set("file", file);
    form.set("assetKind", "watermark");
    const response = await fetch(`/api/galleries/${gallery.id}/upload`, {
      method: "POST",
      body: form,
    });
    if (response.ok) {
      const data = (await response.json()) as { gallery: WorkGallery };
      setGallery(data.gallery);
      setWatermarkFile(file);
      toast("Marca-d’água personalizada aplicada às próximas prévias");
    }
  };

  const updateUploadQueueItem = (id: string, changes: Partial<UploadQueueItem>) => {
    setUploadQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  };

  const uploadPhotos = async (
    files: File[],
    options?: { retryId?: string; targetFolder?: GalleryFolder; existingPhotoId?: string },
  ) => {
    if (!gallery || files.length === 0) return;
    const targetFolder = options?.targetFolder ?? (folder === "trash" ? "preview" : folder);
    if (targetFolder === "selection") return;
    const queueItems = files.map((file, index) => ({
      id: options?.retryId && index === 0 ? options.retryId : crypto.randomUUID(),
      file,
      folder: targetFolder,
      photoId: options?.existingPhotoId,
      status: "preparing" as const,
    }));
    setUploadQueue((current) => {
      const retryIds = new Set(queueItems.map((item) => item.id));
      return [
        ...queueItems,
        ...current.filter((item) => !retryIds.has(item.id) && item.status !== "done"),
      ].slice(0, 20);
    });
    setBusy(true);
    setUploadProgress(0);
    setUploadStatus("");
    let latest = gallery;
    let uploaded = 0;
    let failed = 0;
    for (let index = 0; index < queueItems.length; index += 1) {
      const item = queueItems[index];
      const { file } = item;
      let photoId = item.photoId;
      const reportFileProgress = (fileProgress: number) => {
        const normalized = Math.max(0, Math.min(100, fileProgress)) / 100;
        setUploadProgress(Math.round(((index + normalized) / queueItems.length) * 100));
      };
      try {
        setUploadStatus(`Preparando ${file.name}`);
        updateUploadQueueItem(item.id, { status: "preparing", error: undefined });
        if (file.size > 90 * 1024 * 1024) {
          throw new Error(`${file.name}: o limite por arquivo é 90 MB.`);
        }
        const canPreview =
          /^image\/(jpeg|png|webp)$/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
        if (!canPreview) {
          throw new Error(`${file.name}: formato não aceito. Use JPG, PNG ou WebP.`);
        }

        if (targetFolder === "delivered") {
          updateUploadQueueItem(item.id, { status: "uploading" });
          if (file.size > GALLERY_MULTIPART_THRESHOLD) {
            setUploadStatus(`Enviando ${file.name} em partes seguras`);
            latest = await uploadGalleryFileMultipart({
              galleryId: gallery.id,
              file,
              folder: targetFolder,
              variant: "high",
              onProgress: reportFileProgress,
            });
          } else {
            const deliveryForm = new FormData();
            deliveryForm.set("folder", targetFolder);
            deliveryForm.set("file", file);
            deliveryForm.set("variant", "high");
            setUploadStatus(`Enviando ${file.name}`);
            const response = await fetch(`/api/galleries/${gallery.id}/upload`, {
              method: "POST",
              body: deliveryForm,
            });
            const data = await readApiJson<{ gallery?: WorkGallery; error?: string }>(
              response,
              `Não foi possível enviar ${file.name}.`,
            );
            if (!response.ok || !data.gallery) {
              throw new Error(data.error || `Não foi possível enviar ${file.name}.`);
            }
            latest = data.gallery;
          }
        } else {
          if (!photoId) {
            const preview = await createProtectedPreview({
              file,
              label: settings.watermarkLabel,
              clientName,
              watermarkFile,
            });
            const previewForm = new FormData();
            previewForm.set("folder", targetFolder);
            previewForm.set("preview", preview);
            previewForm.set("filename", file.name);
            previewForm.set("mimeType", file.type || "image/jpeg");
            updateUploadQueueItem(item.id, { status: "uploading" });
            setUploadStatus(`Enviando prévia de ${file.name}`);
            const previewResponse = await fetch(`/api/galleries/${gallery.id}/upload`, {
              method: "POST",
              body: previewForm,
            });
            const previewData = await readApiJson<{
              gallery?: WorkGallery;
              photoId?: string;
              error?: string;
            }>(previewResponse, `Não foi possível enviar a prévia de ${file.name}.`);
            if (!previewResponse.ok || !previewData.gallery || !previewData.photoId) {
              throw new Error(
                previewData.error || `A prévia de ${file.name} não pôde ser armazenada.`,
              );
            }
            latest = previewData.gallery;
            photoId = previewData.photoId;
            setGallery(latest);
            updateUploadQueueItem(item.id, { photoId });
          }

          setUploadStatus(`Salvando original de ${file.name}`);
          if (file.size > GALLERY_MULTIPART_THRESHOLD) {
            latest = await uploadGalleryFileMultipart({
              galleryId: gallery.id,
              file,
              folder: targetFolder,
              photoId,
              variant: "original",
              onProgress: reportFileProgress,
            });
          } else {
            const originalForm = new FormData();
            originalForm.set("folder", targetFolder);
            originalForm.set("file", file);
            originalForm.set("photoId", photoId);
            originalForm.set("variant", "original");
            originalForm.set("filename", file.name);
            originalForm.set("mimeType", file.type || "image/jpeg");
            const originalResponse = await fetch(`/api/galleries/${gallery.id}/upload`, {
              method: "POST",
              body: originalForm,
            });
            const originalData = await readApiJson<{ gallery?: WorkGallery; error?: string }>(
              originalResponse,
              `A prévia subiu, mas o original de ${file.name} não foi armazenado.`,
            );
            if (!originalResponse.ok || !originalData.gallery) {
              throw new Error(
                originalData.error ||
                  `A prévia subiu, mas o original de ${file.name} ficou pendente.`,
              );
            }
            latest = originalData.gallery;
          }
        }
        updateUploadQueueItem(item.id, { status: "done", error: undefined, photoId });
        uploaded += 1;
      } catch (error) {
        failed += 1;
        updateUploadQueueItem(item.id, {
          status: photoId ? "partial" : "error",
          error: friendlyUploadError(error, file.name),
          photoId,
        });
      }
      reportFileProgress(100);
    }
    setGallery(latest);
    setBusy(false);
    setUploadProgress(0);
    setUploadStatus("");
    if (failed > 0) {
      toast(
        `${failed} foto${failed === 1 ? " não foi enviada" : "s não foram enviadas"}. Veja o motivo em Envios recentes e tente novamente.`,
        "error",
      );
    } else if (uploaded > 0) {
      toast(`${uploaded} foto${uploaded === 1 ? " enviada" : "s enviadas"} com sucesso`);
    }
  };

  const updatePhotoTrash = async (action: "trash" | "restore", photoIds: string[]) => {
    if (!gallery || !photoIds.length) return;
    setBusy(true);
    const response = await fetch(`/api/galleries/${gallery.id}/photos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, photoIds }),
    });
    if (response.ok) {
      const data = (await response.json()) as { gallery: WorkGallery };
      setGallery(data.gallery);
      setSelectedPhotoIds(new Set());
      setSelectionMode(false);
      closePhoto();
      toast(
        action === "trash"
          ? `${photoIds.length} foto(s) movida(s) para a lixeira`
          : `${photoIds.length} foto(s) restaurada(s)`,
      );
    } else {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      toast(data.error || "Não foi possível atualizar as fotos", "error");
    }
    setBusy(false);
  };

  const replyToPhoto = async () => {
    if (!gallery || !activePhoto || !replyDraft.trim()) return;
    setBusy(true);
    const response = await fetch(`/api/galleries/${gallery.id}/photos/${activePhoto.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: replyDraft }),
    });
    if (response.ok) {
      const data = (await response.json()) as {
        gallery: WorkGallery;
        responderName?: string;
      };
      setGallery(data.gallery);
      if (data.responderName) setResponderName(data.responderName);
      setReplyDraft("");
      toast("Resposta enviada para a cliente");
    } else {
      toast("Não foi possível enviar a resposta", "error");
    }
    setBusy(false);
  };

  const photos = useMemo(() => {
    if (!gallery) return [];
    if (folder === "trash") return gallery.photos.filter((photo) => photo.deletedAt);
    if (folder === "selection")
      return gallery.photos.filter((photo) => photo.selected && !photo.deletedAt);
    return gallery.photos.filter((photo) => photo.folder === folder && !photo.deletedAt);
  }, [folder, gallery]);
  const activePhoto = gallery?.photos.find((photo) => photo.id === activePhotoId) || null;
  const activeConversation = useMemo(
    () =>
      activePhoto
        ? activePhoto.comments.length
          ? activePhoto.comments
          : activePhoto.comment
              .split("\n")
              .filter(Boolean)
              .map((message, index) => ({
                id: `legacy-${index}`,
                authorRole: "client" as const,
                authorName: clientName,
                message,
                createdAt: "",
              }))
        : [],
    [activePhoto, clientName],
  );
  const recentEvents = useMemo(() => {
    const grouped = new Map<
      string,
      { id: string; detail: string; createdAt: string; count: number }
    >();
    for (const event of gallery?.events || []) {
      const current = grouped.get(event.detail);
      if (current) current.count += 1;
      else grouped.set(event.detail, { ...event, count: 1 });
    }
    return [...grouped.values()].slice(0, 4);
  }, [gallery?.events]);

  useEffect(() => {
    if (!activePhotoId) return;
    const frame = window.requestAnimationFrame(() => {
      const thread = conversationThread.current;
      if (thread) thread.scrollTop = thread.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeConversation.length, activePhotoId]);

  useEffect(() => {
    const input = replyInput.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }, [replyDraft]);

  if (loading) return <div className="gallery-manager-loading">Preparando arquivos…</div>;

  if (authRequired) {
    return (
      <section className="gallery-auth-card">
        <img src="/brand/revelar-symbol.svg" alt="" />
        <div>
          <h2>Proteja as galerias na sua conta</h2>
          <p>Entre para ativar armazenamento privado e links de cliente.</p>
        </div>
        <a href={`/signin-with-chatgpt?return_to=${encodeURIComponent(window.location.pathname)}`}>
          Entrar e ativar
        </a>
      </section>
    );
  }

  if (!gallery) {
    return (
      <section className="gallery-create-card">
        <div className="gallery-folder-preview">
          {folders.slice(0, 4).map((item) => (
            <span key={item.id}>{item.icon}</span>
          ))}
        </div>
        <div>
          <span>ARQUIVOS DO TRABALHO</span>
          <h2>
            {clientName} ({work.title})
          </h2>
          <p>Prévia → Seleção → Editadas → Entregues</p>
        </div>
        <button type="button" disabled={busy} onClick={create}>
          Criar galeria
        </button>
      </section>
    );
  }

  const publicUrl =
    typeof window === "undefined" ? gallery.url : `${window.location.origin}${gallery.url}`;

  return (
    <section className="work-gallery-manager">
      <header className="gallery-manager-header">
        <div>
          <span>ÁREA COMPARTILHADA COM O CLIENTE</span>
          <h2>
            {clientName} ({work.title})
          </h2>
          <p className="gallery-phase-help">
            Escolha o que o cliente pode fazer agora. As pastas abaixo continuam sendo apenas a
            organização interna dos arquivos.
          </p>
          <div className="gallery-stage-switch" aria-label="Etapa visível para o cliente">
            {(Object.keys(phaseLabels) as GalleryPhase[]).map((phase) => (
              <button
                key={phase}
                className={gallery.phase === phase ? "active" : ""}
                type="button"
                aria-pressed={gallery.phase === phase}
                disabled={busy}
                onClick={() => void patchGallery({ phase, selectionLocked: false })}
              >
                {phaseLabels[phase]}
              </button>
            ))}
          </div>
        </div>
        <div className="gallery-manager-actions">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(publicUrl);
              toast("Link da galeria copiado");
            }}
          >
            ⧉ Copiar link
          </button>
          <a href={gallery.url} target="_blank" rel="noreferrer">
            ↗ Abrir
          </a>
          <button
            type="button"
            title="Configurações da galeria"
            aria-label="Configurações da galeria"
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
        </div>
      </header>

      <div className="gallery-storage-strip">
        <span className="storage-mode mode-smart">◈ Um original por foto</span>
        <span>{formatSize(gallery.stats.totalBytes)} usados</span>
        <span>Escolhidas usam referência, sem duplicar armazenamento</span>
        {gallery.hasPin && <span>PIN ativo</span>}
        {gallery.expiresAt && (
          <span>
            Expira em {new Intl.DateTimeFormat("pt-BR").format(new Date(gallery.expiresAt))}
          </span>
        )}
        {gallery.selectionLocked && (
          <button type="button" onClick={() => void patchGallery({ selectionLocked: false })}>
            ↻ Reabrir {gallery.phase === "approval" ? "aprovação" : "seleção"}
          </button>
        )}
      </div>

      <section className="gallery-delivery-flow" aria-label="Fluxo de entrega">
        <div className="gallery-delivery-heading">
          <div>
            <span>ORGANIZAÇÃO DOS ARQUIVOS</span>
            <strong>Fluxo de entrega</strong>
          </div>
          <p>As fotos ficam separadas por etapa. A cliente vê somente a etapa liberada.</p>
        </div>
        <div className="gallery-delivery-steps" role="tablist" aria-label="Etapas dos arquivos">
          {folders.map((item) => (
            <button
              key={item.id}
              className={`gallery-delivery-tab${folder === item.id ? " active" : ""}`}
              type="button"
              role="tab"
              aria-selected={folder === item.id}
              aria-controls="gallery-current-folder"
              onClick={() => {
                setFolder(item.id);
                setSelectionMode(false);
                setSelectedPhotoIds(new Set());
              }}
            >
              <span className="gallery-delivery-icon">
                <GalleryFolderIcon folder={item.id} />
              </span>
              <span className="gallery-delivery-copy">
                <strong>{item.label}</strong>
                <small>{item.accent}</small>
              </span>
              <b>{folderCount(gallery, item.id)}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="gallery-folder-workspace">
        <div className="gallery-file-toolbar">
          <div className="gallery-toolbar-copy">
            <span>ETAPA ATUAL</span>
            <strong>{folders.find((item) => item.id === folder)?.label}</strong>
            <small>
              {photos.length} arquivo{photos.length === 1 ? "" : "s"} nesta etapa
            </small>
          </div>
          <div className="gallery-toolbar-actions">
            {selectionMode ? (
              <div className="gallery-bulk-actions">
                <strong>{selectedPhotoIds.size} selecionada(s)</strong>
                <button
                  className={folder === "trash" ? "" : "danger-action"}
                  type="button"
                  title={folder === "trash" ? "Restaurar fotos" : "Mover fotos para a lixeira"}
                  aria-label={folder === "trash" ? "Restaurar fotos" : "Mover fotos para a lixeira"}
                  disabled={selectedPhotoIds.size === 0 || busy}
                  onClick={() =>
                    void updatePhotoTrash(folder === "trash" ? "restore" : "trash", [
                      ...selectedPhotoIds,
                    ])
                  }
                >
                  {folder === "trash" ? (
                    "↻ Restaurar"
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedPhotoIds(new Set());
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSelectionMode(true)}
                disabled={!photos.length}
              >
                Selecionar fotos
              </button>
            )}
            <button
              className="gallery-refresh"
              type="button"
              onClick={() => void refresh()}
              title="Atualizar galeria"
              aria-label="Atualizar galeria"
            >
              ↻
            </button>
            {folder !== "selection" && folder !== "trash" && (
              <button
                className="gallery-upload-primary"
                type="button"
                disabled={busy}
                onClick={() => photoInput.current?.click()}
              >
                ＋ Enviar fotos
              </button>
            )}
          </div>
          <input
            ref={photoInput}
            hidden
            multiple
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={(event) => {
              void uploadPhotos(Array.from(event.target.files || []));
              event.target.value = "";
            }}
          />
        </div>

        {busy && uploadProgress > 0 && (
          <div className="gallery-upload-progress">
            <i style={{ width: `${uploadProgress}%` }} />
            <span>
              {uploadStatus || `${uploadProgress}%`} · {uploadProgress}%
            </span>
          </div>
        )}

        {uploadQueue.length > 0 && (
          <section className="gallery-upload-queue" aria-live="polite">
            <header>
              <div>
                <span>ENVIOS RECENTES</span>
                <strong>Acompanhe cada arquivo</strong>
              </div>
              <button
                type="button"
                onClick={() =>
                  setUploadQueue((current) =>
                    current.filter((item) => item.status !== "done" && item.status !== "error"),
                  )
                }
              >
                Limpar concluídos
              </button>
            </header>
            <div>
              {uploadQueue.map((item) => (
                <article className={`status-${item.status}`} key={item.id}>
                  <span className="gallery-upload-status-icon" aria-hidden="true">
                    {item.status === "done"
                      ? "✓"
                      : item.status === "error" || item.status === "partial"
                        ? "!"
                        : "↑"}
                  </span>
                  <div>
                    <strong>{item.file.name}</strong>
                    <small>{item.error || uploadStatusLabel[item.status]}</small>
                  </div>
                  <span>{formatSize(item.file.size)}</span>
                  {(item.status === "error" || item.status === "partial") && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void uploadPhotos([item.file], {
                          retryId: item.id,
                          targetFolder: item.folder,
                          existingPhotoId: item.photoId,
                        })
                      }
                    >
                      Tentar novamente
                    </button>
                  )}
                  <button
                    className="gallery-upload-dismiss"
                    type="button"
                    aria-label={`Ocultar status de ${item.file.name}`}
                    onClick={() =>
                      setUploadQueue((current) => current.filter((entry) => entry.id !== item.id))
                    }
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="gallery-admin-grid" id="gallery-current-folder" role="tabpanel">
          {photos.map((photo) => (
            <article
              key={photo.id}
              className={`${photo.comments.length || photo.comment ? "has-client-comment" : ""} ${selectedPhotoIds.has(photo.id) ? "is-bulk-selected" : ""}`}
            >
              {selectionMode && (
                <button
                  className="gallery-photo-selector"
                  type="button"
                  onClick={() =>
                    setSelectedPhotoIds((current) => {
                      const next = new Set(current);
                      if (next.has(photo.id)) next.delete(photo.id);
                      else next.add(photo.id);
                      return next;
                    })
                  }
                  aria-label={selectedPhotoIds.has(photo.id) ? "Desmarcar foto" : "Selecionar foto"}
                >
                  {selectedPhotoIds.has(photo.id) ? "✓" : ""}
                </button>
              )}
              <button
                className="gallery-admin-photo-open"
                type="button"
                onClick={() => {
                  if (selectionMode) {
                    setSelectedPhotoIds((current) => {
                      const next = new Set(current);
                      if (next.has(photo.id)) next.delete(photo.id);
                      else next.add(photo.id);
                      return next;
                    });
                  } else openPhoto(photo.id);
                }}
                aria-label={`Abrir detalhes de ${photo.filename}`}
              >
                {photo.hasPreview ? (
                  <img
                    src={`/api/galleries/${gallery.id}/photos/${photo.id}`}
                    alt={photo.filename}
                    loading="lazy"
                  />
                ) : (
                  <span className="raw-file-icon">
                    {photo.mimeType.includes("zip") ? "ZIP" : "RAW"}
                  </span>
                )}
              </button>
              <div>
                <strong>{photo.filename}</strong>
                <small>{formatSize(photo.size)}</small>
              </div>
              <span className="admin-photo-badges">
                {photo.selected && <b>♥</b>}
                {photo.approved && <b>✓</b>}
                {(photo.comments.length > 0 || photo.comment) && <b>●</b>}
                {photo.deletedAt && <b>⌫</b>}
              </span>
              {(photo.comments.length > 0 || photo.comment) && (
                <button
                  className="client-comment-preview"
                  type="button"
                  onClick={() => openPhoto(photo.id)}
                >
                  “{photo.comments.at(-1)?.message || photo.comment.split("\n").at(-1)}”
                </button>
              )}
              {photo.deletedAt && (
                <small className="trash-expiry-note">
                  Removida em {new Intl.DateTimeFormat("pt-BR").format(new Date(photo.deletedAt))} ·
                  excluída após 30 dias
                </small>
              )}
            </article>
          ))}
          {photos.length === 0 && (
            <div className="gallery-folder-empty">
              <span>
                <GalleryFolderIcon folder={folder} />
              </span>
              <strong>
                {folder === "selection"
                  ? "A cliente ainda não escolheu fotos"
                  : folder === "trash"
                    ? "A lixeira está vazia"
                    : "Nenhuma foto nesta etapa"}
              </strong>
              <small>
                {folder === "selection"
                  ? "As escolhas aparecerão aqui sem duplicar os arquivos."
                  : folder === "trash"
                    ? "Fotos removidas ficam disponíveis aqui por 30 dias."
                    : "Envie uma ou várias fotos para começar."}
              </small>
            </div>
          )}
        </div>
      </section>

      {gallery.stats.extraCount > 0 && (
        <div className="photo-extra-charge">
          <span>＋ {gallery.stats.extraCount} fotos adicionais</span>
          <strong>{formatMoney(gallery.stats.extraAmount, gallery.currency)}</strong>
          <small>
            {gallery.selectionLocked
              ? "Lançado como pendente no Financeiro"
              : "Aguardando confirmação"}
          </small>
        </div>
      )}

      {recentEvents.length > 0 && (
        <section className="gallery-activity-list" aria-labelledby="gallery-activity-title">
          <div>
            <span>ATIVIDADE</span>
            <strong id="gallery-activity-title">Retorno recente</strong>
          </div>
          {recentEvents.map((event) => (
            <article key={event.id}>
              <i aria-hidden="true" />
              <span>{event.detail}</span>
              {event.count > 1 && <b>{event.count}×</b>}
              <time dateTime={event.createdAt}>
                {new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(event.createdAt))}
              </time>
            </article>
          ))}
        </section>
      )}

      {activePhoto && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closePhoto}>
          <section
            className="gallery-client-activity-dialog gallery-conversation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-conversation-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="gallery-conversation-dialog-header">
              <div>
                <span>RETORNO DO CLIENTE</span>
                <h2 id="photo-conversation-title">{activePhoto.filename}</h2>
              </div>
              <button type="button" onClick={closePhoto} aria-label="Fechar conversa">
                ×
              </button>
            </header>
            <div className="gallery-conversation-dialog-body">
              <div className="gallery-conversation-preview">
                {activePhoto.hasPreview ? (
                  <img
                    src={`/api/galleries/${gallery.id}/photos/${activePhoto.id}`}
                    alt={activePhoto.filename}
                  />
                ) : (
                  <div className="raw-file-icon">ARQUIVO</div>
                )}
                <div className="gallery-client-statuses">
                  <span className={activePhoto.selected ? "active" : ""}>
                    {activePhoto.selected ? "♥ Escolhida pelo cliente" : "Não escolhida"}
                  </span>
                  <span className={activePhoto.approved ? "active" : ""}>
                    {activePhoto.approved ? "✓ Edição aprovada" : "Aguardando aprovação"}
                  </span>
                </div>
              </div>
              <section className="gallery-photo-conversation">
                <header className="gallery-conversation-heading">
                  <div>
                    <strong>Conversa sobre esta foto</strong>
                    <small>
                      {activeConversation.length || "Nenhuma"}{" "}
                      {activeConversation.length === 1 ? "mensagem" : "mensagens"}
                    </small>
                  </div>
                  <span>
                    Respondendo como <strong>{responderName}</strong>
                  </span>
                </header>
                <div className="gallery-comment-thread" ref={conversationThread} aria-live="polite">
                  {activeConversation.map((comment) => (
                    <article className={`comment-bubble ${comment.authorRole}`} key={comment.id}>
                      <header className="comment-meta">
                        <strong>{comment.authorName}</strong>
                        {comment.createdAt && (
                          <small>
                            {new Intl.DateTimeFormat("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(comment.createdAt))}
                          </small>
                        )}
                      </header>
                      <p>{comment.message}</p>
                    </article>
                  ))}
                  {!activeConversation.length && (
                    <div className="gallery-conversation-empty">
                      <span>◇</span>
                      <p>A conversa desta foto começa aqui.</p>
                    </div>
                  )}
                </div>
                {!activePhoto.deletedAt && (
                  <form
                    className="gallery-message-composer"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void replyToPhoto();
                    }}
                  >
                    <textarea
                      ref={replyInput}
                      id="photographer-reply"
                      rows={1}
                      value={replyDraft}
                      onChange={(event) => setReplyDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing &&
                          !window.matchMedia("(pointer: coarse)").matches
                        ) {
                          event.preventDefault();
                          if (!busy && replyDraft.trim()) void replyToPhoto();
                        }
                      }}
                      aria-label={`Responder como ${responderName}`}
                      placeholder="Escreva uma resposta…"
                    />
                    <button
                      type="submit"
                      disabled={busy || !replyDraft.trim()}
                      aria-label={busy ? "Enviando resposta" : "Enviar resposta"}
                    >
                      {busy ? (
                        <span className="composer-spinner" aria-hidden="true" />
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3.8 4.2 21 12 3.8 19.8l2.1-6.3L15 12l-9.1-1.5-2.1-6.3Z" />
                        </svg>
                      )}
                    </button>
                  </form>
                )}
              </section>
            </div>
            <footer className="gallery-conversation-dialog-footer">
              {activePhoto.deletedAt ? (
                <button
                  className="restore-photo"
                  type="button"
                  onClick={() => void updatePhotoTrash("restore", [activePhoto.id])}
                >
                  ↻ Restaurar foto
                </button>
              ) : (
                <button
                  className="icon-button danger-icon-button gallery-trash-button"
                  type="button"
                  title="Mover foto para a lixeira"
                  aria-label="Mover foto para a lixeira"
                  onClick={() => void updatePhotoTrash("trash", [activePhoto.id])}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                  </svg>
                </button>
              )}
              <small>
                {activePhoto.deletedAt
                  ? "A foto volta a aparecer na galeria da cliente ao ser restaurada."
                  : "A foto ficará recuperável por 30 dias e sairá do link da cliente."}
              </small>
            </footer>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="gallery-settings-drawer" role="dialog" aria-modal="true">
          <button className="settings-scrim" type="button" onClick={() => setSettingsOpen(false)} />
          <div>
            <header>
              <div>
                <span>GALERIA PRIVADA</span>
                <h2>Configurações</h2>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)}>
                ×
              </button>
            </header>
            <div className="gallery-setting-grid">
              <label>
                <span>PIN opcional</span>
                <input
                  value={settings.pin}
                  onChange={(event) => {
                    setPinTouched(true);
                    setSettings({ ...settings, pin: event.target.value });
                  }}
                  placeholder={gallery.hasPin ? "PIN atual protegido" : "Ex.: 4826"}
                  inputMode="numeric"
                />
              </label>
              <label>
                <span>Validade do link</span>
                <input
                  type="datetime-local"
                  value={settings.expiresAt}
                  onChange={(event) => setSettings({ ...settings, expiresAt: event.target.value })}
                />
              </label>
              <label>
                <span>Fotos contratadas</span>
                <input
                  type="number"
                  min="0"
                  value={settings.selectionLimit}
                  onChange={(event) =>
                    setSettings({ ...settings, selectionLimit: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>Valor por foto adicional</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.extraPrice}
                  onChange={(event) =>
                    setSettings({ ...settings, extraPrice: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>Rodadas de revisão</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={settings.revisionLimit}
                  onChange={(event) =>
                    setSettings({ ...settings, revisionLimit: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>Texto da marca-d’água</span>
                <input
                  value={settings.watermarkLabel}
                  onChange={(event) =>
                    setSettings({ ...settings, watermarkLabel: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="gallery-storage-policy-note">
              <span>◈ Armazenamento sem duplicação</span>
              <small>
                Fotos enviadas guardam um original e uma prévia protegida. A pasta Escolhidas usa
                somente a referência da seleção feita pela cliente.
              </small>
            </div>
            <button
              className="watermark-upload"
              type="button"
              onClick={() => watermarkInput.current?.click()}
            >
              ＋ Substituir pela marca-d’água da fotógrafa
            </button>
            <input
              ref={watermarkInput}
              hidden
              type="file"
              accept="image/png,image/webp,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadWatermark(file);
                event.target.value = "";
              }}
            />
            <footer>
              <button type="button" onClick={() => setSettingsOpen(false)}>
                Cancelar
              </button>
              <button type="button" disabled={busy} onClick={() => void saveSettings()}>
                Salvar
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
