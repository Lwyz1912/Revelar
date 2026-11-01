import { fileViewUrl } from "@/lib/app-files.client";
import type { WorkDetailsController } from "../useWorkDetailsController";

type Props = {
  state: Pick<
    WorkDetailsController,
    | "libraryOpen"
    | "moodboard"
    | "openPoseEditor"
    | "referenceLibrary"
    | "removePose"
    | "setLibraryOpen"
    | "setPreviewStoredFile"
    | "toast"
    | "updateMoodboard"
    | "work"
  >;
};

export function WorkMoodboardSection({ state }: Props) {
  const {
    libraryOpen,
    moodboard,
    openPoseEditor,
    referenceLibrary,
    removePose,
    setLibraryOpen,
    setPreviewStoredFile,
    toast,
    updateMoodboard,
    work,
  } = state;
  return (
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
                `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(`${work.category} fotografia inspiração poses iluminação`)}`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            ⌕ Pesquisar no Pinterest
          </button>
          <button type="button" onClick={() => setLibraryOpen((current) => !current)}>
            ▦ Biblioteca ({referenceLibrary.length})
          </button>
          <button
            type="button"
            onClick={() => toast("Geração com IA preparada; falta conectar o serviço de imagens")}
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
                      references: moodboard.references.filter((item) => item.id !== reference.id),
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
            <textarea
              rows={4}
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
        <section className="moodboard-production-plan">
          <div className="moodboard-section-title">
            <div>
              <span>PLANO TÉCNICO</span>
              <p>Equipamentos e luzes são internos e podem ser ajustados a qualquer momento.</p>
            </div>
          </div>
          <div className="moodboard-technical-columns">
            {(["lighting", "equipment"] as const).map((kind) => (
              <div key={kind} className="moodboard-technical-group">
                <header>
                  <div>
                    <span>{kind === "lighting" ? "ILUMINAÇÃO" : "EQUIPAMENTOS"}</span>
                    <small>
                      {moodboard.references.filter((item) => item.kind === kind).length} item(ns)
                    </small>
                  </div>
                  <button
                    className="icon-button moodboard-add-icon"
                    type="button"
                    title={kind === "lighting" ? "Adicionar iluminação" : "Adicionar equipamento"}
                    aria-label={
                      kind === "lighting" ? "Adicionar iluminação" : "Adicionar equipamento"
                    }
                    onClick={() =>
                      updateMoodboard({
                        ...moodboard,
                        references: [
                          ...moodboard.references,
                          {
                            id: crypto.randomUUID(),
                            kind,
                            title: kind === "lighting" ? "Nova luz" : "Novo equipamento",
                            value: "",
                          },
                        ],
                      })
                    }
                  >
                    ＋
                  </button>
                </header>
                <div>
                  {moodboard.references
                    .filter((item) => item.kind === kind)
                    .map((reference) => (
                      <article key={reference.id}>
                        <input
                          aria-label="Nome do item"
                          value={reference.title}
                          onChange={(event) =>
                            updateMoodboard({
                              ...moodboard,
                              references: moodboard.references.map((item) =>
                                item.id === reference.id
                                  ? { ...item, title: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                        <textarea
                          aria-label="Detalhes do item"
                          rows={2}
                          value={reference.value}
                          placeholder={
                            kind === "lighting"
                              ? "Direção, potência, horário…"
                              : "Câmera, lente, acessórios…"
                          }
                          onChange={(event) =>
                            updateMoodboard({
                              ...moodboard,
                              references: moodboard.references.map((item) =>
                                item.id === reference.id
                                  ? { ...item, value: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                        <button
                          className="icon-button danger-icon-button"
                          type="button"
                          title={`Remover ${reference.title}`}
                          aria-label={`Remover ${reference.title}`}
                          onClick={() =>
                            updateMoodboard({
                              ...moodboard,
                              references: moodboard.references.filter(
                                (item) => item.id !== reference.id,
                              ),
                            })
                          }
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                          </svg>
                        </button>
                      </article>
                    ))}
                  {!moodboard.references.some((item) => item.kind === kind) && (
                    <p>Nenhum item definido.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
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
              <button className="pose-empty-card" type="button" onClick={() => openPoseEditor()}>
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
              {moodboard.shotList.filter((shot) => shot.done).length}/{moodboard.shotList.length}
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
  );
}
