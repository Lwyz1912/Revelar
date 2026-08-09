import { type ChangeEvent, useEffect, useRef, useState } from "react";

import { formatDate, formatMoney, initials } from "@/lib/format";
import { deleteAppFile, isAppFileRef, uploadAppFile } from "@/lib/app-files.client";
import { createStages, stageChecklist } from "@/lib/workflow";
import type { Client, Currency, NewWorkData, WorkCategory } from "@/types/revelar";

function makeEmptyWork(): NewWorkData {
  return {
    title: "",
    category: "Casamento",
    clientIds: [],
    date: "",
    time: "",
    duration: "",
    location: "",
    team: ["Maryana"],
    deliveryDate: "",
    packageName: "",
    currency: "BRL",
    totalValue: 0,
    entryValue: 0,
    installments: 1,
    costs: 0,
    photos: { captured: 0, selected: 0, edited: 0, delivered: 0 },
    stages: createStages("new"),
    attachments: [],
  };
}

export function NewWorkDrawer({
  clients,
  onClose,
  onSave,
  initialClientId,
}: {
  clients: Client[];
  onClose: () => void;
  onSave: (work: NewWorkData) => void;
  initialClientId?: number;
}) {
  const [form, setForm] = useState<NewWorkData>(() => ({
    ...makeEmptyWork(),
    clientIds: initialClientId ? [initialClientId] : [],
  }));
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [customStage, setCustomStage] = useState("");
  const [teamText, setTeamText] = useState("Maryana");
  const fileRef = useRef<HTMLInputElement>(null);
  const categories: WorkCategory[] = [
    "Casamento",
    "Pré-wedding",
    "Ensaio pessoal",
    "Família",
    "Aniversário",
    "Editorial para loja",
    "Evento",
    "Estúdio",
  ];
  const stepNames = ["Essencial", "Agenda", "Financeiro", "Fluxo", "Revisão"];

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const update = <K extends keyof NewWorkData>(field: K, value: NewWorkData[K]) =>
    setForm((current) => ({ ...current, [field]: value }));
  const validStep =
    step === 1
      ? !!form.title.trim() && form.clientIds.length > 0
      : step === 2
        ? !!form.date && !!form.time && !!form.location.trim() && !!form.deliveryDate
        : step === 3
          ? !!form.packageName.trim() && form.totalValue > 0
          : true;
  const toggleClient = (id: number) =>
    update(
      "clientIds",
      form.clientIds.includes(id)
        ? form.clientIds.filter((clientId) => clientId !== id)
        : [...form.clientIds, id],
    );
  const goNext = () => {
    setSubmitted(true);
    if (!validStep) return;
    setSubmitted(false);
    setStep((current) => Math.min(5, current + 1));
  };
  const addStage = () => {
    const label = customStage.trim();
    if (!label) return;
    const id = `custom-${Date.now()}`;
    update("stages", [
      ...form.stages,
      {
        id,
        label,
        done: false,
        custom: true,
        responsible: "Maryana",
        checklist: stageChecklist(label, id),
        attachments: [],
      },
    ]);
    setCustomStage("");
  };
  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      const uploaded = [];
      for (const file of files) uploaded.push(await uploadAppFile(file, "work", "new"));
      update("attachments", [...form.attachments, ...uploaded]);
    } catch {
      window.alert("Não foi possível enviar um dos arquivos.");
    }
    event.target.value = "";
  };
  const save = () =>
    onSave({
      ...form,
      title: form.title.trim(),
      location: form.location.trim(),
      packageName: form.packageName.trim(),
      team: teamText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="work-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-work-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <p>NOVO TRABALHO</p>
            <h2 id="new-work-title">Criar trabalho</h2>
            <span>
              Etapa {step} de 5 · {stepNames[step - 1]}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar cadastro">
            ×
          </button>
        </header>
        <div className="work-stepper" aria-label="Progresso do cadastro">
          {stepNames.map((name, index) => (
            <button
              type="button"
              key={name}
              className={step === index + 1 ? "active" : step > index + 1 ? "done" : ""}
              onClick={() => index + 1 < step && setStep(index + 1)}
            >
              <span>{step > index + 1 ? "✓" : index + 1}</span>
              <small>{name}</small>
            </button>
          ))}
        </div>
        <div className="work-drawer-body">
          {step === 1 && (
            <section className="work-form-step">
              <div className="step-copy">
                <span>01</span>
                <div>
                  <h3>O que será fotografado?</h3>
                  <p>Defina o trabalho e vincule todos os clientes envolvidos.</p>
                </div>
              </div>
              <label className="field">
                <span>Título do trabalho *</span>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="Ex.: Casamento Amanda e João"
                  aria-invalid={submitted && !form.title.trim()}
                />
                {submitted && !form.title.trim() && (
                  <small className="field-error">Informe um título.</small>
                )}
              </label>
              <div className="field">
                <span>Categoria *</span>
                <div className="category-picker">
                  {categories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={form.category === item ? "active" : ""}
                      onClick={() => update("category", item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span>Clientes vinculados *</span>
                <div className="client-picker">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      className={form.clientIds.includes(client.id) ? "active" : ""}
                      onClick={() => toggleClient(client.id)}
                    >
                      <span className="client-avatar">{initials(client.name)}</span>
                      <span>
                        <strong>{client.name}</strong>
                        <small>
                          {client.type === "company" ? "Empresa / loja" : client.whatsapp}
                        </small>
                      </span>
                      <b>{form.clientIds.includes(client.id) ? "✓" : "+"}</b>
                    </button>
                  ))}
                </div>
                {submitted && form.clientIds.length === 0 && (
                  <small className="field-error">Selecione pelo menos um cliente.</small>
                )}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="work-form-step">
              <div className="step-copy">
                <span>02</span>
                <div>
                  <h3>Agenda e produção</h3>
                  <p>Organize sessão, prazo, local e equipe.</p>
                </div>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Data *</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => update("date", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Horário *</span>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(event) => update("time", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Duração</span>
                  <input
                    value={form.duration}
                    onChange={(event) => update("duration", event.target.value)}
                    placeholder="Ex.: 3h30"
                  />
                </label>
                <label className="field">
                  <span>Entrega prevista *</span>
                  <input
                    type="date"
                    value={form.deliveryDate}
                    onChange={(event) => update("deliveryDate", event.target.value)}
                  />
                </label>
                <label className="field full">
                  <span>Local *</span>
                  <input
                    value={form.location}
                    onChange={(event) => update("location", event.target.value)}
                    placeholder="Nome e endereço do local"
                  />
                </label>
                <label className="field full">
                  <span>Equipe</span>
                  <input
                    value={teamText}
                    onChange={(event) => setTeamText(event.target.value)}
                    placeholder="Separe os nomes por vírgula"
                  />
                  <small className="field-hint">
                    Ex.: Maryana, Lucas · assistente, Bianca · maquiagem
                  </small>
                </label>
              </div>
              {submitted && !validStep && (
                <p className="form-error">Preencha data, horário, local e prazo de entrega.</p>
              )}
            </section>
          )}

          {step === 3 && (
            <section className="work-form-step">
              <div className="step-copy">
                <span>03</span>
                <div>
                  <h3>Pacote e financeiro</h3>
                  <p>Registre o combinado, pagamentos e custos previstos.</p>
                </div>
              </div>
              <label className="field">
                <span>Pacote contratado *</span>
                <input
                  value={form.packageName}
                  onChange={(event) => update("packageName", event.target.value)}
                  placeholder="Ex.: Casamento Memórias Completas"
                />
              </label>
              <div className="field-grid finance-fields">
                <label className="field">
                  <span>Moeda</span>
                  <select
                    value={form.currency}
                    onChange={(event) => update("currency", event.target.value as Currency)}
                  >
                    <option value="BRL">Real (R$)</option>
                    <option value="EUR">Euro (€)</option>
                  </select>
                </label>
                <label className="field">
                  <span>Valor total *</span>
                  <input
                    type="number"
                    min="0"
                    value={form.totalValue || ""}
                    onChange={(event) => update("totalValue", Number(event.target.value))}
                    placeholder="0"
                  />
                </label>
                <label className="field">
                  <span>Entrada recebida</span>
                  <input
                    type="number"
                    min="0"
                    value={form.entryValue || ""}
                    onChange={(event) => update("entryValue", Number(event.target.value))}
                    placeholder="0"
                  />
                </label>
                <label className="field">
                  <span>Parcelas</span>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={form.installments}
                    onChange={(event) => update("installments", Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>Custos previstos</span>
                  <input
                    type="number"
                    min="0"
                    value={form.costs || ""}
                    onChange={(event) => update("costs", Number(event.target.value))}
                    placeholder="Transporte, equipe..."
                  />
                </label>
              </div>
              <div className="finance-preview">
                <span>
                  <small>Total</small>
                  <strong>{formatMoney(form.totalValue, form.currency)}</strong>
                </span>
                <span>
                  <small>Saldo pendente</small>
                  <strong>
                    {formatMoney(Math.max(0, form.totalValue - form.entryValue), form.currency)}
                  </strong>
                </span>
                <span>
                  <small>Resultado previsto</small>
                  <strong>
                    {formatMoney(Math.max(0, form.totalValue - form.costs), form.currency)}
                  </strong>
                </span>
              </div>
              {submitted && !validStep && (
                <p className="form-error">Informe o pacote e um valor total maior que zero.</p>
              )}
            </section>
          )}

          {step === 4 && (
            <section className="work-form-step">
              <div className="step-copy">
                <span>04</span>
                <div>
                  <h3>Etapas, fotos e arquivos</h3>
                  <p>Personalize o fluxo e centralize os materiais do trabalho.</p>
                </div>
              </div>
              <div className="stage-list">
                {form.stages.map((stage) => (
                  <div key={stage.id}>
                    <button
                      type="button"
                      className={stage.done ? "checked" : ""}
                      onClick={() =>
                        update(
                          "stages",
                          form.stages.map((item) =>
                            item.id === stage.id ? { ...item, done: !item.done } : item,
                          ),
                        )
                      }
                    >
                      <span>{stage.done ? "✓" : ""}</span>
                      {stage.label}
                    </button>
                    {stage.id.startsWith("custom-") && (
                      <button
                        type="button"
                        className="remove-stage"
                        onClick={() =>
                          update(
                            "stages",
                            form.stages.filter((item) => item.id !== stage.id),
                          )
                        }
                        aria-label={`Remover ${stage.label}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="add-stage">
                <input
                  value={customStage}
                  onChange={(event) => setCustomStage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addStage();
                    }
                  }}
                  placeholder="Nome de uma etapa personalizada"
                />
                <button type="button" onClick={addStage}>
                  ＋ Adicionar
                </button>
              </div>
              <div className="photo-fields">
                <label>
                  <span>Tiradas</span>
                  <input
                    type="number"
                    min="0"
                    value={form.photos.captured || ""}
                    onChange={(event) =>
                      update("photos", { ...form.photos, captured: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  <span>Selecionadas</span>
                  <input
                    type="number"
                    min="0"
                    value={form.photos.selected || ""}
                    onChange={(event) =>
                      update("photos", { ...form.photos, selected: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  <span>Editadas</span>
                  <input
                    type="number"
                    min="0"
                    value={form.photos.edited || ""}
                    onChange={(event) =>
                      update("photos", { ...form.photos, edited: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  <span>Entregues</span>
                  <input
                    type="number"
                    min="0"
                    value={form.photos.delivered || ""}
                    onChange={(event) =>
                      update("photos", { ...form.photos, delivered: Number(event.target.value) })
                    }
                  />
                </label>
              </div>
              <div className="file-drop">
                <input ref={fileRef} type="file" multiple hidden onChange={onFiles} />
                <button type="button" onClick={() => fileRef.current?.click()}>
                  <span>＋</span>
                  <strong>Anexar arquivos</strong>
                  <small>Contrato, referências, comprovantes e outros materiais</small>
                </button>
                {form.attachments.length > 0 && (
                  <div className="attachment-list">
                    {form.attachments.map((file, index) => (
                      <span key={`${isAppFileRef(file) ? file.id : file}-${index}`}>
                        ▧ {isAppFileRef(file) ? file.name : file}
                        <button
                          type="button"
                          onClick={() => {
                            if (isAppFileRef(file)) void deleteAppFile(file).catch(() => undefined);
                            update(
                              "attachments",
                              form.attachments.filter((_, fileIndex) => fileIndex !== index),
                            );
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="work-form-step">
              <div className="step-copy">
                <span>05</span>
                <div>
                  <h3>Revise antes de criar</h3>
                  <p>Os dados poderão ser alterados na ficha do trabalho.</p>
                </div>
              </div>
              <div className="work-review-hero">
                <span className="status-badge status-planning">Planejamento</span>
                <strong>{form.title || "Trabalho sem título"}</strong>
                <small>
                  {form.category} ·{" "}
                  {form.clientIds
                    .map((id) => clients.find((client) => client.id === id)?.name)
                    .filter(Boolean)
                    .join(" + ")}
                </small>
              </div>
              <div className="review-grid">
                <div>
                  <small>SESSÃO</small>
                  <strong>
                    {formatDate(form.date)} · {form.time}
                  </strong>
                  <span>{form.location}</span>
                </div>
                <div>
                  <small>ENTREGA</small>
                  <strong>{formatDate(form.deliveryDate)}</strong>
                  <span>Alerta no Dashboard e calendário</span>
                </div>
                <div>
                  <small>PACOTE</small>
                  <strong>{form.packageName}</strong>
                  <span>
                    {formatMoney(form.totalValue, form.currency)} · {form.installments}x
                  </span>
                </div>
                <div>
                  <small>PRODUÇÃO</small>
                  <strong>{form.stages.length} etapas</strong>
                  <span>
                    {form.team.length || 1} pessoa(s) · {form.attachments.length} arquivo(s)
                  </span>
                </div>
              </div>
              <div className="review-note">
                <span>◇</span>
                <p>
                  <strong>Salvo neste navegador</strong>Este trabalho continuará disponível neste
                  dispositivo. Contas e sincronização entre dispositivos entrarão com o futuro banco
                  de dados e login.
                </p>
              </div>
            </section>
          )}
        </div>
        <footer className="work-drawer-footer">
          <button
            className="cancel-button"
            type="button"
            onClick={
              step === 1
                ? onClose
                : () => {
                    setSubmitted(false);
                    setStep((current) => current - 1);
                  }
            }
          >
            {step === 1 ? "Cancelar" : "← Voltar"}
          </button>
          <span>{step} de 5</span>
          {step < 5 ? (
            <button className="primary-button" type="button" onClick={goNext}>
              Continuar →
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={save}>
              Criar trabalho
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
