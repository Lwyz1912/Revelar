import { isAppFileRef } from "@/lib/app-files.client";
import { formatDate } from "@/lib/format";
import { inferredStageDate } from "@/lib/works";
import { attachmentName } from "../work-attachments";
import type { WorkDetailsController } from "../useWorkDetailsController";

type Props = {
  state: Pick<
    WorkDetailsController,
    | "addActivity"
    | "addChecklistItem"
    | "addCustomStage"
    | "addStageFiles"
    | "applyChecklistTemplate"
    | "checklistTemplates"
    | "moveChecklistItem"
    | "moveStage"
    | "newChecklistItem"
    | "newStage"
    | "openAttachment"
    | "saveChecklistTemplate"
    | "selectedStage"
    | "selectedStageId"
    | "setNewChecklistItem"
    | "setNewStage"
    | "setSelectedStageId"
    | "soonLimit"
    | "stageFileRef"
    | "today"
    | "toggleStage"
    | "update"
    | "updateStage"
    | "work"
  >;
};

export function WorkTimelineSection({ state }: Props) {
  const {
    addActivity,
    addChecklistItem,
    addCustomStage,
    addStageFiles,
    applyChecklistTemplate,
    checklistTemplates,
    moveChecklistItem,
    moveStage,
    newChecklistItem,
    newStage,
    openAttachment,
    saveChecklistTemplate,
    selectedStage,
    selectedStageId,
    setNewChecklistItem,
    setNewStage,
    setSelectedStageId,
    soonLimit,
    stageFileRef,
    today,
    toggleStage,
    update,
    updateStage,
    work,
  } = state;
  return (
    <div className="timeline-layout">
      <section className="timeline-panel card">
        <div className="detail-section-heading">
          <div>
            <p>CRONOGRAMA</p>
            <h2>Etapas do trabalho</h2>
          </div>
          <span>
            {work.stages.filter((stage) => stage.done).length} de {work.stages.length} concluídas
          </span>
        </div>
        <div className="timeline-list">
          {work.stages.map((stage, index) => {
            const due = stage.dueDate || inferredStageDate(work, index);
            const state = stage.done
              ? "done"
              : due && due < today
                ? "late"
                : due && due <= soonLimit
                  ? "soon"
                  : "pending";
            return (
              <div
                key={stage.id}
                className={`timeline-item ${state} ${selectedStageId === stage.id ? "selected" : ""}`}
              >
                <button
                  className="stage-check"
                  type="button"
                  onClick={() => toggleStage(stage)}
                  aria-label={stage.done ? `Reabrir ${stage.label}` : `Concluir ${stage.label}`}
                >
                  {stage.done ? "✓" : index + 1}
                </button>
                <button
                  className="stage-open"
                  type="button"
                  onClick={() => setSelectedStageId(stage.id)}
                >
                  <strong>{stage.label}</strong>
                  <small>
                    <span>
                      {state === "late"
                        ? "Atrasada"
                        : state === "soon"
                          ? "Prazo próximo"
                          : stage.done
                            ? "Concluída"
                            : formatDate(due)}
                    </span>{" "}
                    · {stage.responsible || "Sem responsável"}
                  </small>
                </button>
                <span className="stage-move">
                  <button
                    type="button"
                    onClick={() => moveStage(stage.id, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStage(stage.id, 1)}
                    disabled={index === work.stages.length - 1}
                  >
                    ↓
                  </button>
                </span>
              </div>
            );
          })}
        </div>
        <div className="timeline-add">
          <input
            value={newStage}
            onChange={(event) => setNewStage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addCustomStage();
            }}
            placeholder="Nova etapa personalizada"
          />
          <button type="button" onClick={addCustomStage}>
            ＋ Adicionar etapa
          </button>
        </div>
      </section>
      {selectedStage && (
        <aside className="stage-detail card">
          <div className="stage-detail-head">
            <div>
              <p>DETALHES DA ETAPA</p>
              <h2>{selectedStage.label}</h2>
            </div>
            {selectedStage.custom && (
              <button
                type="button"
                onClick={() => {
                  update({
                    stages: work.stages.filter((stage) => stage.id !== selectedStage.id),
                  });
                  setSelectedStageId(work.stages[0]?.id || "");
                }}
              >
                Remover
              </button>
            )}
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Prazo</span>
              <input
                type="date"
                value={
                  selectedStage.dueDate ||
                  inferredStageDate(
                    work,
                    work.stages.findIndex((stage) => stage.id === selectedStage.id),
                  )
                }
                onChange={(event) => {
                  updateStage(selectedStage.id, { dueDate: event.target.value });
                  addActivity(`Prazo de ${selectedStage.label} alterado`, "◇");
                }}
              />
            </label>
            <label className="field">
              <span>Responsável</span>
              <select
                value={selectedStage.responsible || "Maryana"}
                onChange={(event) =>
                  updateStage(selectedStage.id, { responsible: event.target.value })
                }
              >
                {[...new Set(["Maryana", ...work.team])].map((person) => (
                  <option key={person}>{person}</option>
                ))}
              </select>
            </label>
            <label className="field full">
              <span>Observações</span>
              <textarea
                rows={3}
                value={selectedStage.notes || ""}
                onChange={(event) => updateStage(selectedStage.id, { notes: event.target.value })}
                placeholder="Orientações, detalhes ou pendências desta etapa."
              />
            </label>
          </div>
          <div className="stage-subsection">
            <div>
              <strong>Checklist</strong>
              <small>
                {(selectedStage.checklist || []).filter((item) => item.done).length}/
                {(selectedStage.checklist || []).length}
              </small>
            </div>
            <div className="stage-checklist">
              {(selectedStage.checklist || []).map((item, index) => (
                <div className={item.done ? "done" : ""} key={item.id}>
                  <button
                    type="button"
                    className="check-toggle"
                    onClick={() =>
                      updateStage(selectedStage.id, {
                        checklist: selectedStage.checklist?.map((check) =>
                          check.id === item.id ? { ...check, done: !check.done } : check,
                        ),
                      })
                    }
                    aria-label={item.done ? `Reabrir ${item.label}` : `Concluir ${item.label}`}
                  >
                    {item.done ? "✓" : ""}
                  </button>
                  <input
                    value={item.label}
                    onChange={(event) =>
                      updateStage(selectedStage.id, {
                        checklist: selectedStage.checklist?.map((check) =>
                          check.id === item.id ? { ...check, label: event.target.value } : check,
                        ),
                      })
                    }
                    aria-label="Nome do item"
                  />
                  <span className="checklist-order-actions">
                    <button
                      type="button"
                      onClick={() => moveChecklistItem(item.id, -1)}
                      disabled={index === 0}
                      aria-label="Mover para cima"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveChecklistItem(item.id, 1)}
                      disabled={index === (selectedStage.checklist?.length || 0) - 1}
                      aria-label="Mover para baixo"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="danger-action"
                      onClick={() =>
                        updateStage(selectedStage.id, {
                          checklist: selectedStage.checklist?.filter(
                            (check) => check.id !== item.id,
                          ),
                        })
                      }
                      aria-label={`Excluir ${item.label}`}
                    >
                      ×
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <div className="checklist-add-row">
              <input
                value={newChecklistItem}
                onChange={(event) => setNewChecklistItem(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Novo item personalizado"
              />
              <button type="button" onClick={addChecklistItem}>
                ＋ Adicionar
              </button>
            </div>
            <div className="checklist-template-actions">
              <select
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) applyChecklistTemplate(event.target.value);
                  event.target.value = "";
                }}
              >
                <option value="">Aplicar modelo…</option>
                {checklistTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={saveChecklistTemplate}>
                Salvar como modelo
              </button>
            </div>
          </div>
          <div className="stage-subsection">
            <div>
              <strong>Anexos da etapa</strong>
              <small>{selectedStage.attachments?.length || 0}</small>
            </div>
            <input ref={stageFileRef} type="file" multiple hidden onChange={addStageFiles} />
            <button
              className="stage-upload"
              type="button"
              onClick={() => stageFileRef.current?.click()}
            >
              ＋ Anexar arquivo
            </button>
            {selectedStage.attachments?.map((file, index) => (
              <button
                className="mini-file"
                type="button"
                key={`${isAppFileRef(file) ? file.id : file}-${index}`}
                onClick={() => openAttachment(file)}
              >
                <span>□ {attachmentName(file)}</span>
                <strong>Visualizar</strong>
              </button>
            ))}
          </div>
          <button
            className={
              selectedStage.done ? "cancel-button full-button" : "primary-button full-button"
            }
            type="button"
            onClick={() => toggleStage(selectedStage)}
          >
            {selectedStage.done ? "Reabrir etapa" : "Concluir etapa"}
          </button>
        </aside>
      )}
    </div>
  );
}
