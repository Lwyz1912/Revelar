"use client";

import { RevelarIcon } from "@/components/shared/RevelarIcon";

import { useEffect, useMemo, useRef, useState } from "react";

import { formatSize } from "@/lib/format";
import { readApiJson } from "@/lib/api-response.client";
import type { Work, WorkGallery } from "@/types/revelar";
import { useStoredJsonState } from "@/hooks/use-persisted-state";
import { useUrlStringState } from "@/hooks/use-url-state";

const initialAlbumCovers: Record<string, string> = {};

type Props = {
  works: Work[];
  onOpenWork: (work: Work) => void;
  onOpenEditor: (albumId: string, photoId: string, mode: "quick" | "studio") => void;
  toast: (message: string) => void;
};

type LibraryFilter = "all" | "linked" | "independent";
type PhotoFilter = "all" | "originals" | "edited" | "favorites" | "trash";
const libraryFilters = ["all", "linked", "independent"] as const;
const photoFilters = ["all", "originals", "edited", "favorites", "trash"] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(value?: string) {
  if (!value) return "Sem data definida";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(`${value.slice(0, 10)}T12:00:00`),
  );
}

function imageUrl(galleryId: string, photoId: string, variant?: "original") {
  return `/api/galleries/${galleryId}/photos/${photoId}${variant ? `?variant=${variant}` : ""}`;
}

export function GalleryLibraryView({ works, onOpenWork, onOpenEditor, toast }: Props) {
  const [galleries, setGalleries] = useState<WorkGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useUrlStringState<string>("galleryQ", "");
  const [filter, setFilter] = useUrlStringState<LibraryFilter>(
    "galleryFilter",
    "all",
    libraryFilters,
  );
  const [selectedId, setSelectedId] = useUrlStringState<string>("gallery", "");
  const [photoFilter, setPhotoFilter] = useUrlStringState<PhotoFilter>(
    "galleryFolder",
    "all",
    photoFilters,
  );
  const [newAlbumOpen, setNewAlbumOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<WorkGallery | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [albumDate, setAlbumDate] = useState(today());
  const [workId, setWorkId] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [rating, setRating] = useState(0);
  const [albumOrder, setAlbumOrder] = useState("recent");
  const [albumCovers, setAlbumCovers] = useStoredJsonState(
    "revelar-album-covers",
    initialAlbumCovers,
  );
  const pickerAlbumId = useRef("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const response = await fetch("/api/galleries", { cache: "no-store" });
      const data = await readApiJson<{ galleries?: WorkGallery[]; error?: string }>(
        response,
        "Não foi possível carregar os álbuns.",
      );
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os álbuns.");
      setGalleries(data.galleries || []);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível carregar os álbuns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    void fetch("/api/galleries", { cache: "no-store" })
      .then(async (response) => {
        const data = await readApiJson<{ galleries?: WorkGallery[]; error?: string }>(
          response,
          "Não foi possível carregar os álbuns.",
        );
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar os álbuns.");
        if (mounted) setGalleries(data.galleries || []);
      })
      .catch((error: Error) => {
        if (mounted) toast(error.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [toast]);

  const selectedGallery = galleries.find((gallery) => gallery.id === selectedId) || null;
  const activePhotos = selectedGallery?.photos.filter((photo) => !photo.deletedAt) || [];
  const focused = selectedGallery?.photos.find((photo) => photo.id === focusedId) || null;

  const visibleGalleries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return galleries
      .filter((gallery) => {
        const matchesQuery =
          !query ||
          [gallery.name, gallery.clientName, gallery.workTitle].some((value) =>
            value.toLocaleLowerCase("pt-BR").includes(query),
          );
        const matchesFilter =
          filter === "all" ||
          (filter === "linked" && gallery.workId !== undefined) ||
          (filter === "independent" && gallery.workId === undefined);
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) =>
        albumOrder === "name"
          ? a.name.localeCompare(b.name, "pt-BR")
          : (b.albumDate ?? "").localeCompare(a.albumDate ?? ""),
      );
  }, [albumOrder, filter, galleries, search]);

  const visiblePhotos = selectedGallery
    ? selectedGallery.photos.filter((photo) => {
        if (photoFilter === "trash") return Boolean(photo.deletedAt);
        if (photo.deletedAt) return false;
        if (photoFilter === "originals") return photo.hasOriginal || photo.folder === "originals";
        if (photoFilter === "edited")
          return photo.folder === "edited" || Boolean(photo.editingPhotoId);
        if (photoFilter === "favorites") return photo.rating >= 4;
        return true;
      })
    : [];

  const focusedIndex = visiblePhotos.findIndex((photo) => photo.id === focusedId);

  const openPhotoDetails = (photoId: string) => {
    const photo = selectedGallery?.photos.find((item) => item.id === photoId);
    if (!photo) return;
    setFocusedId(photo.id);
    setNote(photo.internalNote || "");
    setCaption(photo.caption || "");
    setTags(photo.tags.join(", "));
    setRating(photo.rating || 0);
  };

  const resetAlbumForm = () => {
    setName("");
    setDescription("");
    setAlbumDate(today());
    setWorkId("");
    setEditingAlbum(null);
  };

  const openEditAlbum = (gallery: WorkGallery) => {
    setEditingAlbum(gallery);
    setName(gallery.name);
    setDescription(gallery.description);
    setAlbumDate(gallery.albumDate?.slice(0, 10) || today());
    setWorkId(gallery.workId === undefined ? "" : String(gallery.workId));
    setNewAlbumOpen(true);
  };

  const saveAlbum = async () => {
    setBusy(true);
    try {
      const linkedWork = works.find((work) => work.id === Number(workId));
      const response = await fetch(
        editingAlbum ? `/api/galleries/${editingAlbum.id}` : "/api/galleries",
        {
          method: editingAlbum ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            albumDate,
            workId: linkedWork?.id,
            workTitle: linkedWork?.title,
            clientName: editingAlbum?.clientName || "",
          }),
        },
      );
      const data = (await response.json()) as { gallery?: WorkGallery; error?: string };
      if (!response.ok || !data.gallery) throw new Error(data.error || "Não foi possível salvar.");
      setGalleries((current) =>
        editingAlbum
          ? current.map((gallery) => (gallery.id === data.gallery!.id ? data.gallery! : gallery))
          : [data.gallery!, ...current],
      );
      setSelectedId(data.gallery.id);
      setNewAlbumOpen(false);
      resetAlbumForm();
      toast(
        editingAlbum ? "Álbum atualizado" : "Álbum criado. Agora você pode adicionar as fotos.",
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível salvar o álbum.");
    } finally {
      setBusy(false);
    }
  };

  const uploadPhotos = async (files: FileList | File[], albumId = selectedGallery?.id) => {
    if (!albumId || !files.length || busy) return;
    setBusy(true);
    let sent = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("preview", file);
        form.append("folder", "originals");
        const response = await fetch(`/api/galleries/${albumId}/upload`, {
          method: "POST",
          body: form,
        });
        const data = await readApiJson<{ gallery?: WorkGallery; error?: string }>(
          response,
          `Não foi possível enviar ${file.name}.`,
        );
        if (!response.ok || !data.gallery) {
          throw new Error(data.error || `Não foi possível enviar ${file.name}.`);
        }
        sent += 1;
      } catch (error) {
        toast(error instanceof Error ? error.message : `Não foi possível enviar ${file.name}.`);
      }
    }
    await load();
    setBusy(false);
    toast(sent ? `${sent} foto(s) adicionada(s) ao álbum` : "Nenhuma foto pôde ser enviada");
  };

  const savePhotoDetails = async () => {
    if (!selectedGallery || !focused) return;
    setBusy(true);
    const response = await fetch(`/api/galleries/${selectedGallery.id}/photos/${focused.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ internalNote: note, caption, tags: tags.split(","), rating }),
    });
    const data = (await response.json()) as { gallery?: WorkGallery; error?: string };
    setBusy(false);
    if (!response.ok || !data.gallery)
      return toast(data.error || "Não foi possível salvar a ficha da foto.");
    setGalleries((current) =>
      current.map((gallery) => (gallery.id === data.gallery!.id ? data.gallery! : gallery)),
    );
    toast("Informações internas salvas");
  };

  const sendToEditor = async (photoIds: string[], mode: "quick" | "studio") => {
    if (!selectedGallery || !photoIds.length) return;
    setBusy(true);
    const response = await fetch(`/api/galleries/${selectedGallery.id}/edit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ photoIds }),
    });
    const data = (await response.json()) as {
      albumId?: string;
      photoIds?: string[];
      error?: string;
    };
    setBusy(false);
    if (!response.ok || !data.albumId || !data.photoIds?.length)
      return toast(data.error || "Não foi possível preparar a edição.");
    onOpenEditor(data.albumId, data.photoIds[0], mode);
  };

  const trashSelected = async () => {
    if (!selectedGallery || !selectedPhotos.length) return;
    setBusy(true);
    const response = await fetch(`/api/galleries/${selectedGallery.id}/photos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "trash", photoIds: selectedPhotos }),
    });
    const data = (await response.json()) as { gallery?: WorkGallery; error?: string };
    setBusy(false);
    if (!response.ok || !data.gallery)
      return toast(data.error || "Não foi possível mover as fotos.");
    setGalleries((current) =>
      current.map((gallery) => (gallery.id === data.gallery!.id ? data.gallery! : gallery)),
    );
    setSelectedPhotos([]);
    toast("Fotos movidas para a lixeira por 30 dias");
  };

  const restoreSelected = async () => {
    if (!selectedGallery || !selectedPhotos.length) return;
    setBusy(true);
    const response = await fetch(`/api/galleries/${selectedGallery.id}/photos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "restore", photoIds: selectedPhotos }),
    });
    const data = (await response.json()) as { gallery?: WorkGallery; error?: string };
    setBusy(false);
    if (!response.ok || !data.gallery)
      return toast(data.error || "Não foi possível restaurar as fotos.");
    setGalleries((current) =>
      current.map((gallery) => (gallery.id === data.gallery!.id ? data.gallery! : gallery)),
    );
    setSelectedPhotos([]);
    toast("Fotos restauradas no álbum");
  };

  const renderAlbumDialog = () => (
    <div
      className="album-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={editingAlbum ? "Editar álbum" : "Novo álbum"}
    >
      <div className="album-dialog-card">
        <button
          className="modal-close"
          type="button"
          onClick={() => {
            setNewAlbumOpen(false);
            resetAlbumForm();
          }}
          aria-label="Fechar"
        >
          ×
        </button>
        <span>ORGANIZAÇÃO INTERNA</span>
        <h2>{editingAlbum ? "Editar álbum" : "Criar novo álbum"}</h2>
        <p>Álbum interno. Você pode vinculá-lo a um trabalho para abrir a ficha pelo acervo.</p>
        <label>
          <span>Nome do álbum</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`Envio de fotos ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`}
          />
        </label>
        <div className="album-dialog-row">
          <label>
            <span>Data</span>
            <input
              type="date"
              value={albumDate}
              onChange={(event) => setAlbumDate(event.target.value)}
            />
          </label>
          <label>
            <span>Trabalho vinculado (opcional)</span>
            <select
              value={workId}
              disabled={Boolean(editingAlbum)}
              onChange={(event) => {
                const linkedWork = works.find((work) => String(work.id) === event.target.value);
                setWorkId(event.target.value);
                if (!name.trim() && linkedWork) setName(linkedWork.title);
                if (linkedWork?.date && (!albumDate || albumDate === today()))
                  setAlbumDate(linkedWork.date);
              }}
            >
              <option value="">Nenhum trabalho</option>
              {works.map((work) => (
                <option key={work.id} value={work.id}>
                  {work.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>Descrição (opcional)</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Sobre este ensaio ou conjunto de imagens…"
          />
        </label>
        <div className="album-dialog-actions">
          <button
            type="button"
            onClick={() => {
              setNewAlbumOpen(false);
              resetAlbumForm();
            }}
          >
            Cancelar
          </button>
          <button
            className="primary"
            type="button"
            onClick={() => void saveAlbum()}
            disabled={busy}
          >
            {busy ? "Salvando…" : editingAlbum ? "Salvar alterações" : "Criar álbum"}
          </button>
        </div>
      </div>
    </div>
  );

  if (selectedGallery) {
    const linkedWork = works.find((work) => work.id === selectedGallery.workId);
    return (
      <section className="gallery-library internal-gallery detail">
        <header className="internal-gallery-detail-head">
          <button type="button" className="gallery-back" onClick={() => setSelectedId("")}>
            ← Álbuns
          </button>
          <div className="internal-gallery-title">
            <span>
              {selectedGallery.workId === undefined
                ? "ÁLBUM INDEPENDENTE"
                : "VINCULADO A UM TRABALHO"}
            </span>
            <h1>{selectedGallery.name}</h1>
            <p>
              {selectedGallery.description || "Sem descrição"} ·{" "}
              {displayDate(selectedGallery.albumDate)}
            </p>
          </div>
          <div className="internal-gallery-actions">
            <button
              type="button"
              onClick={() => openEditAlbum(selectedGallery)}
              aria-label="Editar álbum"
              title="Editar álbum"
              data-edit-icon
            >
              <RevelarIcon name="edit" />
            </button>
            {linkedWork && (
              <button type="button" onClick={() => onOpenWork(linkedWork)}>
                Abrir trabalho
              </button>
            )}
            <button
              className="primary"
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
            >
              ＋ Adicionar fotos
            </button>
            <input
              ref={fileInput}
              hidden
              multiple
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => event.target.files && void uploadPhotos(event.target.files)}
            />
          </div>
        </header>

        <div className="internal-gallery-stats">
          <div>
            <strong>{activePhotos.length}</strong>
            <span>fotos</span>
          </div>
          <div>
            <strong>{activePhotos.filter((photo) => photo.editingPhotoId).length}</strong>
            <span>em edição</span>
          </div>
          <div>
            <strong>{activePhotos.filter((photo) => photo.rating >= 4).length}</strong>
            <span>favoritas</span>
          </div>
          <div>
            <strong>{formatSize(selectedGallery.stats.totalBytes)}</strong>
            <span>armazenamento</span>
          </div>
        </div>
        <div className="album-photo-toolbar">
          <nav className="internal-gallery-tabs" aria-label="Pastas do álbum">
            {(
              [
                ["all", "Todas"],
                ["originals", "Originais"],
                ["edited", "Em edição"],
                ["favorites", "Favoritas"],
                ["trash", "Lixeira"],
              ] as [PhotoFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                className={photoFilter === value ? "active" : ""}
                type="button"
                onClick={() => {
                  setPhotoFilter(value);
                  setSelectedPhotos([]);
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="internal-gallery-photo-tools">
            <p>{visiblePhotos.length} foto(s) · selecione para ações em lote</p>
            {selectedPhotos.length > 0 && (
              <div>
                <strong>{selectedPhotos.length} selecionada(s)</strong>
                {photoFilter === "trash" ? (
                  <button type="button" onClick={() => void restoreSelected()}>
                    Restaurar no álbum
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void sendToEditor(selectedPhotos, "studio")}
                    >
                      Editar em lote
                    </button>
                    <button className="danger" type="button" onClick={() => void trashSelected()}>
                      Mover para lixeira
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {visiblePhotos.length ? (
          <div className="internal-photo-grid">
            {visiblePhotos.map((photo) => (
              <article
                key={photo.id}
                className={selectedPhotos.includes(photo.id) ? "selected" : ""}
              >
                <button
                  className="photo-open"
                  type="button"
                  onClick={() => openPhotoDetails(photo.id)}
                >
                  <img
                    src={imageUrl(selectedGallery.id, photo.id)}
                    alt={photo.caption || photo.filename}
                  />
                  {photo.editingPhotoId && <span>EM EDIÇÃO</span>}
                </button>
                <button
                  className="photo-select"
                  type="button"
                  aria-label={`Selecionar ${photo.filename}`}
                  onClick={() =>
                    setSelectedPhotos((current) =>
                      current.includes(photo.id)
                        ? current.filter((id) => id !== photo.id)
                        : [...current, photo.id],
                    )
                  }
                >
                  {selectedPhotos.includes(photo.id) ? "✓" : ""}
                </button>
                <footer>
                  <strong>{photo.caption || photo.filename}</strong>
                  <span>
                    {"★".repeat(photo.rating)}
                    {"☆".repeat(5 - photo.rating)}
                  </span>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="gallery-library-empty">
            <span>▧</span>
            <strong>
              {photoFilter === "trash"
                ? "A lixeira está vazia"
                : "Este álbum ainda não tem fotos aqui"}
            </strong>
            {photoFilter !== "trash" && (
              <button type="button" onClick={() => fileInput.current?.click()}>
                Adicionar as primeiras fotos
              </button>
            )}
          </div>
        )}

        {focused && !focused.deletedAt && (
          <div
            className="internal-photo-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Detalhes de ${focused.filename}`}
            onKeyDown={(event) => {
              if (
                (event.target as HTMLElement).closest("input, textarea, select, [contenteditable]")
              )
                return;
              if (focusedIndex < 0 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
              const adjacent = visiblePhotos[focusedIndex + (event.key === "ArrowLeft" ? -1 : 1)];
              event.preventDefault();
              if (adjacent) openPhotoDetails(adjacent.id);
            }}
          >
            <button
              autoFocus
              className="modal-close"
              type="button"
              onClick={() => setFocusedId(null)}
              aria-label="Fechar"
            >
              ×
            </button>
            <div className="internal-photo-stage">
              <img
                src={imageUrl(selectedGallery.id, focused.id, "original")}
                alt={focused.caption || focused.filename}
              />
            </div>
            <aside>
              <div className="photo-modal-heading">
                <span>FICHA INTERNA DA FOTO</span>
                <h2>{focused.filename}</h2>
                <p>Somente você vê estas informações.</p>
              </div>
              {visiblePhotos.some((photo) => photo.id === focused.id) && (
                <nav className="photo-review-navigation" aria-label="Navegar pelas fotos">
                  {[-1, 1].map((direction) => {
                    const index = visiblePhotos.findIndex((photo) => photo.id === focused.id);
                    const adjacent = visiblePhotos[index + direction];
                    return (
                      <button
                        key={direction}
                        type="button"
                        className="outline-button"
                        disabled={!adjacent}
                        onClick={() => adjacent && openPhotoDetails(adjacent.id)}
                      >
                        {direction < 0 ? "‹ Anterior" : "Próxima ›"}
                      </button>
                    );
                  })}
                  <small>
                    {visiblePhotos.findIndex((photo) => photo.id === focused.id) + 1} de{" "}
                    {visiblePhotos.length}
                  </small>
                </nav>
              )}
              {focused.hasPreview && (
                <button
                  className="outline-button"
                  type="button"
                  disabled={albumCovers[selectedGallery.id] === focused.id}
                  onClick={() =>
                    setAlbumCovers((current) => ({ ...current, [selectedGallery.id]: focused.id }))
                  }
                >
                  {albumCovers[selectedGallery.id] === focused.id
                    ? "Capa do álbum"
                    : "Definir como capa"}
                </button>
              )}
              <div className="photo-rating" aria-label="Avaliação da foto">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value === rating ? 0 : value)}
                  >
                    {value <= rating ? "★" : "☆"}
                  </button>
                ))}
              </div>
              <label>
                <span>Legenda</span>
                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Uma legenda para encontrar esta foto"
                />
              </label>
              <label>
                <span>Etiquetas</span>
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="cerimônia, luz natural, retrato"
                />
                <small>Separe por vírgulas</small>
              </label>
              <label className="note">
                <span>Anotação da fotógrafa</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ideias, ajustes e observações internas…"
                />
              </label>
              <button
                className="save-details"
                type="button"
                onClick={() => void savePhotoDetails()}
                disabled={busy}
              >
                Salvar informações
              </button>
              <div className="photo-edit-actions">
                <button type="button" onClick={() => void sendToEditor([focused.id], "quick")}>
                  ⚡ Edição rápida
                </button>
                <button
                  className="primary"
                  type="button"
                  onClick={() => void sendToEditor([focused.id], "studio")}
                >
                  Abrir no estúdio →
                </button>
              </div>
              <p className="version-note">
                O original fica preservado. A edição cria uma nova versão para você decidir se
                deseja enviar ao trabalho.
              </p>
            </aside>
          </div>
        )}
        {newAlbumOpen && renderAlbumDialog()}
      </section>
    );
  }

  const totalPhotos = galleries.reduce(
    (sum, gallery) => sum + gallery.photos.filter((photo) => !photo.deletedAt).length,
    0,
  );
  const totalBytes = galleries.reduce((sum, gallery) => sum + gallery.stats.totalBytes, 0);
  return (
    <section className="gallery-library internal-gallery">
      <input
        hidden
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length) void uploadPhotos(files, pickerAlbumId.current);
        }}
      />
      <header className="internal-gallery-home-head">
        <div>
          <span>ACERVO FOTOGRÁFICO</span>
          <h1>Galeria</h1>
          <p>Organize ensaios, referências e fotos avulsas em álbuns internos.</p>
        </div>
        <button
          className="primary"
          type="button"
          onClick={() => {
            resetAlbumForm();
            setNewAlbumOpen(true);
          }}
        >
          ＋ Novo álbum
        </button>
      </header>
      <div className="internal-gallery-overview">
        <div>
          <span>Álbuns</span>
          <strong>{galleries.length}</strong>
          <small>todos tratados da mesma forma</small>
        </div>
        <div>
          <span>Fotos no acervo</span>
          <strong>{totalPhotos}</strong>
          <small>originais preservados</small>
        </div>
        <div>
          <span>Em edição</span>
          <strong>
            {galleries.reduce(
              (sum, gallery) =>
                sum +
                gallery.photos.filter((photo) => photo.editingPhotoId && !photo.deletedAt).length,
              0,
            )}
          </strong>
          <small>versões separadas</small>
        </div>
        <div>
          <span>Armazenamento</span>
          <strong>{formatSize(totalBytes)}</strong>
          <small>uso total da galeria</small>
        </div>
      </div>
      <div className="internal-gallery-toolbar">
        <label className="gallery-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar álbum, cliente ou trabalho"
          />
        </label>
        <div className="gallery-filter-pills">
          {(
            [
              ["all", "Todos"],
              ["linked", "Com trabalho"],
              ["independent", "Independentes"],
            ] as [LibraryFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              type="button"
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          className="gallery-album-order"
          aria-label="Ordenar álbuns"
          value={albumOrder}
          onChange={(event) => setAlbumOrder(event.target.value)}
        >
          <option value="recent">Mais recentes</option>
          <option value="name">Nome (A–Z)</option>
        </select>
      </div>
      {loading ? (
        <div className="gallery-library-empty">
          <span>◌</span>
          <strong>Carregando seu acervo…</strong>
        </div>
      ) : visibleGalleries.length ? (
        <div className="internal-album-grid">
          {visibleGalleries.map((gallery) => {
            const previews = gallery.photos.filter((photo) => !photo.deletedAt && photo.hasPreview);
            const cover =
              previews.find((photo) => photo.id === albumCovers[gallery.id]) ?? previews[0];
            const empty = !gallery.photos.some((photo) => !photo.deletedAt);
            const openAlbum = () => {
              setSelectedId(gallery.id);
              setPhotoFilter("all");
            };
            return (
              <article key={gallery.id}>
                <button
                  className="album-cover"
                  type="button"
                  disabled={empty && busy}
                  aria-label={empty ? `Adicionar fotos a ${gallery.name}` : `Abrir ${gallery.name}`}
                  onClick={() => {
                    if (!empty) return openAlbum();
                    pickerAlbumId.current = gallery.id;
                    fileInput.current?.click();
                  }}
                >
                  {cover ? (
                    <img src={imageUrl(gallery.id, cover.id)} alt="" />
                  ) : (
                    <span>
                      ＋<small>{empty ? "Adicionar fotos" : "Abrir álbum"}</small>
                    </span>
                  )}
                  <b>{gallery.workId === undefined ? "INDEPENDENTE" : "TRABALHO"}</b>
                </button>
                <div className="album-body">
                  <div>
                    <span>{gallery.clientName || "Acervo pessoal"}</span>
                    <h2>
                      <button className="album-title-link" type="button" onClick={openAlbum}>
                        {gallery.name}
                      </button>
                    </h2>
                    <p>{gallery.description || displayDate(gallery.albumDate)}</p>
                  </div>
                  <footer>
                    <span>{gallery.photos.filter((photo) => !photo.deletedAt).length} fotos</span>
                    {gallery.stats.totalBytes > 0 && (
                      <span>{formatSize(gallery.stats.totalBytes)}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditAlbum(gallery)}
                      aria-label={`Editar ${gallery.name}`}
                      title="Editar álbum"
                      data-edit-icon
                    >
                      <RevelarIcon name="edit" />
                    </button>
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="gallery-library-empty">
          <span>▧</span>
          <strong>
            {galleries.length ? "Nenhum álbum encontrado" : "Crie seu primeiro álbum interno"}
          </strong>
          <p>Ele pode existir sozinho ou apenas apontar para um trabalho.</p>
          <button type="button" onClick={() => setNewAlbumOpen(true)}>
            Criar álbum
          </button>
        </div>
      )}
      {newAlbumOpen && renderAlbumDialog()}
    </section>
  );
}
