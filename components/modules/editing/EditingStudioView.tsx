"use client";

import { type ChangeEvent, type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

import {
  blendAdjustments,
  builtInPresets,
  buildDemoEditingData,
  editingCssFilter,
  neutralAdjustments,
  normalizeAdjustments,
  parseImportedPreset,
  presetCategories,
} from "@/lib/editing";
import { createEditingPreview, downloadBlob, renderEditedPhoto } from "@/lib/editor-image.client";
import type {
  EditingAdjustments,
  EditingAlbum,
  EditingPhoto,
  EditingPreset,
} from "@/types/revelar";

type LibraryResponse = {
  albums: EditingAlbum[];
  photos: EditingPhoto[];
  presets: EditingPreset[];
};

const demo = buildDemoEditingData();
const adjustmentGroups: Array<{
  label: string;
  fields: Array<{ key: keyof EditingAdjustments; label: string; min?: number }>;
}> = [
  {
    label: "Luz e cor",
    fields: [
      { key: "exposure", label: "Exposição" },
      { key: "contrast", label: "Contraste" },
      { key: "highlights", label: "Realces" },
      { key: "shadows", label: "Sombras" },
      { key: "temperature", label: "Temperatura" },
      { key: "tint", label: "Matiz" },
      { key: "saturation", label: "Saturação" },
    ],
  },
  {
    label: "Lente e filme",
    fields: [
      { key: "fade", label: "Desbotado", min: 0 },
      { key: "grain", label: "Grão", min: 0 },
      { key: "softness", label: "Foco suave", min: 0 },
      { key: "motionTrail", label: "Rastro de movimento", min: 0 },
      { key: "coolShadows", label: "Sombras frias", min: 0 },
      { key: "warmHighlights", label: "Luzes quentes", min: 0 },
      { key: "vignette", label: "Vinheta", min: 0 },
      { key: "halation", label: "Halation", min: 0 },
      { key: "chromatic", label: "Aberração", min: 0 },
      { key: "dust", label: "Poeira", min: 0 },
      { key: "lightLeak", label: "Vazamento de luz", min: 0 },
    ],
  },
];

function bytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(value > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function filenameWithoutExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, "");
}

function effectVariables(adjustments: EditingAdjustments, original = false) {
  return {
    "--edit-grain": original ? 0 : adjustments.grain / 100,
    "--edit-vignette": original ? 0 : adjustments.vignette / 100,
    "--edit-halation": original ? 0 : adjustments.halation / 100,
    "--edit-leak": original ? 0 : adjustments.lightLeak / 100,
    "--edit-dust": original ? 0 : adjustments.dust / 100,
    "--edit-chromatic": original ? 0 : adjustments.chromatic / 100,
    "--edit-motion": original ? 0 : adjustments.motionTrail / 100,
    "--edit-cool-shadows": original ? 0 : adjustments.coolShadows / 100,
    "--edit-warm-highlights": original ? 0 : adjustments.warmHighlights / 100,
  } as CSSProperties;
}

function FilteredImage({
  src,
  alt,
  adjustments,
  original = false,
}: {
  src: string;
  alt: string;
  adjustments: EditingAdjustments;
  original?: boolean;
}) {
  const filter = original ? "none" : editingCssFilter(adjustments);
  const hasTrail = !original && adjustments.motionTrail > 0;
  return (
    <>
      {hasTrail && (
        <>
          <img
            className="editing-motion-layer editing-motion-layer-one"
            src={src}
            alt=""
            aria-hidden="true"
            style={{ filter }}
          />
          <img
            className="editing-motion-layer editing-motion-layer-two"
            src={src}
            alt=""
            aria-hidden="true"
            style={{ filter }}
          />
        </>
      )}
      <img className="editing-effect-main" src={src} alt={alt} style={{ filter }} />
      <span className="editing-film-grain" aria-hidden="true" />
    </>
  );
}

function FilmTextureDefinitions() {
  return (
    <svg className="editing-filter-definitions" aria-hidden="true" focusable="false">
      <defs>
        <filter id="revelar-film-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="3"
            seed="19"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
    </svg>
  );
}

export function EditingStudioView({ toast }: { toast: (message: string) => void }) {
  const [albums, setAlbums] = useState<EditingAlbum[]>(demo.albums);
  const [photos, setPhotos] = useState<EditingPhoto[]>(demo.photos);
  const [privatePresets, setPrivatePresets] = useState<EditingPreset[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string | undefined>();
  const [adjustments, setAdjustments] = useState<EditingAdjustments>(neutralAdjustments);
  const [presetIntensity, setPresetIntensity] = useState(100);
  const [presetCategory, setPresetCategory] = useState<(typeof presetCategories)[number]>("Todos");
  const [showOriginal, setShowOriginal] = useState(false);
  const [adjustmentGroup, setAdjustmentGroup] = useState("Luz e cor");
  const [albumDialog, setAlbumDialog] = useState(false);
  const [albumName, setAlbumName] = useState("");
  const [busy, setBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const presetInput = useRef<HTMLInputElement>(null);

  const presets = [...builtInPresets, ...privatePresets];
  const shelfPresets = builtInPresets.filter(
    (preset) => presetCategory === "Todos" || preset.category === presetCategory,
  );
  const activeAlbum = albums.find((album) => album.id === activeAlbumId);
  const activePhoto = photos.find((photo) => photo.id === activePhotoId);
  const albumPhotos = photos.filter((photo) => photo.albumId === activeAlbumId);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/editing")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as LibraryResponse;
      })
      .then((library) => {
        if (!library || cancelled) return;
        setAlbums([...library.albums, ...demo.albums]);
        setPhotos([...library.photos, ...demo.photos]);
        setPrivatePresets(library.presets);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const edited = useMemo(
    () => JSON.stringify(adjustments) !== JSON.stringify(neutralAdjustments),
    [adjustments],
  );

  const openPhoto = (photo: EditingPhoto) => {
    setActiveAlbumId(photo.albumId);
    setActivePhotoId(photo.id);
    setPresetId(photo.presetId);
    setAdjustments(normalizeAdjustments(photo.adjustments));
    setPresetIntensity(100);
    setShowOriginal(false);
  };

  const choosePreset = (preset: EditingPreset) => {
    setPresetId(preset.id);
    setPresetIntensity(100);
    setAdjustments(normalizeAdjustments(preset.adjustments));
  };

  const openPhotoWithPreset = (photo: EditingPhoto, preset: EditingPreset) => {
    openPhoto(photo);
    choosePreset(preset);
  };

  const saveRecipe = async () => {
    if (!activePhoto) return;
    setBusy(true);
    setPhotos((current) =>
      current.map((photo) =>
        photo.id === activePhoto.id
          ? { ...photo, presetId, adjustments, updatedAt: new Date().toISOString() }
          : photo,
      ),
    );
    if (!activePhoto.demo) {
      const response = await fetch(`/api/editing/photos/${activePhoto.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presetId, adjustments }),
      });
      if (!response.ok) {
        toast("Não foi possível salvar a receita desta foto");
        setBusy(false);
        return;
      }
    }
    toast("Edição salva sem alterar o original");
    setBusy(false);
  };

  const exportPhoto = async (format: "jpeg" | "png", saveOnline = false) => {
    if (!activePhoto) return;
    setBusy(true);
    try {
      const mimeType = format === "png" ? "image/png" : "image/jpeg";
      const blob = await renderEditedPhoto(activePhoto.originalUrl, adjustments, {
        mimeType,
        quality: 0.96,
      });
      const extension = format === "png" ? "png" : "jpg";
      const filename = `${filenameWithoutExtension(activePhoto.filename)}-revelar.${extension}`;
      if (saveOnline && !activePhoto.demo) {
        const form = new FormData();
        form.append("file", new File([blob], filename, { type: mimeType }));
        const response = await fetch(`/api/editing/photos/${activePhoto.id}/rendered`, {
          method: "POST",
          body: form,
        });
        if (!response.ok) throw new Error("Não foi possível salvar a versão editada.");
        const library = (await response.json()) as LibraryResponse;
        setPhotos([...library.photos, ...demo.photos]);
        toast("Versão editada salva no álbum");
      } else {
        downloadBlob(blob, filename);
        toast(format === "png" ? "PNG sem perdas exportado" : "JPG em qualidade máxima exportado");
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível exportar a foto");
    } finally {
      setBusy(false);
    }
  };

  const createAlbum = async () => {
    if (!albumName.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/editing/albums", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: albumName }),
      });
      const body = (await response.json()) as { album?: EditingAlbum; error?: string };
      if (!response.ok || !body.album)
        throw new Error(body.error || "Não foi possível criar o álbum.");
      setAlbums((current) => [body.album!, ...current]);
      setAlbumDialog(false);
      setAlbumName("");
      setActiveAlbumId(body.album.id);
      toast("Álbum criado");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível criar o álbum");
    } finally {
      setBusy(false);
    }
  };

  const uploadPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files || [])];
    if (!activeAlbum || activeAlbum.demo || !files.length) return;
    setBusy(true);
    try {
      let library: LibraryResponse | null = null;
      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error(`${file.name}: use JPG, PNG ou WebP nesta primeira versão.`);
        }
        const preview = await createEditingPreview(file);
        const form = new FormData();
        form.append("file", file);
        form.append("preview", preview.file);
        form.append("width", String(preview.width));
        form.append("height", String(preview.height));
        const response = await fetch(`/api/editing/albums/${activeAlbum.id}/photos`, {
          method: "POST",
          body: form,
        });
        const body = (await response.json()) as LibraryResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || `Falha ao importar ${file.name}`);
        library = body;
      }
      if (library) {
        setAlbums([...library.albums, ...demo.albums]);
        setPhotos([...library.photos, ...demo.photos]);
      }
      toast(
        `${files.length} foto${files.length === 1 ? " importada" : "s importadas"} sem alterar os originais`,
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível importar as fotos");
    } finally {
      event.target.value = "";
      setBusy(false);
    }
  };

  const importPreset = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const preset = await parseImportedPreset(file);
      const response = await fetch("/api/editing/presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(preset),
      });
      if (response.ok) {
        const library = (await response.json()) as LibraryResponse;
        setPrivatePresets(library.presets);
      } else {
        setPrivatePresets((current) => [preset, ...current]);
      }
      setPresetId(preset.id);
      setAdjustments(preset.adjustments);
      toast(`${preset.name} importado com conversão aproximada`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível importar o preset");
    } finally {
      event.target.value = "";
      setBusy(false);
    }
  };

  if (activePhoto) {
    const effectVars = effectVariables(adjustments, showOriginal);
    return (
      <div className="editing-studio editor-open">
        <FilmTextureDefinitions />
        <header className="editing-editor-bar">
          <button type="button" className="back-button" onClick={() => setActivePhotoId(null)}>
            ←
          </button>
          <div>
            <span>{activeAlbum?.name}</span>
            <strong>{activePhoto.filename}</strong>
          </div>
          <div className="editing-editor-actions">
            <button type="button" onClick={saveRecipe} disabled={busy}>
              Salvar edição
            </button>
            <details>
              <summary>Exportar</summary>
              <div>
                <button type="button" onClick={() => exportPhoto("jpeg")}>
                  JPG · qualidade máxima
                </button>
                <button type="button" onClick={() => exportPhoto("png")}>
                  PNG · sem perdas
                </button>
                {!activePhoto.demo && (
                  <button type="button" onClick={() => exportPhoto("jpeg", true)}>
                    Salvar versão no álbum
                  </button>
                )}
              </div>
            </details>
          </div>
        </header>

        <div className="editing-workspace">
          <section className="editing-canvas-area">
            <div className="editing-photo-stage">
              <div className="editing-photo-effects" style={effectVars}>
                <FilteredImage
                  src={activePhoto.previewUrl}
                  alt={activePhoto.filename}
                  adjustments={adjustments}
                  original={showOriginal}
                />
              </div>
              <button
                className="compare-button"
                type="button"
                onPointerDown={() => setShowOriginal(true)}
                onPointerUp={() => setShowOriginal(false)}
                onPointerCancel={() => setShowOriginal(false)}
                onPointerLeave={() => setShowOriginal(false)}
              >
                {showOriginal ? "Original" : "Segure para comparar"}
              </button>
            </div>
            <div className="editing-preset-strip" aria-label="Presets">
              <button
                type="button"
                className={!presetId && !edited ? "active" : ""}
                onClick={() => {
                  setPresetId(undefined);
                  setPresetIntensity(100);
                  setAdjustments(neutralAdjustments);
                }}
              >
                <span>
                  <img src={activePhoto.previewUrl} alt="" />
                </span>
                Original
              </button>
              {presets.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  className={presetId === preset.id ? "active" : ""}
                  onClick={() => choosePreset(preset)}
                >
                  <span style={effectVariables(preset.adjustments)}>
                    <FilteredImage
                      src={activePhoto.previewUrl}
                      alt=""
                      adjustments={preset.adjustments}
                    />
                  </span>
                  {preset.name}
                </button>
              ))}
            </div>
          </section>

          <aside className="editing-controls">
            {presetId && (
              <label className="editing-intensity">
                <span>
                  Intensidade do preset <b>{presetIntensity}%</b>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={presetIntensity}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    const preset = presets.find((item) => item.id === presetId);
                    setPresetIntensity(value);
                    if (preset) setAdjustments(blendAdjustments(preset.adjustments, value));
                  }}
                />
              </label>
            )}
            <div className="editing-control-tabs">
              {adjustmentGroups.map((group) => (
                <button
                  type="button"
                  key={group.label}
                  className={adjustmentGroup === group.label ? "active" : ""}
                  onClick={() => setAdjustmentGroup(group.label)}
                >
                  {group.label}
                </button>
              ))}
            </div>
            <div className="editing-sliders">
              {adjustmentGroups
                .find((group) => group.label === adjustmentGroup)!
                .fields.map((field) => (
                  <label key={field.key}>
                    <span>
                      {field.label}
                      <b>{adjustments[field.key]}</b>
                    </span>
                    <input
                      type="range"
                      min={field.min ?? -100}
                      max="100"
                      value={adjustments[field.key]}
                      onChange={(event) =>
                        setAdjustments((current) => ({
                          ...current,
                          [field.key]: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                ))}
            </div>
            <button
              className="editing-reset"
              type="button"
              onClick={() => {
                setPresetId(undefined);
                setPresetIntensity(100);
                setAdjustments(neutralAdjustments);
              }}
            >
              Restaurar original
            </button>
            <div className="editing-original-note">
              <span>◉</span>
              <p>
                <strong>Original protegido</strong>
                <small>A edição é uma receita leve. A foto original nunca é sobrescrita.</small>
              </p>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="editing-studio">
      <FilmTextureDefinitions />
      <input ref={presetInput} type="file" accept=".xmp,.dng" hidden onChange={importPreset} />
      <input
        ref={photoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={uploadPhotos}
      />
      <section className="editing-heading">
        <div>
          {activeAlbum ? (
            <button className="editing-crumb" type="button" onClick={() => setActiveAlbumId(null)}>
              Álbuns <span>›</span>
            </button>
          ) : (
            <p>LABORATÓRIO CRIATIVO</p>
          )}
          <h1>{activeAlbum?.name || "Presets e edição"}</h1>
          <span>
            {activeAlbum
              ? `${albumPhotos.length} fotos · original e edição separados`
              : "Estilos de câmera, edição não destrutiva e exportação em alta."}
          </span>
        </div>
        <div className="editing-heading-actions">
          <button type="button" onClick={() => presetInput.current?.click()} disabled={busy}>
            Importar XMP/DNG
          </button>
          {activeAlbum && !activeAlbum.demo ? (
            <button
              className="primary-button"
              type="button"
              onClick={() => photoInput.current?.click()}
              disabled={busy}
            >
              ＋ Importar fotos
            </button>
          ) : !activeAlbum ? (
            <button className="primary-button" type="button" onClick={() => setAlbumDialog(true)}>
              ＋ Novo álbum
            </button>
          ) : null}
        </div>
      </section>

      {!activeAlbum ? (
        <>
          <section className="editing-camera-shelf">
            <div className="editing-section-title">
              <div>
                <span>CÂMERAS REVELAR</span>
                <h2>Escolha pelo clima</h2>
              </div>
              <small>{builtInPresets.length} estilos incluídos</small>
            </div>
            <div className="editing-camera-filters" aria-label="Categorias de câmeras">
              {presetCategories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={presetCategory === category ? "active" : ""}
                  onClick={() => setPresetCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="editing-camera-grid">
              {shelfPresets.map((preset, index) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    openPhotoWithPreset(demo.photos[index % demo.photos.length], preset)
                  }
                >
                  <span
                    className="editing-camera-preview"
                    style={effectVariables(preset.adjustments)}
                  >
                    <FilteredImage
                      src={demo.photos[index % demo.photos.length].previewUrl}
                      alt=""
                      adjustments={preset.adjustments}
                    />
                    <i>{preset.camera}</i>
                    <em>{preset.category}</em>
                  </span>
                  <strong>{preset.name}</strong>
                  <small>{preset.description}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="editing-albums-section">
            <div className="editing-section-title">
              <div>
                <span>BIBLIOTECA</span>
                <h2>Seus álbuns</h2>
              </div>
            </div>
            <div className="editing-album-grid">
              {albums.map((album) => {
                const items = photos.filter((photo) => photo.albumId === album.id);
                return (
                  <button key={album.id} type="button" onClick={() => setActiveAlbumId(album.id)}>
                    <span className="editing-album-cover">
                      {items.slice(0, 4).map((photo) => (
                        <img key={photo.id} src={photo.previewUrl} alt="" />
                      ))}
                      {!items.length && <i>＋</i>}
                      {album.demo && <em>DEMONSTRAÇÃO</em>}
                    </span>
                    <span>
                      <strong>{album.name}</strong>
                      <small>
                        {items.length} fotos ·{" "}
                        {bytes(items.reduce((sum, item) => sum + item.size, 0))}
                      </small>
                    </span>
                    <b>›</b>
                  </button>
                );
              })}
              <button
                className="editing-new-album"
                type="button"
                onClick={() => setAlbumDialog(true)}
              >
                <span>＋</span>
                <strong>Novo álbum</strong>
                <small>Fotos do telefone ou da câmera</small>
              </button>
            </div>
          </section>
          {privatePresets.length > 0 && (
            <section className="editing-private-presets">
              <div className="editing-section-title">
                <div>
                  <span>PRIVADOS</span>
                  <h2>Presets importados</h2>
                </div>
              </div>
              <div>
                {privatePresets.map((preset) => (
                  <article key={preset.id}>
                    <span>{preset.source?.toUpperCase()}</span>
                    <strong>{preset.name}</strong>
                    <small>{preset.camera}</small>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="editing-photo-library">
          {activeAlbum.demo && (
            <div className="editing-demo-banner">
              <span>DEMO</span>
              <p>
                Abra uma foto e teste todos os estilos e controles. Suas alterações não afetam dados
                reais.
              </p>
            </div>
          )}
          {albumPhotos.length ? (
            <div className="editing-photo-grid">
              {albumPhotos.map((photo) => (
                <button key={photo.id} type="button" onClick={() => openPhoto(photo)}>
                  <span className="editing-photo-thumb" style={effectVariables(photo.adjustments)}>
                    <FilteredImage
                      src={photo.previewUrl}
                      alt={photo.filename}
                      adjustments={photo.adjustments}
                    />
                    {photo.editedUrl && <i>EDITADA</i>}
                  </span>
                  <span>
                    <strong>{photo.filename}</strong>
                    <small>
                      {photo.width} × {photo.height} · {bytes(photo.size)}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="editing-empty">
              <span>▧</span>
              <h2>Este álbum está vazio</h2>
              <button
                className="primary-button"
                type="button"
                onClick={() => photoInput.current?.click()}
              >
                Importar primeiras fotos
              </button>
            </div>
          )}
        </section>
      )}

      {albumDialog && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={() => setAlbumDialog(false)}
        >
          <form
            className="editing-album-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              createAlbum();
            }}
          >
            <button className="close" type="button" onClick={() => setAlbumDialog(false)}>
              ×
            </button>
            <span>NOVO ÁLBUM</span>
            <h2>Onde vamos editar?</h2>
            <label>
              Nome do álbum
              <input
                autoFocus
                value={albumName}
                onChange={(event) => setAlbumName(event.target.value)}
                placeholder="Ex.: Fotos vintage do telefone"
              />
            </label>
            <button className="primary-button" type="submit" disabled={!albumName.trim() || busy}>
              Criar álbum
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
