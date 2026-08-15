"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createProtectedPreview } from "@/lib/gallery-preview";
import { formatMoney } from "@/lib/format";
import type {
  Client,
  GalleryEvent,
  GalleryFolder,
  GalleryPhase,
  Work,
  WorkGallery,
} from "@/types/revelar";

type ManagerFolder = GalleryFolder | "trash";

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
  { id: "originals", label: "Originais", icon: "▣", accent: "Backup opcional" },
  { id: "trash", label: "Lixeira", icon: "⌫", accent: "Recuperável por 30 dias" },
];

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
  toast: (message: string) => void;
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
  const socialPhotoInput = useRef<HTMLInputElement>(null);
  const deliveryInput = useRef<HTMLInputElement>(null);
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

  const uploadPhotos = async (files: File[], deliveryVariant: "high" | "social" = "high") => {
    if (!gallery || files.length === 0 || folder === "trash" || folder === "selection") return;
    setBusy(true);
    setUploadProgress(0);
    let latest = gallery;
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const form = new FormData();
      form.set("folder", folder);
      try {
        const canPreview = /^image\/(jpeg|png|webp)$/i.test(file.type);
        if (folder === "originals" || !canPreview) {
          form.set("file", file);
        } else {
          const preview = await createProtectedPreview({
            file,
            label: settings.watermarkLabel,
            clientName,
            watermarkFile,
          });
          form.set("preview", preview);
          if (folder === "edited" || folder === "delivered" || settings.storageMode === "backup") {
            form.set("file", file);
          }
          if (folder === "delivered") form.set("variant", deliveryVariant);
        }
        const response = await fetch(`/api/galleries/${gallery.id}/upload`, {
          method: "POST",
          body: form,
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error || `Falha em ${file.name}`);
        }
        const data = (await response.json()) as { gallery: WorkGallery };
        latest = data.gallery;
      } catch (error) {
        toast(error instanceof Error ? error.message : `Falha em ${file.name}`);
      }
      setUploadProgress(Math.round(((index + 1) / files.length) * 100));
    }
    setGallery(latest);
    setBusy(false);
    setUploadProgress(0);
    toast(`${files.length} arquivo${files.length === 1 ? " enviado" : "s enviados"}`);
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
      toast(data.error || "Não foi possível atualizar as fotos");
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
      toast("Não foi possível enviar a resposta");
    }
    setBusy(false);
  };

  const uploadDeliveryZip = async (file: File, kind: "high_zip" | "social_zip") => {
    if (!gallery) return;
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    form.set("assetKind", kind);
    const response = await fetch(`/api/galleries/${gallery.id}/upload`, {
      method: "POST",
      body: form,
    });
    if (response.ok) {
      const data = (await response.json()) as { gallery: WorkGallery };
      setGallery(data.gallery);
      toast("Pacote de entrega enviado");
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
          <button type="button" onClick={() => setSettingsOpen(true)}>
            ⚙
          </button>
        </div>
      </header>

      <div className="gallery-storage-strip">
        <span className={`storage-mode mode-${gallery.storageMode}`}>
          {gallery.storageMode === "smart" ? "◈ Armazenamento inteligente" : "▣ Backup completo"}
        </span>
        <span>{formatSize(gallery.stats.totalBytes)} usados</span>
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

      <div className="gallery-folder-tabs">
        <div className="gallery-folders-heading">
          <strong>Arquivos do fluxo</strong>
          <span>Organização da fotógrafa · não muda a etapa do cliente</span>
        </div>
        {folders.map((item) => (
          <button
            key={item.id}
            className={folder === item.id ? "active" : ""}
            type="button"
            onClick={() => {
              setFolder(item.id);
              setSelectionMode(false);
              setSelectedPhotoIds(new Set());
            }}
          >
            <span>{item.icon}</span>
            <strong>{item.label}</strong>
            <small>
              {folderCount(gallery, item.id)} · {item.accent}
            </small>
          </button>
        ))}
      </div>

      <div className="gallery-file-toolbar">
        <div>
          <strong>{folders.find((item) => item.id === folder)?.label}</strong>
          <span>
            {photos.length} arquivo{photos.length === 1 ? "" : "s"}
          </span>
        </div>
        {selectionMode ? (
          <div className="gallery-bulk-actions">
            <strong>{selectedPhotoIds.size} selecionada(s)</strong>
            <button
              type="button"
              disabled={selectedPhotoIds.size === 0 || busy}
              onClick={() =>
                void updatePhotoTrash(folder === "trash" ? "restore" : "trash", [
                  ...selectedPhotoIds,
                ])
              }
            >
              {folder === "trash" ? "↻ Restaurar" : "⌫ Mover para lixeira"}
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
          <button type="button" onClick={() => setSelectionMode(true)} disabled={!photos.length}>
            ✓ Selecionar fotos
          </button>
        )}
        <button className="gallery-refresh" type="button" onClick={() => void refresh()}>
          ↻ Atualizar
        </button>
        {folder !== "selection" && folder !== "trash" && (
          <button type="button" disabled={busy} onClick={() => photoInput.current?.click()}>
            ＋ Enviar {folder === "originals" ? "originais" : "fotos"}
          </button>
        )}
        <input
          ref={photoInput}
          hidden
          multiple
          type="file"
          accept={
            folder === "originals"
              ? "image/*,.zip,.raw,.cr2,.cr3,.nef,.arw,.dng"
              : "image/jpeg,image/png,image/webp"
          }
          onChange={(event) => {
            void uploadPhotos(Array.from(event.target.files || []));
            event.target.value = "";
          }}
        />
      </div>

      {busy && uploadProgress > 0 && (
        <div className="gallery-upload-progress">
          <i style={{ width: `${uploadProgress}%` }} />
          <span>{uploadProgress}%</span>
        </div>
      )}

      {folder === "delivered" && (
        <div className="delivery-package-row">
          <button type="button" onClick={() => socialPhotoInput.current?.click()}>
            ＋ Enviar fotos para redes
          </button>
          <input
            ref={socialPhotoInput}
            hidden
            multiple
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              void uploadPhotos(Array.from(event.target.files || []), "social");
              event.target.value = "";
            }}
          />
          <button type="button" onClick={() => deliveryInput.current?.click()}>
            ⇩ Enviar ZIP em alta resolução
          </button>
          <input
            ref={deliveryInput}
            hidden
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadDeliveryZip(file, "high_zip");
              event.target.value = "";
            }}
          />
          <label>
            <span>Versão para redes</span>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadDeliveryZip(file, "social_zip");
                event.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      <div className="gallery-admin-grid">
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
            <span>{folders.find((item) => item.id === folder)?.icon}</span>
            <strong>Pasta vazia</strong>
          </div>
        )}
      </div>

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

      <div className="gallery-activity-list">
        <strong>Atividade recente do cliente</strong>
        {gallery.events.slice(0, 5).map((event) => (
          <span key={event.id}>
            <i /> {event.detail}
          </span>
        ))}
      </div>

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
              <button
                className={activePhoto.deletedAt ? "restore-photo" : "danger-action"}
                type="button"
                onClick={() =>
                  void updatePhotoTrash(activePhoto.deletedAt ? "restore" : "trash", [
                    activePhoto.id,
                  ])
                }
              >
                {activePhoto.deletedAt ? "↻ Restaurar foto" : "⌫ Mover para lixeira"}
              </button>
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
            <div className="storage-choice">
              <button
                className={settings.storageMode === "smart" ? "active" : ""}
                type="button"
                onClick={() => setSettings({ ...settings, storageMode: "smart" })}
              >
                <span>◈ Inteligente</span>
                <small>Prévia leve agora, alta depois</small>
              </button>
              <button
                className={settings.storageMode === "backup" ? "active" : ""}
                type="button"
                onClick={() => setSettings({ ...settings, storageMode: "backup" })}
              >
                <span>▣ Backup completo</span>
                <small>Guarda também os originais</small>
              </button>
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
