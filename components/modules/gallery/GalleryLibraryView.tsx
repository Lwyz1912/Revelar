"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { galleryFolderLabels, initialDemoGalleries, type DemoGallery } from "@/data/demo-galleries";
import { formatSize } from "@/lib/format";
import type { GalleryFolder, GalleryPhase, Work, WorkGallery } from "@/types/revelar";
import { useUrlStringState } from "@/hooks/use-url-state";

type Props = { works: Work[]; onOpenWork: (work: Work) => void; toast: (message: string) => void };
type DemoPhotoState = { selected: boolean; approved: boolean; comment: string };
type DemoState = { photos: Record<string, DemoPhotoState>; locks: Record<string, boolean> };

const storageKey = "revelar:demo-gallery-state:v1";
const folderOrder: GalleryFolder[] = ["preview", "selection", "edited", "delivered", "originals"];
const galleryModes = ["demo", "real"] as const;
const galleryViews = ["cards", "list"] as const;
const galleryPhases = ["all", "selection", "approval", "delivery"] as const;

function freshDemoState(): DemoState {
  return {
    photos: Object.fromEntries(
      initialDemoGalleries.flatMap((gallery) =>
        gallery.photos.map((photo) => [
          photo.id,
          { selected: photo.selected, approved: photo.approved, comment: photo.comment },
        ]),
      ),
    ),
    locks: Object.fromEntries(
      initialDemoGalleries.map((gallery) => [gallery.id, gallery.selectionLocked]),
    ),
  };
}

function phaseLabel(phase: GalleryPhase) {
  return phase === "selection" ? "Seleção" : phase === "approval" ? "Aprovação" : "Entrega";
}

function phaseStatus(phase: GalleryPhase, locked: boolean) {
  if (phase === "delivery") return "Entrega liberada";
  if (phase === "approval") return locked ? "Aprovação confirmada" : "Aguardando aprovação";
  return locked ? "Seleção confirmada" : "Seleção aberta";
}

function folderState(status: "ready" | "active" | "waiting") {
  return status === "ready" ? "Pronta" : status === "active" ? "Em andamento" : "Aguardando";
}

export function GalleryLibraryView({ works, onOpenWork, toast }: Props) {
  const [mode, setMode] = useUrlStringState("galleryMode", "demo", galleryModes);
  const [view, setView] = useUrlStringState("galleryView", "cards", galleryViews);
  const [search, setSearch] = useUrlStringState<string>("galleryQ", "");
  const [phase, setPhase] = useUrlStringState<"all" | GalleryPhase>(
    "galleryPhase",
    "all",
    galleryPhases,
  );
  const [category, setCategory] = useUrlStringState<string>("galleryCategory", "all");
  const [real, setReal] = useState<WorkGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [realError, setRealError] = useState("");
  const [selectedId, setSelectedId] = useUrlStringState<string>("gallery", "");
  const [activeFolder, setActiveFolder] = useUrlStringState<GalleryFolder>(
    "galleryFolder",
    "preview",
    folderOrder,
  );
  const [clientPreview, setClientPreview] = useState(false);
  const [focusPhotoId, setFocusPhotoId] = useState<string | null>(null);
  const [demo, setDemo] = useState<DemoState>(() => {
    if (typeof window === "undefined") return freshDemoState();
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || "null") || freshDemoState();
    } catch {
      return freshDemoState();
    }
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(demo));
  }, [demo]);
  useEffect(() => {
    let mounted = true;
    void fetch("/api/galleries", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar as galerias reais.");
        return (await response.json()) as { galleries: WorkGallery[] };
      })
      .then((data) => {
        if (mounted) setReal(data.galleries);
      })
      .catch((error: Error) => {
        if (mounted) setRealError(error.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const matches = useCallback(
    (title: string, client: string, itemPhase: GalleryPhase, itemCategory: string) => {
      const query = search.trim().toLocaleLowerCase("pt-BR");
      return (
        (!query ||
          title.toLocaleLowerCase("pt-BR").includes(query) ||
          client.toLocaleLowerCase("pt-BR").includes(query)) &&
        (phase === "all" || phase === itemPhase) &&
        (category === "all" || category === itemCategory)
      );
    },
    [category, phase, search],
  );

  const visibleDemo = useMemo(
    () =>
      initialDemoGalleries.filter((gallery) =>
        matches(gallery.workTitle, gallery.clientName, gallery.phase, gallery.category),
      ),
    [matches],
  );
  const visibleReal = useMemo(
    () =>
      real.filter((gallery) =>
        matches(
          gallery.workTitle,
          gallery.clientName,
          gallery.phase,
          works.find((work) => work.id === gallery.workId)?.category || "Galeria",
        ),
      ),
    [matches, real, works],
  );
  const selectedDemo = initialDemoGalleries.find((gallery) => gallery.id === selectedId) || null;
  const selectedReal = real.find((gallery) => gallery.id === selectedId) || null;

  const resetDemo = () => {
    setDemo(freshDemoState());
    setSelectedId("");
    setClientPreview(false);
    toast("Dados de demonstração restaurados");
  };
  const setPhoto = (photoId: string, update: Partial<DemoPhotoState>) =>
    setDemo((current) => ({
      ...current,
      photos: { ...current.photos, [photoId]: { ...current.photos[photoId], ...update } },
    }));
  const setLocked = (gallery: DemoGallery, locked: boolean) => {
    setDemo((current) => ({ ...current, locks: { ...current.locks, [gallery.id]: locked } }));
    toast(locked ? "Etapa confirmada no modo demonstração" : "Etapa reaberta para teste");
  };

  if (selectedDemo || selectedReal) {
    const isDemo = mode === "demo" && Boolean(selectedDemo);
    const gallery = isDemo ? selectedDemo! : selectedReal!;
    const work = works.find((item) => item.id === gallery.workId);
    const locked = isDemo ? Boolean(demo.locks[gallery.id]) : gallery.selectionLocked;
    const photos = isDemo
      ? selectedDemo!.photos.map((photo) => ({
          ...photo,
          ...demo.photos[photo.id],
          folder: undefined as GalleryFolder | undefined,
        }))
      : selectedReal!.photos.map((photo) => ({
          ...photo,
          image: `/api/galleries/${selectedReal!.id}/photos/${photo.id}`,
        }));
    const filteredPhotos = photos.filter((photo) =>
      activeFolder === "selection"
        ? photo.selected
        : activeFolder === "edited"
          ? isDemo
            ? photo.selected
            : photo.folder === "edited"
          : activeFolder === "delivered"
            ? isDemo
              ? photo.approved
              : photo.folder === "delivered"
            : activeFolder === "originals"
              ? isDemo || photo.folder === "originals"
              : isDemo || photo.folder === "preview",
    );
    const selectionCount = photos.filter((photo) => photo.selected).length;
    const approvedCount = photos.filter((photo) => photo.approved).length;
    const focused = photos.find((photo) => photo.id === focusPhotoId) || null;
    const folderCount = (folder: GalleryFolder) => {
      if (folder === "selection") return selectionCount;
      if (isDemo) return selectedDemo!.folders.find((item) => item.id === folder)?.count || 0;
      if (folder === "edited")
        return selectedReal!.photos.filter(
          (photo) => photo.folder === "edited" || photo.hasHigh || photo.hasSocial,
        ).length;
      return selectedReal!.photos.filter((photo) => photo.folder === folder).length;
    };
    const totalBytes = isDemo
      ? selectedDemo!.folders.reduce((sum, folder) => sum + folder.bytes, 0)
      : selectedReal!.stats.totalBytes;

    return (
      <section className="gallery-library gallery-detail">
        <button className="gallery-back" type="button" onClick={() => setSelectedId("")}>
          ← Todas as galerias
        </button>
        <header className="gallery-detail-heading">
          <div>
            <span className={`gallery-phase phase-${gallery.phase}`}>
              {phaseLabel(gallery.phase)}
            </span>
            <h1>{gallery.workTitle}</h1>
            <p>
              {gallery.clientName} · {work?.category || selectedDemo?.category || "Galeria"}
            </p>
          </div>
          <div className="gallery-detail-actions">
            {isDemo && (
              <button type="button" onClick={() => setClientPreview(true)}>
                Simular cliente
              </button>
            )}
            {work && (
              <button className="primary" type="button" onClick={() => onOpenWork(work)}>
                Gerenciar no trabalho
              </button>
            )}
          </div>
        </header>
        <div className="gallery-metrics">
          <div>
            <span>Selecionadas</span>
            <strong>
              {selectionCount}/{gallery.selectionLimit}
            </strong>
          </div>
          <div>
            <span>Aprovadas</span>
            <strong>{approvedCount}</strong>
          </div>
          <div>
            <span>Etapa</span>
            <strong>{phaseStatus(gallery.phase, locked)}</strong>
          </div>
          <div>
            <span>Armazenamento</span>
            <strong>{formatSize(totalBytes)}</strong>
          </div>
        </div>
        <div className="gallery-folders">
          {folderOrder.map((folder) => {
            const item = selectedDemo?.folders.find((entry) => entry.id === folder);
            const status = item?.status || (folderCount(folder) ? "ready" : "waiting");
            return (
              <button
                key={folder}
                className={activeFolder === folder ? "active" : ""}
                type="button"
                onClick={() => setActiveFolder(folder)}
              >
                <i>⌑</i>
                <span>
                  <strong>{galleryFolderLabels[folder]}</strong>
                  <small>{folderCount(folder)} arquivos</small>
                </span>
                <b className={`state-${status}`}>{folderState(status)}</b>
              </button>
            );
          })}
        </div>
        <div className="gallery-photo-title">
          <div>
            <span>{galleryFolderLabels[activeFolder]}</span>
            <strong>{filteredPhotos.length} amostras visíveis</strong>
          </div>
          {isDemo && locked && gallery.phase !== "delivery" && (
            <button type="button" onClick={() => setLocked(selectedDemo!, false)}>
              Reabrir etapa
            </button>
          )}
        </div>
        {filteredPhotos.length ? (
          <div className="gallery-admin-photos">
            {filteredPhotos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                className={photo.selected ? "selected" : ""}
                onClick={() => setFocusPhotoId(photo.id)}
              >
                <span>
                  <img
                    src={photo.image}
                    alt={photo.filename}
                    style={{ objectPosition: `${30 + (index % 3) * 20}% center` }}
                  />
                  {isDemo && activeFolder !== "delivered" && <i>REVELAR. · DEMONSTRAÇÃO</i>}
                </span>
                <small>
                  {photo.filename}
                  {photo.comment ? " · comentário" : ""}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div className="gallery-library-empty">
            <span>⌑</span>
            <strong>Esta pasta ainda está vazia</strong>
          </div>
        )}
        {focused && (
          <div className="gallery-focus" role="dialog" aria-modal="true">
            <button className="close" type="button" onClick={() => setFocusPhotoId(null)}>
              ×
            </button>
            <div>
              <img src={focused.image} alt={focused.filename} />
              {isDemo && gallery.phase !== "delivery" && <i>REVELAR. · {gallery.clientName}</i>}
            </div>
            <aside>
              <span>{focused.filename}</span>
              <h2>{phaseLabel(gallery.phase)}</h2>
              {isDemo && gallery.phase === "selection" && !locked && (
                <button
                  className={focused.selected ? "active" : ""}
                  type="button"
                  onClick={() => setPhoto(focused.id, { selected: !focused.selected })}
                >
                  {focused.selected ? "♥ Foto escolhida" : "♡ Escolher foto"}
                </button>
              )}
              {isDemo && gallery.phase === "approval" && !locked && (
                <button
                  className={focused.approved ? "active" : ""}
                  type="button"
                  onClick={() => setPhoto(focused.id, { approved: !focused.approved })}
                >
                  {focused.approved ? "✓ Foto aprovada" : "Aprovar foto"}
                </button>
              )}
              {isDemo && gallery.phase !== "delivery" && (
                <label>
                  <span>Comentário do cliente</span>
                  <textarea
                    value={focused.comment}
                    onChange={(event) => setPhoto(focused.id, { comment: event.target.value })}
                    placeholder="Escreva um pedido de ajuste…"
                  />
                </label>
              )}
              {gallery.phase === "delivery" && (
                <a href={focused.image} download={focused.filename}>
                  Baixar amostra
                </a>
              )}
            </aside>
          </div>
        )}
        {clientPreview && selectedDemo && (
          <div className="demo-client" role="dialog" aria-modal="true">
            <header>
              <img src="/brand/revelar-logo-horizontal.svg" alt="Revelar." />
              <div>
                <span>VISÃO DO CLIENTE · DEMONSTRAÇÃO</span>
                <strong>{selectedDemo.workTitle}</strong>
              </div>
              <button type="button" onClick={() => setClientPreview(false)}>
                ×
              </button>
            </header>
            <div className="demo-progress">
              <span>
                {selectionCount} de {selectedDemo.selectionLimit} escolhidas
              </span>
              {selectedDemo.phase !== "delivery" && !locked && (
                <button type="button" onClick={() => setLocked(selectedDemo, true)}>
                  Confirmar {selectedDemo.phase === "approval" ? "aprovação" : "seleção"}
                </button>
              )}
              {locked && <strong>✓ Confirmado</strong>}
            </div>
            <div className="demo-grid">
              {photos.map((photo, index) => (
                <article key={photo.id} className={photo.selected ? "selected" : ""}>
                  <img
                    src={photo.image}
                    alt={photo.filename}
                    style={{ objectPosition: `${30 + (index % 3) * 20}% center` }}
                  />
                  {selectedDemo.phase !== "delivery" && <i>REVELAR. · {selectedDemo.clientName}</i>}
                  {selectedDemo.phase === "selection" && !locked && (
                    <button
                      type="button"
                      onClick={() => setPhoto(photo.id, { selected: !photo.selected })}
                    >
                      {photo.selected ? "♥" : "♡"}
                    </button>
                  )}
                  {selectedDemo.phase === "approval" && !locked && (
                    <button
                      type="button"
                      onClick={() => setPhoto(photo.id, { approved: !photo.approved })}
                    >
                      {photo.approved ? "✓" : "○"}
                    </button>
                  )}
                  {selectedDemo.phase === "delivery" && (
                    <a href={photo.image} download={photo.filename}>
                      ↓
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  const categories = Array.from(new Set(initialDemoGalleries.map((gallery) => gallery.category)));
  const items = mode === "demo" ? visibleDemo : visibleReal;
  return (
    <section className="gallery-library">
      <header className="gallery-library-header">
        <div>
          <span>ARQUIVOS E ENTREGAS</span>
          <h1>Galeria</h1>
          <p>{items.length} ensaios organizados</p>
        </div>
        <div className="gallery-mode">
          <button
            className={mode === "real" ? "active" : ""}
            type="button"
            onClick={() => setMode("real")}
          >
            Dados reais <small>{real.length}</small>
          </button>
          <button
            className={mode === "demo" ? "active" : ""}
            type="button"
            onClick={() => setMode("demo")}
          >
            Demonstração <small>4</small>
          </button>
        </div>
      </header>
      <div className="gallery-tools">
        <label>
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente ou trabalho"
          />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Todas as categorias</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={phase}
          onChange={(event) => setPhase(event.target.value as "all" | GalleryPhase)}
        >
          <option value="all">Todas as etapas</option>
          <option value="selection">Seleção</option>
          <option value="approval">Aprovação</option>
          <option value="delivery">Entrega</option>
        </select>
        <div>
          <button
            className={view === "cards" ? "active" : ""}
            type="button"
            onClick={() => setView("cards")}
          >
            ▦
          </button>
          <button
            className={view === "list" ? "active" : ""}
            type="button"
            onClick={() => setView("list")}
          >
            ☷
          </button>
        </div>
        {mode === "demo" && (
          <button type="button" onClick={resetDemo}>
            ↻ Restaurar testes
          </button>
        )}
      </div>
      {mode === "real" && loading ? (
        <div className="gallery-library-empty">
          <span>◌</span>
          <strong>Carregando galerias…</strong>
        </div>
      ) : mode === "real" && realError ? (
        <div className="gallery-library-empty">
          <span>!</span>
          <strong>{realError}</strong>
        </div>
      ) : mode === "real" && !items.length ? (
        <div className="gallery-library-empty">
          <span>⌑</span>
          <strong>Nenhuma galeria real criada ainda</strong>
          <button type="button" onClick={() => setMode("demo")}>
            Abrir demonstração
          </button>
        </div>
      ) : (
        <div className={`gallery-cards view-${view}`}>
          {items.map((item) => {
            const demoItem = mode === "demo" ? (item as DemoGallery) : null;
            const realItem = mode === "real" ? (item as WorkGallery) : null;
            const work = works.find((entry) => entry.id === item.workId);
            const locked = demoItem ? demo.locks[demoItem.id] : realItem?.selectionLocked;
            const bytes =
              demoItem?.folders.reduce((sum, folder) => sum + folder.bytes, 0) ||
              realItem?.stats.totalBytes ||
              0;
            const count = demoItem?.folders[0].count || realItem?.stats.captured || 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  setActiveFolder("preview");
                }}
              >
                <div className="cover">
                  {demoItem ? <img src={demoItem.cover} alt="" /> : <span>⌑</span>}
                  {demoItem && <small>DEMONSTRAÇÃO</small>}
                  <b className={`phase-${item.phase}`}>{phaseLabel(item.phase)}</b>
                </div>
                <div className="body">
                  <span>{item.clientName}</span>
                  <h2>{item.workTitle}</h2>
                  <p>{work?.category || demoItem?.category || "Galeria"}</p>
                  <div className="progress">
                    <i
                      style={{
                        width:
                          item.phase === "delivery"
                            ? "100%"
                            : item.phase === "approval"
                              ? "68%"
                              : locked
                                ? "42%"
                                : "24%",
                      }}
                    />
                  </div>
                  <small>{phaseStatus(item.phase, Boolean(locked))}</small>
                  <footer>
                    <span>{count} fotos</span>
                    <span>{formatSize(bytes)}</span>
                    <b>›</b>
                  </footer>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
