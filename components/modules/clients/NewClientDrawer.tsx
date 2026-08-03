import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { emptyClient } from "@/data/demo";
import { normalizePhone } from "@/lib/format";
import type { Client, NewClientData } from "@/types/revelar";

export function NewClientDrawer({
  clients,
  onClose,
  onSave,
}: {
  clients: Client[];
  onClose: () => void;
  onSave: (client: NewClientData) => void;
}) {
  const [form, setForm] = useState<NewClientData>(emptyClient);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const duplicate = useMemo(() => {
    const phone = normalizePhone(form.whatsapp);
    const email = form.email.trim().toLowerCase();
    if (phone.length < 8 && !email) return undefined;
    return clients.find(
      (client) =>
        (phone.length >= 8 && normalizePhone(client.whatsapp) === phone) ||
        (!!email && client.email.toLowerCase() === email),
    );
  }, [clients, form.email, form.whatsapp]);

  const update = (field: keyof NewClientData, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const onPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, avatar: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!form.name.trim() || (!normalizePhone(form.whatsapp) && !form.email.trim()) || duplicate)
      return;
    onSave({
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      instagram: form.instagram.trim(),
      whatsapp: form.whatsapp.trim(),
    });
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="client-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-client-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <p>NOVO CADASTRO</p>
            <h2 id="new-client-title">Adicionar cliente</h2>
            <span>Comece pelo essencial. O restante pode ser preenchido depois.</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar cadastro">
            ×
          </button>
        </header>

        <form onSubmit={submit} noValidate>
          <div className="drawer-body">
            <section className="form-section">
              <div className="client-type-picker">
                <button
                  type="button"
                  className={form.type === "person" ? "active" : ""}
                  onClick={() => update("type", "person")}
                >
                  <span>♙</span>
                  <strong>Pessoa</strong>
                  <small>Ensaios e eventos</small>
                </button>
                <button
                  type="button"
                  className={form.type === "company" ? "active" : ""}
                  onClick={() => update("type", "company")}
                >
                  <span>▦</span>
                  <strong>Empresa / loja</strong>
                  <small>Editoriais e conteúdo</small>
                </button>
              </div>

              <div className="photo-and-name">
                <button
                  className="photo-picker"
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Adicionar foto opcional"
                >
                  {form.avatar ? (
                    <img src={form.avatar} alt="Prévia do cliente" />
                  ) : (
                    <>
                      <span>＋</span>
                      <small>Foto opcional</small>
                    </>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
                <label className="field grow">
                  <span>{form.type === "company" ? "Nome da empresa" : "Nome do cliente"} *</span>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder={
                      form.type === "company" ? "Ex.: Loja Aurora" : "Ex.: Camila Almeida"
                    }
                    aria-invalid={submitted && !form.name.trim()}
                  />
                  {submitted && !form.name.trim() && (
                    <small className="field-error">Informe o nome.</small>
                  )}
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>WhatsApp</span>
                  <input
                    value={form.whatsapp}
                    onChange={(event) => update("whatsapp", event.target.value)}
                    placeholder="+55 (81) 99999-9999"
                    inputMode="tel"
                  />
                </label>
                <label className="field">
                  <span>Instagram</span>
                  <input
                    value={form.instagram}
                    onChange={(event) => update("instagram", event.target.value)}
                    placeholder="@usuario"
                  />
                </label>
                <label className="field full">
                  <span>E-mail</span>
                  <input
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="cliente@email.com"
                    type="email"
                  />
                </label>
              </div>
              {submitted && !normalizePhone(form.whatsapp) && !form.email.trim() && (
                <p className="form-error">Informe pelo menos o WhatsApp ou o e-mail.</p>
              )}
              {duplicate && (
                <div className="duplicate-alert" role="alert">
                  <span>!</span>
                  <div>
                    <strong>Possível cliente repetido</strong>
                    <p>
                      O WhatsApp ou e-mail já pertence a <b>{duplicate.name}</b>.
                    </p>
                  </div>
                  <button type="button" onClick={onClose}>
                    Ver cliente
                  </button>
                </div>
              )}
            </section>

            <section className={`optional-details ${detailsOpen ? "open" : ""}`}>
              <button
                type="button"
                className="details-toggle"
                onClick={() => setDetailsOpen(!detailsOpen)}
              >
                <span>
                  <strong>Datas e informações importantes</strong>
                  <small>Aniversário, casamento e observações para futuras campanhas.</small>
                </span>
                <b>{detailsOpen ? "−" : "+"}</b>
              </button>
              {detailsOpen && (
                <div className="optional-fields">
                  <div className="field-grid">
                    <label className="field">
                      <span>
                        {form.type === "company" ? "Aniversário da marca" : "Aniversário"}
                      </span>
                      <input
                        type="date"
                        value={form.birthday}
                        onChange={(event) => update("birthday", event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Data de casamento / união</span>
                      <input
                        type="date"
                        value={form.weddingDate}
                        onChange={(event) => update("weddingDate", event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Nome de outra data</span>
                      <input
                        value={form.otherDateLabel}
                        onChange={(event) => update("otherDateLabel", event.target.value)}
                        placeholder="Ex.: aniversário do filho"
                      />
                    </label>
                    <label className="field">
                      <span>Outra data</span>
                      <input
                        type="date"
                        value={form.otherDate}
                        onChange={(event) => update("otherDate", event.target.value)}
                      />
                    </label>
                    <label className="field full">
                      <span>Observações</span>
                      <textarea
                        value={form.notes}
                        onChange={(event) => update("notes", event.target.value)}
                        placeholder="Preferências, ideias ou informações úteis para os próximos trabalhos."
                        rows={3}
                      />
                    </label>
                  </div>
                </div>
              )}
            </section>
          </div>

          <footer className="drawer-footer">
            <button className="cancel-button" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary-button" type="submit" disabled={!!duplicate}>
              Salvar cliente
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
