"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ClientPhoto = {
  id: string;
  filename: string;
  selected: boolean;
  approved: boolean;
  comment: string;
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
  assets: Array<{
    id: string;
    kind: "high_zip" | "social_zip";
    filename: string;
    size: number;
    downloadUrl: string;
  }>;
};

function formatMoney(value: number, currency: "BRL" | "EUR") {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/gallery/${slug}`, { cache: "no-store" });
    if (!response.ok) {
      setError(
        response.status === 410 ? "Este link expirou." : "Não foi possível abrir a galeria.",
      );
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { locked: boolean; gallery: ClientGalleryData };
    setLocked(data.locked);
    if (!data.locked) setGallery(data.gallery);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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
    if (!gallery || gallery.selectionLocked) return;
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
                      comment: nextComment === undefined ? item.comment : nextComment,
                    }
                  : item,
              ),
            }
          : current,
      );
      if (nextComment !== undefined) {
        setActivePhoto((current) => (current ? { ...current, comment: nextComment } : current));
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

      {gallery.phase === "delivery" && gallery.assets.length > 0 && (
        <section className="delivery-downloads">
          {gallery.assets.map((asset) => (
            <a key={asset.id} href={asset.downloadUrl} download>
              <span>{asset.kind === "high_zip" ? "ALTA RESOLUÇÃO" : "REDES SOCIAIS"}</span>
              <strong>{asset.filename}</strong>
              <small>{formatSize(asset.size)} · baixar tudo</small>
            </a>
          ))}
        </section>
      )}

      {error && <p className="gallery-error gallery-page-error">{error}</p>}

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
                  setComment(photo.comment);
                }}
                aria-label={`Ampliar ${photo.filename}`}
              >
                <img
                  src={photo.imageUrl}
                  alt={`Foto ${index + 1}`}
                  draggable={false}
                  loading="lazy"
                />
                <span className="watermark-shield" aria-hidden="true">
                  {gallery.watermarkLabel} · PROVA
                </span>
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
          aria-label="Foto ampliada"
        >
          <button className="lightbox-close" type="button" onClick={() => setActivePhoto(null)}>
            ×
          </button>
          <div className="lightbox-photo">
            <img src={activePhoto.imageUrl} alt="Foto ampliada" draggable={false} />
            <span className="watermark-shield watermark-large" aria-hidden="true">
              {gallery.watermarkLabel} · {gallery.clientName} · PROVA
            </span>
          </div>
          {gallery.phase !== "delivery" && (
            <aside>
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
                {gallery.phase === "selection" ? "♡ Escolher esta foto" : "✓ Aprovar esta edição"}
              </button>
              <label>
                <span>Comentário nesta foto</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Ex.: ajustar a luz do rosto"
                />
              </label>
              <button
                className="save-comment"
                type="button"
                disabled={gallery.selectionLocked || saving === activePhoto.id}
                onClick={() =>
                  savePhoto(
                    activePhoto,
                    gallery.phase === "selection" ? activePhoto.selected : activePhoto.approved,
                    comment,
                  )
                }
              >
                Salvar comentário
              </button>
            </aside>
          )}
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
