import { FileViewer } from "@/components/shared/FileViewer";
import { workStatusLabels } from "@/config/labels";
import { namesForClients } from "@/lib/works";
import { WorkFilesHub } from "@/components/modules/works/WorkFilesHub";
import { workDetailTabs, useWorkDetailsController } from "./useWorkDetailsController";
import { attachmentExtension } from "./work-attachments";
import { WorkOverviewSection } from "./details/WorkOverviewSection";
import { WorkMoodboardSection } from "./details/WorkMoodboardSection";
import { WorkTimelineSection } from "./details/WorkTimelineSection";
import { WorkFinanceSection } from "./details/WorkFinanceSection";
import { WorkDocumentsSection } from "./details/WorkDocumentsSection";

export function WorkDetails(props: Parameters<typeof useWorkDetailsController>[0]) {
  const controller = useWorkDetailsController(props);
  const {
    addActivity,
    cancelOpen,
    clients,
    contractSignedFileRef,
    contractSourceFileRef,
    currentPreview,
    currentPreviewKind,
    editing,
    editingPoseId,
    onArchive,
    onBack,
    onCancel,
    onDuplicate,
    onPhotoExtras,
    poseDraft,
    poseEditorOpen,
    poseImage,
    previewFile,
    previewStoredFile,
    savePose,
    savePoseToLibrary,
    savingPose,
    setCancelOpen,
    setEditing,
    setPoseDraft,
    setPoseEditorOpen,
    setPoseImage,
    setPreviewFile,
    setPreviewStoredFile,
    setSavePoseToLibrary,
    setTab,
    syncGalleryEvents,
    syncGalleryStats,
    tab,
    toast,
    update,
    uploadContractFile,
    whatsapp,
    work,
  } = controller;
  return (
    <div className="work-details-page">
      <input
        ref={contractSourceFileRef}
        hidden
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(event) => {
          void uploadContractFile(event.target.files?.[0], "sourceFile");
          event.target.value = "";
        }}
      />
      <input
        ref={contractSignedFileRef}
        hidden
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => {
          void uploadContractFile(event.target.files?.[0], "signedFile");
          event.target.value = "";
        }}
      />
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
            className={(tab === "contract" ? "files" : tab) === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <WorkOverviewSection state={controller} />}

      {tab === "moodboard" && <WorkMoodboardSection state={controller} />}

      {tab === "timeline" && <WorkTimelineSection state={controller} />}

      {tab === "finance" && <WorkFinanceSection state={controller} />}

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

      {(tab === "files" || tab === "contract") && <WorkDocumentsSection state={controller} />}

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
