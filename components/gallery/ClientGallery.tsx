"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ClientPhoto = {
  id: string;
  filename: string;
  selected: boolean;
  approved: boolean;
  comment: string;
  comments: Array<{
    id: string;
    authorRole: "client" | "photographer";
    authorName: string;
    message: string;
    createdAt: string;
  }>;
  imageUrl: string;
  canDownloadHigh: boolean;
  canDownloadSocial: boolean;
};

type ClientGalleryData = {
  workTitle: string;
  clientName: string;
  phase: "selection" | "approval" | "delivery";
  expiresAt?: string;
  selectionLimit: number;
  selectionLocked: boolean;
  revisionLimit: number;
  revisionRound: number;
  currency: "BRL" | "EUR";
  extraPrice: number;
  watermarkLabel: string;
  selected: number;
  extraCount: number;
  extraAmount: number;
  photos: ClientPhoto[];
  downloadAllUrl?: string;
};

function formatMoney(value: number, currency: "BRL" | "EUR") {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

export function ClientGallery({ slug }: { slug: string }) {
  const [gallery, setGallery] = useState<ClientGalleryData | null>(null);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<ClientPhoto | null>(null);
  const [comment, setComment] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [screenProtected, setScreenProtected] = useState(false);
  const [feedback, setFeedback] = useState("");
  const conversationThread = useRef<HTMLDivElement>(null);
  const commentInput = useRef<HTMLTextAreaElement>(null);

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2400);
  };

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const response = await fetch(`/api/gallery/${slug}`, { cache: "no-store" });
      if (!response.ok) {
        setError(
          response.status === 410 ? "Este link expirou." : "Não foi possível abrir a galeria.",
        );
        if (!silent) setLoading(false);
        return;
      }
      const data = (await response.json()) as { locked: boolean; gallery: ClientGalleryData };
      setLocked(data.locked);
      if (!data.locked) {
        setGallery(data.gallery);
        setActivePhoto((current) =>
          current ? data.gallery.photos.find((photo) => photo.id === current.id) || null : current,
        );
      }
      if (!silent) setLoading(false);
    },
    [slug],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!gallery || locked) return;
    const timer = window.setInterval(() => void load(true), 20_000);
    return () => window.clearInterval(timer);
  }, [gallery, load, locked]);

  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault();
    const protect = () => setScreenProtected(true);
    const restore = () => setScreenProtected(false);
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("dragstart", prevent);
    window.addEventListener("beforeprint", protect);
    window.addEventListener("afterprint", restore);
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("dragstart", prevent);
      window.removeEventListener("beforeprint", protect);
      window.removeEventListener("afterprint", restore);
    };
  }, []);

  const selectedCount = useMemo(
    () => gallery?.photos.filter((photo) => photo.selected).length || 0,
    [gallery],
  );
  const extraCount = Math.max(0, selectedCount - (gallery?.selectionLimit || 0));
  const galleryClientName = gallery?.clientName || "Cliente";
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
                authorName: galleryClientName,
                message,
                createdAt: "",
              }))
        : [],
    [activePhoto, galleryClientName],
  );

  useEffect(() => {
    if (!activePhoto) return;
    const frame = window.requestAnimationFrame(() => {
      const thread = conversationThread.current;
      if (thread) thread.scrollTop = thread.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeConversation.length, activePhoto]);

  useEffect(() => {
    const input = commentInput.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }, [comment]);

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const response = await fetch(`/api/gallery/${slug}/unlock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error || "PIN incorreto.");
      return;
    }
    await load();
  };

  const savePhoto = async (photo: ClientPhoto, value: boolean, nextComment?: string) => {
    if (!gallery || (gallery.selectionLocked && nextComment === undefined)) return;
    if (nextComment !== undefined && !nextComment.trim()) {
      showFeedback("Escreva um comentário antes de enviar");
      return;
    }
    setSaving(photo.id);
    setError("");
    const response = await fetch(`/api/gallery/${slug}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: nextComment !== undefined ? "comment" : "toggle",
        photoId: photo.id,
        value,
        comment: nextComment,
      }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error || "Não foi possível salvar.");
    } else {
      const result = (await response.json().catch(() => ({ comments: undefined }))) as {
        comments?: ClientPhoto["comments"];
      };
      const savedComments = result.comments;
      setGallery((current) =>
        current
          ? {
              ...current,
              photos: current.photos.map((item) =>
                item.id === photo.id
                  ? {
                      ...item,
                      selected: current.phase === "selection" ? value : item.selected,
                      approved: current.phase === "approval" ? value : item.approved,
                      comment: item.comment,
                      comments: savedComments || item.comments,
                    }
                  : item,
              ),
            }
          : current,
      );
      if (nextComment !== undefined) {
        setActivePhoto((current) =>
          current
            ? {
                ...current,
                comment: current.comment,
                comments: savedComments || current.comments,
              }
            : current,
        );
        setComment("");
        showFeedback("Comentário enviado para a fotógrafa");
      } else {
        showFeedback(
          gallery.phase === "selection"
            ? value
              ? "Foto adicionada à sua seleção"
              : "Foto removida da sua seleção"
            : value
              ? "Edição aprovada"
              : "Foto marcada para ajuste",
        );
      }
    }
    setSaving(null);
  };

  const confirm = async () => {
    const response = await fetch(`/api/gallery/${slug}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error || "Não foi possível confirmar.");
      return;
    }
    setConfirmOpen(false);
    await load();
  };

  if (loading) {
    return (
      <main className="client-gallery-shell gallery-loading">
        <img src="/brand/revelar-logo-horizontal.svg" alt="Revelar" />
        <span>Preparando sua galeria…</span>
      </main>
    );
  }

  if (locked) {
    return (
      <main className="client-gallery-shell gallery-unlock">
        <img src="/brand/revelar-logo-horizontal.svg" alt="Revelar" />
        <form onSubmit={unlock}>
          <span>GALERIA PRIVADA</span>
          <h1>Entre com o PIN</h1>
          <div className="pin-field">
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="PIN da galeria"
              placeholder="••••"
              autoFocus
            />
            <button type="submit">Abrir galeria</button>
          </div>
          {error && <p className="gallery-error">{error}</p>}
        </form>
      </main>
    );
  }

  if (!gallery) {
    return <main className="client-gallery-shell gallery-error-page">{error}</main>;
  }

  const phaseLabels = {
    selection: "Escolha suas fotos",
    approval: "Aprove as fotos editadas",
    delivery: "Sua galeria está pronta",
  };
  const activeIndex = activePhoto
    ? gallery.photos.findIndex((photo) => photo.id === activePhoto.id)
    : -1;
  const openAdjacent = (direction: -1 | 1) => {
    if (activeIndex < 0 || gallery.photos.length < 2) return;
    const next =
      gallery.photos[(activeIndex + direction + gallery.photos.length) % gallery.photos.length];
    setActivePhoto(next);
    setComment("");
  };

  return (
    <main
      className={`client-gallery-shell phase-${gallery.phase} ${screenProtected ? "screen-protected" : ""}`}
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="client-gallery-header">
        <img src="/brand/revelar-logo-horizontal.svg" alt="Revelar" />
        <div>
          <span>{gallery.clientName}</span>
          <h1>{gallery.workTitle}</h1>
        </div>
        {gallery.expiresAt && (
          <small>
            Disponível até {new Intl.DateTimeFormat("pt-BR").format(new Date(gallery.expiresAt))}
          </small>
        )}
      </header>

      <section className="client-gallery-toolbar">
        <div>
          <span>{phaseLabels[gallery.phase]}</span>
          {gallery.phase === "selection" && (
            <strong>
              {selectedCount} de {gallery.selectionLimit || "quantidade livre"}
            </strong>
          )}
          {gallery.phase === "approval" && (
            <strong>
              Rodada {gallery.revisionRound} de {gallery.revisionLimit}
            </strong>
          )}
          {gallery.phase === "delivery" && <strong>{gallery.photos.length} fotos</strong>}
        </div>
        {gallery.phase !== "delivery" && !gallery.selectionLocked && (
          <button
            className="gallery-confirm-button"
            type="button"
            onClick={() => setConfirmOpen(true)}
          >
            Confirmar {gallery.phase === "selection" ? "seleção" : "aprovação"}
          </button>
        )}
        {gallery.selectionLocked && <span className="gallery-locked-badge">✓ Confirmado</span>}
      </section>

      {gallery.phase === "selection" && extraCount > 0 && (
        <div className="gallery-extra-banner">
          <span>
            ＋ {extraCount} foto{extraCount === 1 ? "" : "s"} adicional
          </span>
          <strong>{formatMoney(extraCount * gallery.extraPrice, gallery.currency)}</strong>
        </div>
      )}

      {gallery.phase === "delivery" && gallery.downloadAllUrl && (
        <section className="delivery-downloads">
          <a href={gallery.downloadAllUrl} download>
            <span>ENTREGA COMPLETA</span>
            <strong>Baixar todas as fotos</strong>
            <small>Um único arquivo ZIP em alta resolução</small>
          </a>
        </section>
      )}

      {error && <p className="gallery-error gallery-page-error">{error}</p>}
      {feedback && (
        <div className="gallery-feedback" role="status">
          ✓ {feedback}
        </div>
      )}

      <section className="protected-photo-grid" aria-label="Fotos da galeria">
        {gallery.photos.map((photo, index) => {
          const active = gallery.phase === "approval" ? photo.approved : photo.selected;
          return (
            <article key={photo.id} className={active ? "is-selected" : ""}>
              <button
                className="protected-photo"
                type="button"
                onClick={() => {
                  setActivePhoto(photo);
                  setComment("");
                }}
                aria-label={`Ampliar ${photo.filename}`}
              >
                <img
                  src={photo.imageUrl}
                  alt={`Foto ${index + 1}`}
                  draggable={false}
                  loading="lazy"
                />
                {gallery.phase !== "delivery" && (
                  <span className="watermark-shield" aria-hidden="true">
                    {gallery.watermarkLabel} · PROVA
                  </span>
                )}
                <small>{String(index + 1).padStart(3, "0")}</small>
              </button>
              {gallery.phase !== "delivery" && (
                <button
                  className="photo-choice"
                  type="button"
                  disabled={gallery.selectionLocked || saving === photo.id}
                  onClick={() => savePhoto(photo, !active)}
                  aria-label={active ? "Remover escolha" : "Escolher foto"}
                >
                  {gallery.phase === "selection" ? (active ? "♥" : "♡") : active ? "✓" : "○"}
                </button>
              )}
              {gallery.phase === "delivery" &&
                (photo.canDownloadHigh || photo.canDownloadSocial) && (
                  <div className="photo-download-actions">
                    {photo.canDownloadHigh && <a href={`${photo.imageUrl}?variant=high`}>Alta</a>}
                    {photo.canDownloadSocial && (
                      <a href={`${photo.imageUrl}?variant=social`}>Social</a>
                    )}
                  </div>
                )}
            </article>
          );
        })}
      </section>

      {activePhoto && (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-photo-conversation-title"
        >
          <button
            className="lightbox-nav previous"
            type="button"
            onClick={() => openAdjacent(-1)}
            aria-label="Foto anterior"
          >
            ‹
          </button>
          <button
            className="lightbox-nav next"
            type="button"
            onClick={() => openAdjacent(1)}
            aria-label="Próxima foto"
          >
            ›
          </button>
          <div className="lightbox-photo">
            <img src={activePhoto.imageUrl} alt="Foto ampliada" draggable={false} />
            {gallery.phase !== "delivery" && (
              <span className="watermark-shield watermark-large" aria-hidden="true">
                {gallery.watermarkLabel} · {gallery.clientName} · PROVA
              </span>
            )}
          </div>
          <aside className="client-gallery-conversation">
            <header className="client-conversation-header">
              <div>
                <span>CONVERSA SOBRE ESTA FOTO</span>
                <h2 id="client-photo-conversation-title">{activePhoto.filename}</h2>
              </div>
              <button type="button" onClick={() => setActivePhoto(null)} aria-label="Fechar foto">
                ×
              </button>
            </header>
            {gallery.phase !== "delivery" && (
              <button
                className="lightbox-choice"
                type="button"
                disabled={gallery.selectionLocked}
                onClick={() => {
                  const value =
                    gallery.phase === "selection" ? !activePhoto.selected : !activePhoto.approved;
                  void savePhoto(activePhoto, value);
                  setActivePhoto({
                    ...activePhoto,
                    selected: gallery.phase === "selection" ? value : activePhoto.selected,
                    approved: gallery.phase === "approval" ? value : activePhoto.approved,
                  });
                }}
              >
                {gallery.phase === "selection"
                  ? activePhoto.selected
                    ? "♥ Remover da seleção"
                    : "♡ Escolher esta foto"
                  : activePhoto.approved
                    ? "✓ Edição aprovada"
                    : "○ Aprovar esta edição"}
              </button>
            )}
            <div className="gallery-comment-thread" ref={conversationThread} aria-live="polite">
              {activeConversation.map((item) => (
                <article className={`comment-bubble ${item.authorRole}`} key={item.id}>
                  <header className="comment-meta">
                    <strong>{item.authorName}</strong>
                    {item.createdAt && (
                      <small>
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(item.createdAt))}
                      </small>
                    )}
                  </header>
                  <p>{item.message}</p>
                </article>
              ))}
              {!activeConversation.length && (
                <div className="gallery-conversation-empty">
                  <span>◇</span>
                  <p>Envie uma observação sobre esta foto.</p>
                </div>
              )}
            </div>
            <form
              className="gallery-message-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void savePhoto(
                  activePhoto,
                  gallery.phase === "selection" ? activePhoto.selected : activePhoto.approved,
                  comment,
                );
              }}
            >
              <textarea
                ref={commentInput}
                rows={1}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing &&
                    !window.matchMedia("(pointer: coarse)").matches
                  ) {
                    event.preventDefault();
                    if (saving !== activePhoto.id && comment.trim()) {
                      void savePhoto(
                        activePhoto,
                        gallery.phase === "selection" ? activePhoto.selected : activePhoto.approved,
                        comment,
                      );
                    }
                  }
                }}
                aria-label="Escrever mensagem sobre esta foto"
                placeholder="Escreva uma mensagem…"
              />
              <button
                type="submit"
                disabled={saving === activePhoto.id || !comment.trim()}
                aria-label={saving === activePhoto.id ? "Enviando mensagem" : "Enviar mensagem"}
              >
                {saving === activePhoto.id ? (
                  <span className="composer-spinner" aria-hidden="true" />
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3.8 4.2 21 12 3.8 19.8l2.1-6.3L15 12l-9.1-1.5-2.1-6.3Z" />
                  </svg>
                )}
              </button>
            </form>
          </aside>
        </div>
      )}

      {confirmOpen && (
        <div className="gallery-confirm-modal" role="dialog" aria-modal="true">
          <div>
            <span>CONFIRMAR</span>
            <h2>
              {gallery.phase === "selection"
                ? `${selectedCount} fotos escolhidas`
                : "Aprovar esta rodada"}
            </h2>
            {gallery.phase === "selection" && extraCount > 0 && (
              <p>
                Inclui {extraCount} foto{extraCount === 1 ? "" : "s"} adicional no valor de{" "}
                {formatMoney(extraCount * gallery.extraPrice, gallery.currency)}.
              </p>
            )}
            <div>
              <button type="button" onClick={() => setConfirmOpen(false)}>
                Voltar
              </button>
              <button className="gallery-confirm-button" type="button" onClick={confirm}>
                Confirmar agora
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="client-gallery-footer">
        <img src="/brand/revelar-symbol.svg" alt="" />
        <span>Galeria privada Revelar.</span>
      </footer>
    </main>
  );
}
