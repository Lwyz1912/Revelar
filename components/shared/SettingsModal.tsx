"use client";

import { useEffect, useMemo, useState } from "react";

import { notificationCategoryOptions } from "@/config/notifications";
import { palettes } from "@/config/themes";
import { useStoredJsonState } from "@/hooks/use-persisted-state";
import { storageKeys } from "@/lib/storage";
import type { NotificationPreferences, Palette, ThemeMode } from "@/types/revelar";

type SettingsModalProps = {
  themeMode: ThemeMode;
  palette: Palette;
  onThemeModeChange: (mode: ThemeMode) => void;
  onPaletteChange: (palette: Palette) => void;
  onClose: () => void;
  onSave: () => void;
  notificationPreferences: NotificationPreferences;
  onNotificationPreferencesChange: (preferences: NotificationPreferences) => void;
  onRequestBrowserPermission: () => Promise<"default" | "denied" | "granted" | "unsupported">;
};

type SettingsSection =
  | "overview"
  | "account"
  | "brands"
  | "watermarks"
  | "work"
  | "agenda"
  | "galleries"
  | "finance"
  | "quotes"
  | "contracts"
  | "products"
  | "appearance"
  | "notifications"
  | "team"
  | "security"
  | "privacy"
  | "data"
  | "integrations";

type ProfessionalSettings = {
  profile: {
    name: string;
    email: string;
    phone: string;
    instagram: string;
    site: string;
    bio: string;
  };
  activeBrand: string;
  watermarks: string[];
  watermarkMode: "corner" | "center" | "tile";
  watermarkCorner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  watermarkOpacity: number;
  watermarkSize: number;
  watermarkTargets: string[];
  watermarkPreview: boolean;
  watermarkDownload: boolean;
  contractTemplates: string[];
  automaticContractFields: boolean;
  defaultContract: string;
};

const defaultSettings: ProfessionalSettings = {
  profile: {
    name: "Maryana Ferreira",
    email: "",
    phone: "",
    instagram: "@maryfotografiaa__",
    site: "",
    bio: "Fotógrafa de casamentos, ensaios e histórias reais.",
  },
  activeBrand: "Mary Fotografia",
  watermarks: [],
  watermarkMode: "corner",
  watermarkCorner: "bottom-right",
  watermarkOpacity: 42,
  watermarkSize: 28,
  watermarkTargets: ["Prévias", "Seleção"],
  watermarkPreview: true,
  watermarkDownload: false,
  contractTemplates: [],
  automaticContractFields: true,
  defaultContract: "",
};

const settingsGroups: Array<{
  title: string;
  items: Array<{ id: SettingsSection; label: string; icon: string; hint: string }>;
}> = [
  {
    title: "PERFIL E MARCA",
    items: [
      { id: "overview", label: "Início", icon: "⌂", hint: "Resumo" },
      { id: "account", label: "Minha conta", icon: "○", hint: "Perfil e contato" },
      { id: "brands", label: "Marcas profissionais", icon: "◇", hint: "Identidades" },
      { id: "watermarks", label: "Marcas-d’água", icon: "◫", hint: "Proteção das fotos" },
    ],
  },
  {
    title: "PADRÕES DO NEGÓCIO",
    items: [
      { id: "work", label: "Trabalhos", icon: "▣", hint: "Etapas e pacotes" },
      { id: "agenda", label: "Agenda", icon: "□", hint: "Horários e lembretes" },
      { id: "galleries", label: "Galerias", icon: "▧", hint: "Entrega e seleção" },
      { id: "finance", label: "Financeiro", icon: "◉", hint: "Moedas e contas" },
      { id: "quotes", label: "Orçamentos", icon: "▤", hint: "Validade e condições" },
      { id: "contracts", label: "Contratos", icon: "▱", hint: "Modelos e campos" },
      { id: "products", label: "Produtos", icon: "▦", hint: "Catálogo e vendas" },
    ],
  },
  {
    title: "APLICATIVO",
    items: [
      { id: "appearance", label: "Aparência", icon: "☼", hint: "Tema e cores" },
      { id: "notifications", label: "Notificações", icon: "♢", hint: "Avisos e prazos" },
      { id: "team", label: "Equipe", icon: "◎", hint: "Convites e funções" },
      { id: "security", label: "Segurança", icon: "⌑", hint: "Senha e sessões" },
      { id: "privacy", label: "Privacidade", icon: "◌", hint: "Consentimentos" },
      { id: "data", label: "Dados e backup", icon: "⇅", hint: "Exportação e lixeira" },
      { id: "integrations", label: "Integrações", icon: "⌁", hint: "WhatsApp e IA" },
    ],
  },
];

const brands = [
  { name: "Mary Fotografia", use: "Casamentos e ensaios", initials: "M" },
  { name: "MF Studio", use: "Estúdio e editoriais", initials: "MF" },
  { name: "Maryana Ferreira", use: "Assinatura pessoal", initials: "MA" },
];

const watermarkTargets = ["Prévias", "Seleção", "Editadas", "Entregues", "Originais"];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`settings-switch ${checked ? "on" : ""}`}
      onClick={onChange}
      aria-label={label}
      aria-pressed={checked}
    >
      <span />
    </button>
  );
}

function ComingSetting({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="settings-row-card">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {children ?? <button type="button">Configurar</button>}
    </div>
  );
}

export function SettingsModal({
  themeMode,
  palette,
  onThemeModeChange,
  onPaletteChange,
  onClose,
  onSave,
  notificationPreferences,
  onNotificationPreferencesChange,
  onRequestBrowserPermission,
}: SettingsModalProps) {
  const [section, setSection] = useState<SettingsSection>("overview");
  const [query, setQuery] = useState("");
  const [customReminder, setCustomReminder] = useState("");
  const [savedSettings, setSavedSettings] = useStoredJsonState(
    storageKeys.professionalSettings,
    defaultSettings,
  );
  const [draft, setDraft] = useState<ProfessionalSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (loaded) return;
    setDraft(savedSettings);
    setLoaded(true);
  }, [loaded, savedSettings]);

  const updateDraft = (update: (current: ProfessionalSettings) => ProfessionalSettings) => {
    setDraft(update);
    setDirty(true);
  };

  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return settingsGroups;
    return settingsGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          `${item.label} ${item.hint}`.toLocaleLowerCase("pt-BR").includes(normalized),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  const selectFiles = (files: FileList | null, kind: "watermark" | "contract") => {
    if (!files?.length) return;
    const names = Array.from(files).map((file) => file.name);
    updateDraft((current) =>
      kind === "watermark"
        ? { ...current, watermarks: [...new Set([...current.watermarks, ...names])] }
        : { ...current, contractTemplates: [...new Set([...current.contractTemplates, ...names])] },
    );
  };

  const toggleReminder = (day: number) => {
    const exists = notificationPreferences.reminderDays.includes(day);
    onNotificationPreferencesChange({
      ...notificationPreferences,
      reminderDays: exists
        ? notificationPreferences.reminderDays.filter((item) => item !== day)
        : [...notificationPreferences.reminderDays, day].sort((a, b) => b - a),
    });
    setDirty(true);
  };

  const save = () => {
    setSavedSettings(draft);
    setDirty(false);
    onSave();
  };

  const renderOverview = () => (
    <>
      <div className="settings-hero-card">
        <div className="settings-avatar">MF</div>
        <div>
          <span>ESPAÇO PROFISSIONAL</span>
          <h2>Deixe o Revelar. com a cara do seu trabalho</h2>
          <p>
            Centralize sua identidade, documentos, padrões de entrega e preferências em um só lugar.
          </p>
        </div>
        <button type="button" onClick={() => setSection("account")}>
          Completar perfil
        </button>
      </div>
      <div className="settings-overview-grid">
        <button type="button" onClick={() => setSection("brands")}>
          <span>3 identidades</span>
          <strong>Marcas profissionais</strong>
          <small>Escolha a marca certa para cada trabalho.</small>
        </button>
        <button type="button" onClick={() => setSection("watermarks")}>
          <span>{draft.watermarks.length} cadastradas</span>
          <strong>Marcas-d’água</strong>
          <small>Defina proteção por etapa e por foto.</small>
        </button>
        <button type="button" onClick={() => setSection("contracts")}>
          <span>{draft.contractTemplates.length} modelos</span>
          <strong>Contratos</strong>
          <small>Importe PDF e DOCX com preenchimento automático.</small>
        </button>
        <button type="button" onClick={() => setSection("data")}>
          <span>Preparado</span>
          <strong>Dados e backup</strong>
          <small>Base pronta para sincronização e banco definitivo.</small>
        </button>
      </div>
      <div className="settings-status-card">
        <span className="status-dot" />
        <div>
          <strong>Esta versão salva as preferências neste dispositivo</strong>
          <p>
            Quando o banco definitivo entrar, arquivos, marcas e modelos serão sincronizados entre
            computador e telefone.
          </p>
        </div>
      </div>
    </>
  );

  const renderAccount = () => (
    <>
      <div className="settings-section-heading">
        <span>PERFIL</span>
        <h2>Minha conta</h2>
        <p>Dados pessoais e profissionais usados no painel.</p>
      </div>
      <div className="profile-photo-card">
        <div className="settings-avatar large">MF</div>
        <div>
          <strong>Foto da Maryana</strong>
          <p>Será exibida apenas no painel e nas atividades da equipe.</p>
        </div>
        <label className="outline-upload">
          Alterar foto
          <input type="file" accept="image/png,image/jpeg,image/webp" />
        </label>
      </div>
      <div className="settings-form-grid">
        <label>
          Nome completo
          <input
            value={draft.profile.name}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                profile: { ...current.profile, name: event.target.value },
              }))
            }
          />
        </label>
        <label>
          E-mail profissional
          <input
            type="email"
            value={draft.profile.email}
            placeholder="mary@exemplo.com"
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                profile: { ...current.profile, email: event.target.value },
              }))
            }
          />
        </label>
        <label>
          Telefone / WhatsApp
          <input
            value={draft.profile.phone}
            placeholder="+55 ou +351"
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                profile: { ...current.profile, phone: event.target.value },
              }))
            }
          />
        </label>
        <label>
          Instagram
          <input
            value={draft.profile.instagram}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                profile: { ...current.profile, instagram: event.target.value },
              }))
            }
          />
        </label>
        <label>
          Site
          <input
            value={draft.profile.site}
            placeholder="https://"
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                profile: { ...current.profile, site: event.target.value },
              }))
            }
          />
        </label>
        <label className="wide">
          Bio profissional
          <textarea
            value={draft.profile.bio}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                profile: { ...current.profile, bio: event.target.value },
              }))
            }
          />
        </label>
      </div>
    </>
  );

  const renderBrands = () => (
    <>
      <div className="settings-section-heading">
        <span>IDENTIDADE</span>
        <h2>Marcas profissionais</h2>
        <p>Use contatos, logos e assinaturas diferentes sem misturar as marcas.</p>
      </div>
      <div className="brand-settings-grid">
        {brands.map((brand) => (
          <article className={draft.activeBrand === brand.name ? "active" : ""} key={brand.name}>
            <div className="brand-mark">{brand.initials}</div>
            <div>
              <h3>{brand.name}</h3>
              <p>{brand.use}</p>
            </div>
            <span>{draft.activeBrand === brand.name ? "Padrão" : "Disponível"}</span>
            <button
              type="button"
              onClick={() => updateDraft((current) => ({ ...current, activeBrand: brand.name }))}
            >
              {draft.activeBrand === brand.name ? "Editar identidade" : "Definir como padrão"}
            </button>
          </article>
        ))}
      </div>
      <ComingSetting
        title="Logo e símbolo separados"
        description="Cadastre versões claras, escuras e monocromáticas para documentos e galerias."
      />
      <ComingSetting
        title="Assinatura profissional"
        description="Imagem ou assinatura digitada para contratos e orçamentos."
      />
    </>
  );

  const renderWatermarks = () => (
    <>
      <div className="settings-section-heading">
        <span>FOTOGRAFIAS</span>
        <h2>Marcas-d’água</h2>
        <p>O arquivo original nunca será alterado.</p>
      </div>
      <div className="watermark-layout">
        <div>
          <label className="file-drop">
            <strong>＋ Importar marca-d’água</strong>
            <span>PNG ou SVG com transparência</span>
            <input
              type="file"
              multiple
              accept="image/png,image/svg+xml"
              onChange={(event) => selectFiles(event.target.files, "watermark")}
            />
          </label>
          {draft.watermarks.length > 0 && (
            <div className="uploaded-file-list">
              {draft.watermarks.map((name) => (
                <span key={name}>
                  {name}
                  <button
                    type="button"
                    aria-label={`Remover ${name}`}
                    onClick={() =>
                      updateDraft((current) => ({
                        ...current,
                        watermarks: current.watermarks.filter((item) => item !== name),
                      }))
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="settings-control-block">
            <h3>Como aplicar</h3>
            <div className="option-grid three">
              {(["corner", "center", "tile"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={draft.watermarkMode === mode ? "selected" : ""}
                  onClick={() => updateDraft((current) => ({ ...current, watermarkMode: mode }))}
                >
                  {mode === "corner"
                    ? "No canto"
                    : mode === "center"
                      ? "Sobre a imagem"
                      : "Em mosaico"}
                </button>
              ))}
            </div>
            {draft.watermarkMode === "corner" && (
              <label className="select-label">
                Posição
                <select
                  value={draft.watermarkCorner}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      watermarkCorner: event.target
                        .value as ProfessionalSettings["watermarkCorner"],
                    }))
                  }
                >
                  <option value="top-left">Superior esquerdo</option>
                  <option value="top-right">Superior direito</option>
                  <option value="bottom-left">Inferior esquerdo</option>
                  <option value="bottom-right">Inferior direito</option>
                </select>
              </label>
            )}
            <label className="range-label">
              <span>
                Transparência <b>{draft.watermarkOpacity}%</b>
              </span>
              <input
                type="range"
                min="10"
                max="90"
                value={draft.watermarkOpacity}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    watermarkOpacity: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="range-label">
              <span>
                Tamanho <b>{draft.watermarkSize}%</b>
              </span>
              <input
                type="range"
                min="10"
                max="65"
                value={draft.watermarkSize}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    watermarkSize: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
        </div>
        <div className="watermark-preview-card">
          <div
            className={`watermark-preview ${draft.watermarkMode} ${draft.watermarkCorner}`}
            style={
              {
                "--watermark-opacity": draft.watermarkOpacity / 100,
                "--watermark-size": `${draft.watermarkSize}%`,
              } as React.CSSProperties
            }
          >
            <div className="preview-scene">
              <span>PRÉVIA EM TEMPO REAL</span>
            </div>
            <div className="single-watermark">MARY FOTOGRAFIA</div>
            <div className="tile-watermark">
              {Array.from({ length: 12 }).map((_, index) => (
                <i key={index}>MARY</i>
              ))}
            </div>
          </div>
          <small>Prévia ilustrativa · nenhuma alteração no original</small>
        </div>
      </div>
      <div className="settings-control-block full">
        <h3>Em quais etapas aplicar</h3>
        <div className="target-chips">
          {watermarkTargets.map((target) => (
            <button
              type="button"
              key={target}
              className={draft.watermarkTargets.includes(target) ? "selected" : ""}
              onClick={() =>
                updateDraft((current) => ({
                  ...current,
                  watermarkTargets: current.watermarkTargets.includes(target)
                    ? current.watermarkTargets.filter((item) => item !== target)
                    : [...current.watermarkTargets, target],
                }))
              }
            >
              {target}
            </button>
          ))}
        </div>
        <div className="toggle-list compact">
          <label>
            <span>
              <strong>Na visualização da galeria</strong>
              <small>Protege a prévia vista pelo cliente.</small>
            </span>
            <Toggle
              checked={draft.watermarkPreview}
              onChange={() =>
                updateDraft((current) => ({
                  ...current,
                  watermarkPreview: !current.watermarkPreview,
                }))
              }
              label="Marca na visualização"
            />
          </label>
          <label>
            <span>
              <strong>Nas cópias baixadas</strong>
              <small>Aplica somente na cópia exportada.</small>
            </span>
            <Toggle
              checked={draft.watermarkDownload}
              onChange={() =>
                updateDraft((current) => ({
                  ...current,
                  watermarkDownload: !current.watermarkDownload,
                }))
              }
              label="Marca nas cópias baixadas"
            />
          </label>
        </div>
      </div>
    </>
  );

  const renderContracts = () => (
    <>
      <div className="settings-section-heading">
        <span>DOCUMENTOS</span>
        <h2>Modelos de contrato</h2>
        <p>Importe seus arquivos e deixe o Revelar. preencher os dados repetitivos.</p>
      </div>
      <label className="file-drop wide-drop">
        <strong>＋ Importar modelo</strong>
        <span>PDF ou DOCX · vários modelos permitidos</span>
        <input
          type="file"
          multiple
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => selectFiles(event.target.files, "contract")}
        />
      </label>
      {draft.contractTemplates.length > 0 ? (
        <div className="template-list">
          {draft.contractTemplates.map((name) => (
            <article key={name}>
              <span className="file-type">
                {name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX"}
              </span>
              <div>
                <strong>{name}</strong>
                <small>Modelo importado neste dispositivo</small>
              </div>
              <button
                type="button"
                onClick={() => updateDraft((current) => ({ ...current, defaultContract: name }))}
              >
                {draft.defaultContract === name ? "Padrão" : "Usar como padrão"}
              </button>
              <button
                type="button"
                className="icon-remove"
                aria-label={`Remover ${name}`}
                onClick={() =>
                  updateDraft((current) => ({
                    ...current,
                    contractTemplates: current.contractTemplates.filter((item) => item !== name),
                    defaultContract:
                      current.defaultContract === name ? "" : current.defaultContract,
                  }))
                }
              >
                ×
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-setting">
          <strong>Nenhum modelo importado</strong>
          <p>Adicione contratos de casamento, ensaio, evento ou editorial.</p>
        </div>
      )}
      <ComingSetting
        title="Preencher campos automaticamente"
        description="Cliente, documento, data, local, valor e tipo de trabalho serão inseridos antes da prévia."
      >
        <Toggle
          checked={draft.automaticContractFields}
          onChange={() =>
            updateDraft((current) => ({
              ...current,
              automaticContractFields: !current.automaticContractFields,
            }))
          }
          label="Preenchimento automático"
        />
      </ComingSetting>
      <div className="automatic-fields">
        <span>{"{{cliente}}"}</span>
        <span>{"{{documento}}"}</span>
        <span>{"{{data_trabalho}}"}</span>
        <span>{"{{local}}"}</span>
        <span>{"{{valor_total}}"}</span>
        <span>{"{{tipo_trabalho}}"}</span>
      </div>
    </>
  );

  const renderAppearance = () => (
    <>
      <div className="settings-section-heading">
        <span>INTERFACE</span>
        <h2>Aparência</h2>
        <p>Escolha como o Revelar. aparece em cada dispositivo.</p>
      </div>
      <div className="settings-control-block full">
        <h3>Modo</h3>
        <div className="segmented">
          {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
            <button
              type="button"
              key={mode}
              className={themeMode === mode ? "selected" : ""}
              onClick={() => {
                onThemeModeChange(mode);
                setDirty(true);
              }}
            >
              {mode === "system" ? "Automático" : mode === "light" ? "Claro" : "Escuro"}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-control-block full">
        <h3>Paleta</h3>
        <p>Mude as cores sem perder a identidade profissional.</p>
        <div className="palette-grid">
          {palettes.map((option) => (
            <button
              type="button"
              key={option.id}
              className={palette === option.id ? "selected" : ""}
              onClick={() => {
                onPaletteChange(option.id);
                setDirty(true);
              }}
            >
              <span className="color-dots">
                {option.colors.map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </span>
              <strong>{option.name}</strong>
              <small>{palette === option.id ? "Ativo" : "Visualizar"}</small>
            </button>
          ))}
        </div>
      </div>
      <ComingSetting
        title="Tamanho da interface"
        description="Compacta, confortável ou ampliada para melhorar a leitura"
      >
        <div className="mini-segment">
          <button type="button">A−</button>
          <button type="button" className="active">
            A
          </button>
          <button type="button">A＋</button>
        </div>
      </ComingSetting>
    </>
  );

  const renderNotifications = () => (
    <>
      <div className="settings-section-heading">
        <span>AVISOS</span>
        <h2>Notificações</h2>
        <p>Escolha o que merece sua atenção e quando avisar.</p>
      </div>
      <div className="settings-row-card featured">
        <div>
          <strong>Avisos no navegador e telefone</strong>
          <p>No telefone, instale o Revelar. na tela inicial.</p>
        </div>
        <button
          type="button"
          className={notificationPreferences.browserEnabled ? "permission-active" : ""}
          onClick={() => void onRequestBrowserPermission()}
        >
          {notificationPreferences.browserEnabled ? "Ativado" : "Ativar avisos"}
        </button>
      </div>
      <div className="toggle-list">
        {notificationCategoryOptions.map((option) => (
          <label key={option.id}>
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
            <Toggle
              checked={notificationPreferences.categories[option.id]}
              onChange={() => {
                onNotificationPreferencesChange({
                  ...notificationPreferences,
                  categories: {
                    ...notificationPreferences.categories,
                    [option.id]: !notificationPreferences.categories[option.id],
                  },
                });
                setDirty(true);
              }}
              label={option.label}
            />
          </label>
        ))}
      </div>
      <div className="settings-control-block full">
        <h3>Antecedência</h3>
        <div className="reminder-days">
          {[7, 3, 1, 0].map((day) => (
            <button
              type="button"
              key={day}
              className={notificationPreferences.reminderDays.includes(day) ? "active" : ""}
              onClick={() => toggleReminder(day)}
            >
              {day === 0 ? "No dia" : `${day}d antes`}
            </button>
          ))}
        </div>
        <div className="custom-reminder">
          <input
            type="number"
            min="1"
            max="365"
            value={customReminder}
            onChange={(event) => setCustomReminder(event.target.value)}
            placeholder="Outro prazo"
          />
          <button
            type="button"
            onClick={() => {
              const day = Number(customReminder);
              if (day > 0 && day <= 365 && !notificationPreferences.reminderDays.includes(day)) {
                toggleReminder(day);
                setCustomReminder("");
              }
            }}
          >
            Adicionar
          </button>
        </div>
      </div>
    </>
  );

  const renderStandard = () => {
    const content: Record<
      Exclude<
        SettingsSection,
        | "overview"
        | "account"
        | "brands"
        | "watermarks"
        | "contracts"
        | "appearance"
        | "notifications"
      >,
      { eyebrow: string; title: string; description: string; rows: Array<[string, string]> }
    > = {
      work: {
        eyebrow: "PADRÕES",
        title: "Trabalhos",
        description: "Modelos que aceleram a criação de novos trabalhos.",
        rows: [
          ["Categorias e tipos", "Casamento, ensaio, família, editorial e eventos"],
          ["Etapas padrão", "Fluxos com prazo, checklist e responsável"],
          ["Pacotes e equipe", "Serviços, duração, entregas e colaboradores"],
        ],
      },
      agenda: {
        eyebrow: "TEMPO",
        title: "Agenda",
        description: "Disponibilidade e lembretes usados em novos eventos.",
        rows: [
          ["Horários de trabalho", "Defina dias, turnos e intervalos"],
          ["Indisponibilidades", "Bloqueios pessoais, férias e deslocamentos"],
          ["Fuso horário", "Portugal e Brasil com horários corretos"],
        ],
      },
      galleries: {
        eyebrow: "CLIENTES",
        title: "Galerias",
        description: "Padrões de seleção, segurança e entrega.",
        rows: [
          ["Acesso do cliente", "PIN e validade opcionais"],
          ["Downloads e seleção", "Limites, aprovações e fotos extras"],
          ["Marca-d’água padrão", "Defina uma regra e altere por galeria"],
        ],
      },
      finance: {
        eyebrow: "CONTROLE",
        title: "Financeiro",
        description: "Moedas, contas e confirmações importantes.",
        rows: [
          ["Real e Euro", "Controles separados, sem conversão automática"],
          ["Contas e categorias", "Carteiras, bancos e formas de pagamento"],
          ["Proteção de valores", "Confirmação antes de cancelar ou corrigir"],
        ],
      },
      quotes: {
        eyebrow: "DOCUMENTOS",
        title: "Orçamentos",
        description: "Padrões dos orçamentos enviados a clientes.",
        rows: [
          ["Numeração automática", "Sequência separada por identidade profissional"],
          ["Validade padrão", "Prazo, observações e condições"],
          ["Identidade visual", "Logo, cores e assinatura do documento"],
        ],
      },
      products: {
        eyebrow: "CATÁLOGO",
        title: "Produtos",
        description: "Padrões para produtos digitais e físicos.",
        rows: [
          ["Disponibilidade", "Vagas, estoque e limite mensal"],
          ["Entrega", "Arquivo, link, retirada ou envio"],
          ["Promoções", "Desconto fixo, percentual e período"],
        ],
      },
      team: {
        eyebrow: "PESSOAS",
        title: "Equipe",
        description: "Acesso preparado para assistente, editor e fotógrafo.",
        rows: [
          ["Convidar por e-mail", "Somente Maryana poderá enviar convites"],
          ["Funções e permissões", "Acesso por módulo e ação"],
          ["Histórico de atividade", "Usuário, data e dispositivo em cada mudança"],
        ],
      },
      security: {
        eyebrow: "ACESSO",
        title: "Segurança",
        description: "Proteção da conta e dos dados do estúdio.",
        rows: [
          ["Senha e recuperação", "Alteração segura e recuperação por e-mail"],
          ["Dispositivos conectados", "Veja e encerre sessões antigas"],
          ["Autenticação em dois fatores", "Preparada para ativação futura"],
        ],
      },
      privacy: {
        eyebrow: "PRIVACIDADE",
        title: "Consentimentos",
        description: "Controle de imagem e retenção de dados pessoais.",
        rows: [
          ["Autorização de imagem", "Modelos por tipo de trabalho"],
          ["Retenção de dados", "Prazo e motivo para manter informações"],
          ["Solicitações do cliente", "Exportar, corrigir ou excluir dados"],
        ],
      },
      data: {
        eyebrow: "DADOS",
        title: "Sincronização e backup",
        description: "Tudo preparado para o banco definitivo.",
        rows: [
          ["Backup automático", "Diário, mantendo os últimos 30 dias"],
          ["Exportação completa", "ZIP com JSON, CSV, fotos e documentos"],
          ["Lixeira", "Recuperação por 30 dias antes da exclusão definitiva"],
          ["Conflitos offline", "Compare as versões antes de escolher qual manter"],
        ],
      },
      integrations: {
        eyebrow: "CONEXÕES",
        title: "Integrações",
        description: "Serviços que poderão trabalhar junto com o Revelar.",
        rows: [
          ["WhatsApp Business", "Conversas, anexos e vínculo com clientes"],
          ["Inteligência artificial", "Sugestões com aprovação antes de agir"],
          ["Calendário e clima", "Compromissos, previsão e pôr do sol"],
        ],
      },
    };
    const selected = content[section as keyof typeof content];
    if (!selected) return null;
    return (
      <>
        <div className="settings-section-heading">
          <span>{selected.eyebrow}</span>
          <h2>{selected.title}</h2>
          <p>{selected.description}</p>
        </div>
        <div className="standard-settings-list">
          {selected.rows.map(([title, description]) => (
            <ComingSetting key={title} title={title} description={description} />
          ))}
        </div>
        <div className="settings-status-card neutral">
          <span className="status-dot" />
          <div>
            <strong>Estrutura pronta para a próxima fase</strong>
            <p>
              Essas opções serão conectadas ao banco definitivo por módulo, sem misturar dados
              demonstrativos.
            </p>
          </div>
        </div>
      </>
    );
  };

  const renderContent = () => {
    if (section === "overview") return renderOverview();
    if (section === "account") return renderAccount();
    if (section === "brands") return renderBrands();
    if (section === "watermarks") return renderWatermarks();
    if (section === "contracts") return renderContracts();
    if (section === "appearance") return renderAppearance();
    if (section === "notifications") return renderNotifications();
    return renderStandard();
  };

  return (
    <div className="modal-backdrop settings-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="settings-modal settings-workspace"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="settings-workspace-header">
          <div>
            <p>CONFIGURAÇÕES</p>
            <h1 id="settings-title">Personalize seu Revelar.</h1>
          </div>
          <div className="settings-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar configuração..."
              aria-label="Pesquisar configurações"
            />
          </div>
          <button type="button" className="settings-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="settings-workspace-body">
          <aside className="settings-sidebar" aria-label="Áreas das configurações">
            {visibleGroups.length > 0 ? (
              visibleGroups.map((group) => (
                <div key={group.title}>
                  <p>{group.title}</p>
                  {group.items.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={section === item.id ? "active" : ""}
                      onClick={() => setSection(item.id)}
                    >
                      <i>{item.icon}</i>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.hint}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="settings-no-results">Nenhuma configuração encontrada.</div>
            )}
          </aside>
          <main className="settings-content">{renderContent()}</main>
        </div>
        <footer className="settings-workspace-footer">
          <span className={dirty ? "dirty" : ""}>
            {dirty ? "● Alterações ainda não salvas" : "✓ Tudo salvo neste dispositivo"}
          </span>
          <div>
            <button type="button" className="outline-button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary-button" type="button" onClick={save}>
              Salvar configurações
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
