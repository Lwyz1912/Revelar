"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FileViewer } from "@/components/shared/FileViewer";
import {
  defaultProfessionalSettings,
  normalizeProfessionalSettings,
  type BrandSettings,
  type ContractTemplateSettings,
  type ProfessionalSettings,
  type SettingsFileRef,
  type WatermarkSettings,
} from "@/config/settings";
import { notificationCategoryOptions } from "@/config/notifications";
import { palettes } from "@/config/themes";
import { useStoredJsonState } from "@/hooks/use-persisted-state";
import { deleteSettingsFile, readSettingsFile } from "@/lib/settings-files.client";
import {
  deleteAppFile,
  fileDownloadUrl,
  fileViewUrl,
  formatFileSize,
  uploadAppFile,
} from "@/lib/app-files.client";
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

type BrandAssetKey =
  | "logoLight"
  | "logoDark"
  | "logoMono"
  | "symbolLight"
  | "symbolDark"
  | "symbolMono"
  | "signature";

const settingsGroups: Array<{
  title: string;
  items: Array<{ id: SettingsSection; label: string; icon: string; hint: string }>;
}> = [
  {
    title: "PERFIL E MARCA",
    items: [
      { id: "overview", label: "Início", icon: "⌂", hint: "Resumo" },
      { id: "account", label: "Minha conta", icon: "○", hint: "Perfil e contato" },
      { id: "brands", label: "Marcas do negócio", icon: "◇", hint: "Logos e documentos" },
      { id: "watermarks", label: "Marcas-d’água", icon: "◫", hint: "Proteção das fotos" },
    ],
  },
  {
    title: "DOCUMENTOS E FINANÇAS",
    items: [
      { id: "finance", label: "Financeiro", icon: "◉", hint: "Moedas e contas" },
      { id: "contracts", label: "Contratos", icon: "▱", hint: "Modelos e campos" },
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

const watermarkTargets = ["Prévias", "Seleção", "Editadas", "Entregues", "Originais"];
const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const contractCategories: ContractTemplateSettings["category"][] = [
  "Casamento",
  "Ensaio",
  "Evento",
  "Editorial",
  "Geral",
];

function collectFileIds(settings: ProfessionalSettings) {
  const ids = new Set<string>();
  if (settings.profile.avatar) ids.add(settings.profile.avatar.id);
  settings.watermarks.forEach((watermark) => ids.add(watermark.file.id));
  settings.contractTemplates.forEach((template) => ids.add(template.file.id));
  settings.brands.forEach((brand) => {
    (
      [
        "logoLight",
        "logoDark",
        "logoMono",
        "symbolLight",
        "symbolDark",
        "symbolMono",
        "signature",
      ] as BrandAssetKey[]
    ).forEach((key) => {
      const file = brand[key];
      if (file && typeof file !== "string") ids.add(file.id);
    });
  });
  return ids;
}

function collectFiles(settings: ProfessionalSettings) {
  const files = new Map<string, SettingsFileRef>();
  const add = (file?: SettingsFileRef) => {
    if (file) files.set(file.id, file);
  };
  add(settings.profile.avatar);
  settings.watermarks.forEach((watermark) => add(watermark.file));
  settings.contractTemplates.forEach((template) => add(template.file));
  settings.brands.forEach((brand) => {
    (
      [
        "logoLight",
        "logoDark",
        "logoMono",
        "symbolLight",
        "symbolDark",
        "symbolMono",
        "signature",
      ] as BrandAssetKey[]
    ).forEach((key) => add(brand[key]));
  });
  return files;
}

function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`settings-switch ${checked ? "on" : ""}`}
      onClick={onChange}
      aria-label={label}
      aria-pressed={checked}
      disabled={disabled}
    >
      <span aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="settings-section-heading">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function LocalImage({
  file,
  alt,
  className,
}: {
  file?: SettingsFileRef;
  alt: string;
  className?: string;
}) {
  const [preview, setPreview] = useState({ id: "", url: "" });
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (!file) return;
    void fetch(fileViewUrl(file), { cache: "no-store" })
      .then((response) => (response.ok ? response.blob() : null))
      .then(async (stored) => stored || (await readSettingsFile(file.id)))
      .then((stored) => {
        if (!active || !stored) return;
        objectUrl = URL.createObjectURL(stored);
        setPreview({ id: file.id, url: objectUrl });
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);
  return file && preview.id === file.id ? (
    <img className={className} src={preview.url} alt={alt} />
  ) : null;
}

function DisabledSetting({ title, description }: { title: string; description: string }) {
  return (
    <div className="settings-row-card settings-disabled-card" aria-disabled="true">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button type="button" disabled>
        Após conectar o banco
      </button>
    </div>
  );
}

function EditableList({
  title,
  description,
  items,
  value,
  placeholder,
  onValueChange,
  onAdd,
  onRemove,
}: {
  title: string;
  description: string;
  items: string[];
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}) {
  return (
    <div className="settings-control-block full">
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="editable-list">
        {items.map((item) => (
          <span key={item}>
            {item}
            <button type="button" onClick={() => onRemove(item)} aria-label={`Remover ${item}`}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="custom-reminder">
        <input
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
        />
        <button type="button" onClick={onAdd} disabled={!value.trim()}>
          Adicionar
        </button>
      </div>
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
  const [listInputs, setListInputs] = useState<Record<string, string>>({});
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [fileNotice, setFileNotice] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<SettingsFileRef | null>(null);
  const [replaceTemplateId, setReplaceTemplateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const templateReplaceInput = useRef<HTMLInputElement>(null);
  const [savedValue, setSavedValue] = useStoredJsonState<unknown>(
    storageKeys.professionalSettings,
    defaultProfessionalSettings,
  );
  const [draft, setDraft] = useState<ProfessionalSettings>(defaultProfessionalSettings);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const pendingFiles = useRef(new Map<string, SettingsFileRef>());
  const initialTheme = useRef(themeMode);
  const initialPalette = useRef(palette);
  const initialNotifications = useRef(notificationPreferences);

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    void fetch("/api/professional-settings", { cache: "no-store" })
      .then(async (response) =>
        response.ok ? ((await response.json()) as { data?: unknown } | null) : null,
      )
      .catch(() => null)
      .then((result) => {
        if (cancelled) return;
        const value = result?.data ?? savedValue;
        setSavedValue(value);
        setDraft(normalizeProfessionalSettings(value));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [loaded, savedValue, setSavedValue]);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.dataset.interfaceSize = draft.appearance.interfaceSize;
    document.documentElement.dataset.highContrast = String(draft.appearance.highContrast);
  }, [draft.appearance.highContrast, draft.appearance.interfaceSize, loaded]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const savedSettings = useMemo(() => normalizeProfessionalSettings(savedValue), [savedValue]);

  const updateDraft = useCallback(
    (update: (current: ProfessionalSettings) => ProfessionalSettings) => {
      setDraft(update);
      setDirty(true);
    },
    [],
  );

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

  const storeFile = async (file: File, scope: string, relatedId?: string) => {
    const ref = await uploadAppFile(file, scope, relatedId);
    pendingFiles.current.set(ref.id, ref);
    return ref;
  };

  const handleFileError = () => {
    setFileNotice("Não foi possível enviar esse arquivo ao Revelar.");
    window.setTimeout(() => setFileNotice(""), 3500);
  };

  const setProfileAvatar = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const ref = await storeFile(file, "profile");
      updateDraft((current) => ({ ...current, profile: { ...current.profile, avatar: ref } }));
    } catch {
      handleFileError();
    }
  };

  const updateBrand = (id: string, update: Partial<BrandSettings>) => {
    updateDraft((current) => ({
      ...current,
      brands: current.brands.map((brand) => (brand.id === id ? { ...brand, ...update } : brand)),
    }));
  };

  const setBrandAsset = async (brandId: string, key: BrandAssetKey, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const ref = await storeFile(file, "brand", brandId);
      updateBrand(brandId, { [key]: ref });
    } catch {
      handleFileError();
    }
  };

  const addWatermarks = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const added: WatermarkSettings[] = [];
      for (const file of Array.from(files)) {
        const ref = await storeFile(file, "watermark");
        added.push({ id: ref.id, name: file.name.replace(/\.[^.]+$/, ""), file: ref });
      }
      updateDraft((current) => ({
        ...current,
        watermarks: [...current.watermarks, ...added],
        selectedWatermarkId: current.selectedWatermarkId || added[0]?.id || "",
      }));
    } catch {
      handleFileError();
    }
  };

  const addContractTemplates = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const added: ContractTemplateSettings[] = [];
      for (const file of Array.from(files)) {
        const ref = await storeFile(file, "contract-template");
        added.push({ id: ref.id, file: ref, category: "Geral", brandId: draft.activeBrandId });
      }
      updateDraft((current) => ({
        ...current,
        contractTemplates: [...current.contractTemplates, ...added],
      }));
    } catch {
      handleFileError();
    }
  };

  const replaceContractTemplate = async (templateId: string, file?: File) => {
    if (!file) return;
    try {
      const ref = await storeFile(file, "contract-template", templateId);
      const previous = draft.contractTemplates.find((item) => item.id === templateId)?.file;
      removeFileFromDraft(previous);
      updateDraft((current) => ({
        ...current,
        contractTemplates: current.contractTemplates.map((item) =>
          item.id === templateId ? { ...item, file: ref } : item,
        ),
      }));
      if (previewTemplate?.id === previous?.id) setPreviewTemplate(ref);
    } catch {
      handleFileError();
    }
  };

  const removeFileFromDraft = (ref?: SettingsFileRef) => {
    if (ref && pendingFiles.current.has(ref.id)) {
      void deleteAppFile(ref).catch(() => deleteSettingsFile(ref.id));
      pendingFiles.current.delete(ref.id);
    }
  };

  const restoreImmediatePreferences = () => {
    onThemeModeChange(initialTheme.current);
    onPaletteChange(initialPalette.current);
    onNotificationPreferencesChange(initialNotifications.current);
    document.documentElement.dataset.interfaceSize = savedSettings.appearance.interfaceSize;
    document.documentElement.dataset.highContrast = String(savedSettings.appearance.highContrast);
  };

  const cancel = () => {
    pendingFiles.current.forEach(
      (file) => void deleteAppFile(file).catch(() => deleteSettingsFile(file.id)),
    );
    pendingFiles.current.clear();
    restoreImmediatePreferences();
    onClose();
  };

  const requestClose = () => {
    if (dirty && !window.confirm("Descartar todas as alterações feitas nas Configurações?")) return;
    cancel();
  };

  const save = async () => {
    setSaving(true);
    const response = await fetch("/api/professional-settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    }).catch(() => null);
    if (!response?.ok) {
      setSaving(false);
      setFileNotice("Não foi possível sincronizar as configurações. Tente novamente.");
      window.setTimeout(() => setFileNotice(""), 4000);
      return;
    }
    const previousFiles = collectFiles(savedSettings);
    const nextIds = collectFileIds(draft);
    previousFiles.forEach((file, id) => {
      if (!nextIds.has(id)) void deleteAppFile(file).catch(() => deleteSettingsFile(id));
    });
    setSavedValue(draft);
    pendingFiles.current.clear();
    setDirty(false);
    setSaving(false);
    onSave();
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

  const updateList = (
    group: "work" | "finance",
    field: "categories" | "stages" | "packages" | "accounts" | "paymentMethods",
    items: string[],
  ) => {
    updateDraft((current) => ({
      ...current,
      [group]: { ...current[group], [field]: items },
    }));
  };

  const addListItem = (
    key: string,
    group: "work" | "finance",
    field: "categories" | "stages" | "packages" | "accounts" | "paymentMethods",
    items: string[],
  ) => {
    const value = (listInputs[key] ?? "").trim();
    if (
      !value ||
      items.some((item) => item.toLocaleLowerCase("pt-BR") === value.toLocaleLowerCase("pt-BR"))
    )
      return;
    updateList(group, field, [...items, value]);
    setListInputs((current) => ({ ...current, [key]: "" }));
  };

  const renderOverview = () => (
    <>
      <div className="settings-hero-card">
        <div className="settings-avatar">MF</div>
        <div>
          <span>ESPAÇO PROFISSIONAL</span>
          <h2>Deixe o Revelar. com a cara do seu trabalho</h2>
          <p>Perfil, marcas, documentos e preferências gerais em um só lugar.</p>
        </div>
        <button type="button" onClick={() => setSection("account")}>
          Completar perfil
        </button>
      </div>
      <div className="settings-overview-grid">
        <button type="button" onClick={() => setSection("brands")}>
          <span>{draft.brands.length} marcas</span>
          <strong>Marcas do negócio</strong>
          <small>Nome, logo e contatos usados em documentos e galerias.</small>
        </button>
        <button type="button" onClick={() => setSection("watermarks")}>
          <span>{draft.watermarks.length} cadastradas</span>
          <strong>Marcas-d’água</strong>
          <small>Proteção por etapa e tipo de entrega.</small>
        </button>
        <button type="button" onClick={() => setSection("contracts")}>
          <span>{draft.contractTemplates.length} modelos</span>
          <strong>Contratos</strong>
          <small>PDF e DOCX organizados por categoria.</small>
        </button>
        <button type="button" onClick={() => setSection("appearance")}>
          <span>Personalizável</span>
          <strong>Aparência</strong>
          <small>Modo, paleta, tamanho e contraste.</small>
        </button>
      </div>
      <div className="settings-status-card">
        <span className="status-dot" />
        <div>
          <strong>Preferências e arquivos salvos neste dispositivo</strong>
          <p>A sincronização entre celular e computador será ativada com o banco definitivo.</p>
        </div>
      </div>
    </>
  );

  const renderAccount = () => (
    <>
      <SectionHeading
        eyebrow="PERFIL"
        title="Minha conta"
        description="Dados pessoais e profissionais usados no painel."
      />
      <div className="profile-photo-card">
        <div className="settings-avatar large profile-avatar">
          <LocalImage file={draft.profile.avatar} alt="Foto de Maryana" />
          {!draft.profile.avatar && "MF"}
        </div>
        <div>
          <strong>Foto da Maryana</strong>
          <p>Exibida no painel e nas atividades da equipe.</p>
        </div>
        <label className="outline-upload">
          Alterar foto
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void setProfileAvatar(event.target.files)}
          />
        </label>
        {draft.profile.avatar && (
          <button
            type="button"
            className="subtle-remove"
            onClick={() => {
              removeFileFromDraft(draft.profile.avatar);
              updateDraft((current) => ({
                ...current,
                profile: { ...current.profile, avatar: undefined },
              }));
            }}
          >
            Remover
          </button>
        )}
      </div>
      <div className="settings-form-grid">
        {(
          [
            ["name", "Nome completo", "Maryana Ferreira", "text"],
            ["email", "E-mail profissional", "mary@exemplo.com", "email"],
            ["phone", "Telefone / WhatsApp", "+55 ou +351", "tel"],
            ["instagram", "Instagram", "@maryfotografiaa__", "text"],
            ["site", "Site", "https://", "url"],
          ] as const
        ).map(([key, label, placeholder, type]) => (
          <label key={key}>
            {label}
            <input
              type={type}
              value={draft.profile[key]}
              placeholder={placeholder}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  profile: { ...current.profile, [key]: event.target.value },
                }))
              }
            />
          </label>
        ))}
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

  const renderBrandEditor = (brand: BrandSettings) => {
    const assets: Array<[BrandAssetKey, string, string]> = [
      ["logoLight", "Logo para fundo claro", "PNG, SVG ou WEBP"],
      ["logoDark", "Logo para fundo escuro", "PNG, SVG ou WEBP"],
      ["logoMono", "Logo monocromática", "PNG ou SVG"],
      ["symbolLight", "Símbolo para fundo claro", "PNG, SVG ou WEBP"],
      ["symbolDark", "Símbolo para fundo escuro", "PNG, SVG ou WEBP"],
      ["symbolMono", "Símbolo monocromático", "PNG ou SVG"],
      ["signature", "Assinatura em imagem", "PNG, SVG ou WEBP"],
    ];
    return (
      <div className="brand-editor">
        <div className="brand-editor-header">
          <div>
            <span>EDITANDO MARCA</span>
            <h3>{brand.name}</h3>
          </div>
          <button type="button" onClick={() => setEditingBrandId(null)}>
            Concluir
          </button>
        </div>
        <div className="settings-form-grid">
          {(
            [
              ["name", "Nome exibido"],
              ["use", "Uso principal"],
              ["email", "E-mail"],
              ["phone", "Telefone"],
              ["instagram", "Instagram"],
              ["site", "Site"],
              ["address", "Endereço"],
              ["document", "CPF / NIF"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={brand[key]}
                onChange={(event) => updateBrand(brand.id, { [key]: event.target.value })}
              />
            </label>
          ))}
          <label className="wide">
            Assinatura digitada
            <input
              value={brand.signatureText}
              onChange={(event) => updateBrand(brand.id, { signatureText: event.target.value })}
            />
          </label>
        </div>
        <div className="brand-assets-grid">
          {assets.map(([key, label, hint]) => {
            const file = brand[key];
            return (
              <div className="asset-upload-card" key={key}>
                <div>
                  <strong>{label}</strong>
                  <small>{file?.name ?? hint}</small>
                </div>
                <label>
                  {file ? "Trocar" : "Importar"}
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/webp"
                    onChange={(event) => void setBrandAsset(brand.id, key, event.target.files)}
                  />
                </label>
                {file && (
                  <button
                    type="button"
                    onClick={() => {
                      removeFileFromDraft(file);
                      updateBrand(brand.id, { [key]: undefined });
                    }}
                    aria-label={`Remover ${label}`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBrands = () => (
    <>
      <SectionHeading
        eyebrow="IDENTIDADE"
        title="Marcas do negócio"
        description="Define qual nome, logo e contato aparece em contratos, orçamentos e galerias."
      />
      <div className="settings-explainer-card">
        <strong>Para que serve?</strong>
        <p>
          Mary Fotografia pode aparecer nos casamentos e ensaios, enquanto MF Studio pode ser usado
          nos trabalhos de estúdio. Se ela usar apenas Mary Fotografia, basta mantê-la como padrão e
          ignorar a alternativa.
        </p>
      </div>
      <div className="brand-settings-grid">
        {draft.brands.map((brand) => (
          <article className={draft.activeBrandId === brand.id ? "active" : ""} key={brand.id}>
            <div className="brand-mark">{brand.initials}</div>
            <div>
              <h3>{brand.name}</h3>
              <p>{brand.use}</p>
            </div>
            <span>{draft.activeBrandId === brand.id ? "Padrão" : "Disponível"}</span>
            <div className="brand-card-actions">
              {draft.activeBrandId !== brand.id && (
                <button
                  type="button"
                  onClick={() =>
                    updateDraft((current) => ({ ...current, activeBrandId: brand.id }))
                  }
                >
                  Definir padrão
                </button>
              )}
              <button type="button" onClick={() => setEditingBrandId(brand.id)}>
                Editar marca
              </button>
            </div>
          </article>
        ))}
      </div>
      {editingBrandId ? (
        renderBrandEditor(
          draft.brands.find((brand) => brand.id === editingBrandId) ?? draft.brands[0],
        )
      ) : (
        <div className="settings-status-card neutral">
          <span className="status-dot" />
          <div>
            <strong>Cada marca pode ter seus próprios arquivos</strong>
            <p>Abra “Editar marca” para configurar os dados, o logo, o símbolo e a assinatura.</p>
          </div>
        </div>
      )}
    </>
  );

  const selectedWatermark = draft.watermarks.find((item) => item.id === draft.selectedWatermarkId);
  const renderWatermarkMark = (tiled = false) =>
    selectedWatermark ? (
      <LocalImage
        file={selectedWatermark.file}
        alt={selectedWatermark.name}
        className={tiled ? "tile-logo" : "watermark-logo"}
      />
    ) : (
      <span>
        {draft.brands.find((brand) => brand.id === draft.activeBrandId)?.name ?? "MARY FOTOGRAFIA"}
      </span>
    );

  const renderWatermarks = () => (
    <>
      <SectionHeading
        eyebrow="FOTOGRAFIAS"
        title="Marcas-d’água"
        description="O arquivo original nunca será alterado."
      />
      <div className="watermark-layout">
        <div>
          <label className="file-drop">
            <strong>＋ Importar marca-d’água</strong>
            <span>PNG ou SVG com transparência</span>
            <input
              type="file"
              multiple
              accept="image/png,image/svg+xml"
              onChange={(event) => void addWatermarks(event.target.files)}
            />
          </label>
          {draft.watermarks.length > 0 && (
            <div className="watermark-library">
              {draft.watermarks.map((watermark) => (
                <button
                  type="button"
                  className={draft.selectedWatermarkId === watermark.id ? "selected" : ""}
                  key={watermark.id}
                  onClick={() =>
                    updateDraft((current) => ({ ...current, selectedWatermarkId: watermark.id }))
                  }
                >
                  <LocalImage file={watermark.file} alt="" />
                  <span>
                    <strong>{watermark.name}</strong>
                    <small>
                      {draft.selectedWatermarkId === watermark.id ? "Em uso" : "Selecionar"}
                    </small>
                  </span>
                  <i
                    role="button"
                    aria-label={`Remover ${watermark.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeFileFromDraft(watermark.file);
                      updateDraft((current) => ({
                        ...current,
                        watermarks: current.watermarks.filter((item) => item.id !== watermark.id),
                        selectedWatermarkId:
                          current.selectedWatermarkId === watermark.id
                            ? (current.watermarks.find((item) => item.id !== watermark.id)?.id ??
                              "")
                            : current.selectedWatermarkId,
                      }));
                    }}
                  >
                    ×
                  </i>
                </button>
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
            <div className="single-watermark">{renderWatermarkMark()}</div>
            <div className="tile-watermark">
              {Array.from({ length: 12 }).map((_, index) => (
                <i key={index}>{renderWatermarkMark(true)}</i>
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
              <small>Aplica apenas na cópia exportada.</small>
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

  const renderWork = () => (
    <>
      <SectionHeading
        eyebrow="PADRÕES"
        title="Trabalhos"
        description="Modelos usados ao criar novos trabalhos."
      />
      <EditableList
        title="Categorias e tipos"
        description="Tipos disponíveis no cadastro de trabalho."
        items={draft.work.categories}
        value={listInputs.workCategories ?? ""}
        placeholder="Nova categoria"
        onValueChange={(value) =>
          setListInputs((current) => ({ ...current, workCategories: value }))
        }
        onAdd={() => addListItem("workCategories", "work", "categories", draft.work.categories)}
        onRemove={(value) =>
          updateList(
            "work",
            "categories",
            draft.work.categories.filter((item) => item !== value),
          )
        }
      />
      <EditableList
        title="Etapas padrão"
        description="Ordem aplicada em novos fluxos."
        items={draft.work.stages}
        value={listInputs.workStages ?? ""}
        placeholder="Nova etapa"
        onValueChange={(value) => setListInputs((current) => ({ ...current, workStages: value }))}
        onAdd={() => addListItem("workStages", "work", "stages", draft.work.stages)}
        onRemove={(value) =>
          updateList(
            "work",
            "stages",
            draft.work.stages.filter((item) => item !== value),
          )
        }
      />
      <EditableList
        title="Pacotes"
        description="Nomes rápidos para propostas e trabalhos."
        items={draft.work.packages}
        value={listInputs.workPackages ?? ""}
        placeholder="Novo pacote"
        onValueChange={(value) => setListInputs((current) => ({ ...current, workPackages: value }))}
        onAdd={() => addListItem("workPackages", "work", "packages", draft.work.packages)}
        onRemove={(value) =>
          updateList(
            "work",
            "packages",
            draft.work.packages.filter((item) => item !== value),
          )
        }
      />
    </>
  );

  const renderAgenda = () => (
    <>
      <SectionHeading
        eyebrow="TEMPO"
        title="Agenda"
        description="Disponibilidade e lembretes usados em novos eventos."
      />
      <div className="settings-control-block full">
        <h3>Dias de trabalho</h3>
        <div className="target-chips">
          {weekDays.map((day) => (
            <button
              type="button"
              key={day}
              className={draft.agenda.workDays.includes(day) ? "selected" : ""}
              onClick={() =>
                updateDraft((current) => ({
                  ...current,
                  agenda: {
                    ...current.agenda,
                    workDays: current.agenda.workDays.includes(day)
                      ? current.agenda.workDays.filter((item) => item !== day)
                      : [...current.agenda.workDays, day],
                  },
                }))
              }
            >
              {day}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-form-grid settings-control-block full">
        <label>
          Início
          <input
            type="time"
            value={draft.agenda.startTime}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                agenda: { ...current.agenda, startTime: event.target.value },
              }))
            }
          />
        </label>
        <label>
          Fim
          <input
            type="time"
            value={draft.agenda.endTime}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                agenda: { ...current.agenda, endTime: event.target.value },
              }))
            }
          />
        </label>
        <label>
          Início do intervalo
          <input
            type="time"
            value={draft.agenda.breakStart}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                agenda: { ...current.agenda, breakStart: event.target.value },
              }))
            }
          />
        </label>
        <label>
          Fim do intervalo
          <input
            type="time"
            value={draft.agenda.breakEnd}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                agenda: { ...current.agenda, breakEnd: event.target.value },
              }))
            }
          />
        </label>
        <label className="wide">
          Fuso horário
          <select
            value={draft.agenda.timezone}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                agenda: { ...current.agenda, timezone: event.target.value },
              }))
            }
          >
            <option value="Europe/Lisbon">Portugal · Lisboa</option>
            <option value="America/Maceio">Brasil · Maceió</option>
            <option value="America/Sao_Paulo">Brasil · São Paulo</option>
          </select>
        </label>
      </div>
      <div className="settings-control-block full">
        <h3>Lembretes padrão</h3>
        <div className="target-chips">
          {[
            [1440, "1 dia"],
            [120, "2 horas"],
            [30, "30 minutos"],
          ].map(([minutes, label]) => (
            <button
              type="button"
              key={minutes}
              className={
                draft.agenda.defaultReminderMinutes.includes(minutes as number) ? "selected" : ""
              }
              onClick={() =>
                updateDraft((current) => ({
                  ...current,
                  agenda: {
                    ...current.agenda,
                    defaultReminderMinutes: current.agenda.defaultReminderMinutes.includes(
                      minutes as number,
                    )
                      ? current.agenda.defaultReminderMinutes.filter((item) => item !== minutes)
                      : [...current.agenda.defaultReminderMinutes, minutes as number],
                  },
                }))
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  const renderGalleries = () => (
    <>
      <SectionHeading
        eyebrow="CLIENTES"
        title="Galerias"
        description="Padrões de acesso, seleção e entrega."
      />
      <div className="toggle-list">
        <label>
          <span>
            <strong>Solicitar PIN por padrão</strong>
            <small>Pode ser alterado em cada galeria.</small>
          </span>
          <Toggle
            checked={draft.galleries.pinEnabled}
            onChange={() =>
              updateDraft((current) => ({
                ...current,
                galleries: { ...current.galleries, pinEnabled: !current.galleries.pinEnabled },
              }))
            }
            label="PIN padrão"
          />
        </label>
        <label>
          <span>
            <strong>Permitir downloads</strong>
            <small>Controla novas galerias; originais continuam protegidos.</small>
          </span>
          <Toggle
            checked={draft.galleries.downloadsEnabled}
            onChange={() =>
              updateDraft((current) => ({
                ...current,
                galleries: {
                  ...current.galleries,
                  downloadsEnabled: !current.galleries.downloadsEnabled,
                },
              }))
            }
            label="Downloads"
          />
        </label>
      </div>
      <div className="settings-form-grid settings-control-block full">
        <label>
          Validade padrão (dias)
          <input
            type="number"
            min="1"
            value={draft.galleries.validityDays}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                galleries: { ...current.galleries, validityDays: Number(event.target.value) },
              }))
            }
          />
        </label>
        <label>
          Limite de seleção
          <input
            type="number"
            min="0"
            value={draft.galleries.selectionLimit}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                galleries: { ...current.galleries, selectionLimit: Number(event.target.value) },
              }))
            }
          />
        </label>
        <label>
          Revisões incluídas
          <input
            type="number"
            min="0"
            value={draft.galleries.revisionLimit}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                galleries: { ...current.galleries, revisionLimit: Number(event.target.value) },
              }))
            }
          />
        </label>
        <label>
          Preço de foto extra
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.galleries.extraPhotoPrice}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                galleries: { ...current.galleries, extraPhotoPrice: Number(event.target.value) },
              }))
            }
          />
        </label>
        <label className="wide">
          Marca-d’água padrão
          <select
            value={draft.galleries.defaultWatermarkId}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                galleries: { ...current.galleries, defaultWatermarkId: event.target.value },
              }))
            }
          >
            <option value="">Sem marca padrão</option>
            {draft.watermarks.map((watermark) => (
              <option key={watermark.id} value={watermark.id}>
                {watermark.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );

  const renderFinance = () => (
    <>
      <SectionHeading
        eyebrow="CONTROLE"
        title="Financeiro"
        description="Moedas, contas, categorias e confirmações importantes."
      />
      <div className="settings-control-block full">
        <h3>Moedas ativas</h3>
        <div className="target-chips">
          {(["BRL", "EUR"] as const).map((currency) => (
            <button
              type="button"
              key={currency}
              className={draft.finance.currencies.includes(currency) ? "selected" : ""}
              onClick={() => {
                const exists = draft.finance.currencies.includes(currency);
                if (exists && draft.finance.currencies.length === 1) return;
                updateDraft((current) => ({
                  ...current,
                  finance: {
                    ...current.finance,
                    currencies: exists
                      ? current.finance.currencies.filter((item) => item !== currency)
                      : [...current.finance.currencies, currency],
                    defaultCurrency:
                      exists && current.finance.defaultCurrency === currency
                        ? (current.finance.currencies.find((item) => item !== currency) ?? "BRL")
                        : current.finance.defaultCurrency,
                  },
                }));
              }}
            >
              {currency === "BRL" ? "Real (BRL)" : "Euro (EUR)"}
            </button>
          ))}
        </div>
        <label className="select-label">
          Moeda padrão
          <select
            value={draft.finance.defaultCurrency}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                finance: {
                  ...current.finance,
                  defaultCurrency: event.target.value as "BRL" | "EUR",
                },
              }))
            }
          >
            {draft.finance.currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
      </div>
      <EditableList
        title="Contas e carteiras"
        description="Destinos disponíveis nos lançamentos."
        items={draft.finance.accounts}
        value={listInputs.accounts ?? ""}
        placeholder="Nova conta"
        onValueChange={(value) => setListInputs((current) => ({ ...current, accounts: value }))}
        onAdd={() => addListItem("accounts", "finance", "accounts", draft.finance.accounts)}
        onRemove={(value) =>
          updateList(
            "finance",
            "accounts",
            draft.finance.accounts.filter((item) => item !== value),
          )
        }
      />
      <EditableList
        title="Categorias"
        description="Organização de receitas e despesas."
        items={draft.finance.categories}
        value={listInputs.financeCategories ?? ""}
        placeholder="Nova categoria"
        onValueChange={(value) =>
          setListInputs((current) => ({ ...current, financeCategories: value }))
        }
        onAdd={() =>
          addListItem("financeCategories", "finance", "categories", draft.finance.categories)
        }
        onRemove={(value) =>
          updateList(
            "finance",
            "categories",
            draft.finance.categories.filter((item) => item !== value),
          )
        }
      />
      <EditableList
        title="Formas de pagamento"
        description="PIX, transferência, dinheiro e outras."
        items={draft.finance.paymentMethods}
        value={listInputs.paymentMethods ?? ""}
        placeholder="Nova forma"
        onValueChange={(value) =>
          setListInputs((current) => ({ ...current, paymentMethods: value }))
        }
        onAdd={() =>
          addListItem("paymentMethods", "finance", "paymentMethods", draft.finance.paymentMethods)
        }
        onRemove={(value) =>
          updateList(
            "finance",
            "paymentMethods",
            draft.finance.paymentMethods.filter((item) => item !== value),
          )
        }
      />
      <div className="settings-row-card">
        <div>
          <strong>Confirmar alterações críticas</strong>
          <p>Exige confirmação antes de cancelar ou corrigir valores.</p>
        </div>
        <Toggle
          checked={draft.finance.confirmCriticalChanges}
          onChange={() =>
            updateDraft((current) => ({
              ...current,
              finance: {
                ...current.finance,
                confirmCriticalChanges: !current.finance.confirmCriticalChanges,
              },
            }))
          }
          label="Confirmação financeira"
        />
      </div>
    </>
  );

  const renderQuotes = () => (
    <>
      <SectionHeading
        eyebrow="DOCUMENTOS"
        title="Orçamentos"
        description="Numeração, validade e identidade visual padrão."
      />
      <div className="settings-form-grid settings-control-block full">
        <label>
          Prefixo
          <input
            value={draft.quotes.prefix}
            maxLength={8}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                quotes: { ...current.quotes, prefix: event.target.value.toUpperCase() },
              }))
            }
          />
        </label>
        <label>
          Próximo número
          <input
            type="number"
            min="1"
            value={draft.quotes.nextNumber}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                quotes: { ...current.quotes, nextNumber: Number(event.target.value) },
              }))
            }
          />
        </label>
        <label>
          Validade padrão (dias)
          <input
            type="number"
            min="1"
            value={draft.quotes.validityDays}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                quotes: { ...current.quotes, validityDays: Number(event.target.value) },
              }))
            }
          />
        </label>
        <label>
          Identidade padrão
          <select
            value={draft.quotes.brandId}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                quotes: { ...current.quotes, brandId: event.target.value },
              }))
            }
          >
            {draft.brands.map((brand) => (
              <option value={brand.id} key={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Observações padrão
          <textarea
            value={draft.quotes.defaultNotes}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                quotes: { ...current.quotes, defaultNotes: event.target.value },
              }))
            }
          />
        </label>
      </div>
    </>
  );

  const renderContracts = () => (
    <>
      <SectionHeading
        eyebrow="DOCUMENTOS"
        title="Modelos de contrato"
        description="Arquivos PDF e DOCX sincronizados, visíveis no computador e no celular."
      />
      <label className="file-drop wide-drop">
        <strong>＋ Importar modelo</strong>
        <span>PDF ou DOCX · vários modelos permitidos</span>
        <input
          type="file"
          multiple
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => void addContractTemplates(event.target.files)}
        />
      </label>
      {draft.contractTemplates.length > 0 ? (
        <div className="template-list">
          {draft.contractTemplates.map((template) => (
            <article key={template.id}>
              <span className="file-type">
                {template.file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX"}
              </span>
              <div>
                <strong>{template.file.name}</strong>
                <small>{formatFileSize(template.file.size)} · salvo no Revelar.</small>
              </div>
              <select
                aria-label={`Categoria de ${template.file.name}`}
                value={template.category}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    contractTemplates: current.contractTemplates.map((item) =>
                      item.id === template.id
                        ? {
                            ...item,
                            category: event.target.value as ContractTemplateSettings["category"],
                          }
                        : item,
                    ),
                  }))
                }
              >
                {contractCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <select
                aria-label={`Identidade de ${template.file.name}`}
                value={template.brandId}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    contractTemplates: current.contractTemplates.map((item) =>
                      item.id === template.id ? { ...item, brandId: event.target.value } : item,
                    ),
                  }))
                }
              >
                {draft.brands.map((brand) => (
                  <option value={brand.id} key={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  updateDraft((current) => ({
                    ...current,
                    defaultContracts: {
                      ...current.defaultContracts,
                      [template.category]: template.id,
                    },
                  }))
                }
              >
                {draft.defaultContracts[template.category] === template.id
                  ? "Padrão"
                  : "Usar como padrão"}
              </button>
              <div className="template-file-actions">
                <button type="button" onClick={() => setPreviewTemplate(template.file)}>
                  Visualizar
                </button>
                <a href={fileDownloadUrl(template.file)} download={template.file.name}>
                  Baixar
                </a>
                <label className="template-replace-button">
                  Substituir
                  <input
                    hidden
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) => {
                      void replaceContractTemplate(template.id, event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
              <button
                type="button"
                className="icon-remove"
                aria-label={`Remover ${template.file.name}`}
                onClick={() => {
                  removeFileFromDraft(template.file);
                  updateDraft((current) => ({
                    ...current,
                    contractTemplates: current.contractTemplates.filter(
                      (item) => item.id !== template.id,
                    ),
                    defaultContracts: Object.fromEntries(
                      Object.entries(current.defaultContracts).filter(
                        ([, id]) => id !== template.id,
                      ),
                    ),
                  }));
                }}
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
      <div className="settings-row-card">
        <div>
          <strong>Preencher campos automaticamente</strong>
          <p>Cliente, documento, data, local, valor e tipo de trabalho.</p>
        </div>
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
      </div>
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

  const renderProducts = () => (
    <>
      <SectionHeading
        eyebrow="CATÁLOGO"
        title="Produtos"
        description="Padrões para produtos digitais, físicos e vagas mensais."
      />
      <div className="settings-form-grid settings-control-block full">
        <label>
          Disponibilidade padrão
          <select
            value={draft.products.defaultAvailability}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                products: {
                  ...current.products,
                  defaultAvailability: event.target
                    .value as ProfessionalSettings["products"]["defaultAvailability"],
                },
              }))
            }
          >
            <option value="unlimited">Ilimitado</option>
            <option value="stock">Estoque</option>
            <option value="capacity">Vagas / capacidade</option>
          </select>
        </label>
        <label>
          Entrega padrão
          <select
            value={draft.products.defaultDelivery}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                products: {
                  ...current.products,
                  defaultDelivery: event.target
                    .value as ProfessionalSettings["products"]["defaultDelivery"],
                },
              }))
            }
          >
            <option value="manual">Manual</option>
            <option value="file">Arquivo</option>
            <option value="link">Link</option>
          </select>
        </label>
        <label>
          Capacidade mensal
          <input
            type="number"
            min="0"
            value={draft.products.monthlyCapacity}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                products: { ...current.products, monthlyCapacity: Number(event.target.value) },
              }))
            }
          />
        </label>
        <label>
          Promoção padrão
          <select
            value={draft.products.promotionType}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                products: {
                  ...current.products,
                  promotionType: event.target
                    .value as ProfessionalSettings["products"]["promotionType"],
                },
              }))
            }
          >
            <option value="none">Sem promoção</option>
            <option value="fixed">Valor fixo</option>
            <option value="percent">Percentual</option>
          </select>
        </label>
      </div>
    </>
  );

  const renderAppearance = () => (
    <>
      <SectionHeading
        eyebrow="INTERFACE"
        title="Aparência"
        description="Escolha como o Revelar. aparece em cada dispositivo."
      />
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
      <div className="settings-row-card">
        <div>
          <strong>Tamanho da interface</strong>
          <p>Compacta, confortável ou ampliada.</p>
        </div>
        <div className="mini-segment">
          {(["compact", "comfortable", "large"] as const).map((size) => (
            <button
              type="button"
              key={size}
              className={draft.appearance.interfaceSize === size ? "active" : ""}
              onClick={() =>
                updateDraft((current) => ({
                  ...current,
                  appearance: { ...current.appearance, interfaceSize: size },
                }))
              }
            >
              {size === "compact" ? "A−" : size === "comfortable" ? "A" : "A＋"}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-row-card">
        <div>
          <strong>Contraste reforçado</strong>
          <p>Aumenta bordas e contraste dos textos.</p>
        </div>
        <Toggle
          checked={draft.appearance.highContrast}
          onChange={() =>
            updateDraft((current) => ({
              ...current,
              appearance: { ...current.appearance, highContrast: !current.appearance.highContrast },
            }))
          }
          label="Contraste reforçado"
        />
      </div>
    </>
  );

  const renderNotifications = () => (
    <>
      <SectionHeading
        eyebrow="AVISOS"
        title="Notificações"
        description="Escolha o que merece atenção e quando avisar."
      />
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
            disabled={!customReminder}
          >
            Adicionar
          </button>
        </div>
      </div>
    </>
  );

  const renderPrivacy = () => (
    <>
      <SectionHeading
        eyebrow="PRIVACIDADE"
        title="Consentimentos"
        description="Padrões locais de autorização e retenção de dados."
      />
      <div className="settings-row-card">
        <div>
          <strong>Exigir autorização de imagem</strong>
          <p>Adiciona a confirmação aos novos contratos.</p>
        </div>
        <Toggle
          checked={draft.privacy.imageConsentRequired}
          onChange={() =>
            updateDraft((current) => ({
              ...current,
              privacy: {
                ...current.privacy,
                imageConsentRequired: !current.privacy.imageConsentRequired,
              },
            }))
          }
          label="Autorização de imagem"
        />
      </div>
      <div className="settings-form-grid settings-control-block full">
        <label>
          Retenção padrão (meses)
          <input
            type="number"
            min="1"
            value={draft.privacy.retentionMonths}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                privacy: { ...current.privacy, retentionMonths: Number(event.target.value) },
              }))
            }
          />
        </label>
        <label>
          Aviso antes de excluir (dias)
          <input
            type="number"
            min="1"
            value={draft.privacy.deletionNoticeDays}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                privacy: { ...current.privacy, deletionNoticeDays: Number(event.target.value) },
              }))
            }
          />
        </label>
      </div>
      <DisabledSetting
        title="Solicitações do cliente"
        description="Exportar, corrigir ou excluir dados dependerá do cadastro definitivo no banco."
      />
    </>
  );

  const exportPreferences = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `revelar-configuracoes-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const renderFutureSection = () => {
    if (section === "team")
      return (
        <>
          <SectionHeading
            eyebrow="PESSOAS"
            title="Equipe"
            description="Acesso futuro para assistente, editor e fotógrafo."
          />
          <DisabledSetting
            title="Convidar por e-mail"
            description="Somente Maryana poderá enviar convites após o login e o banco."
          />
          <DisabledSetting
            title="Funções e permissões"
            description="Acesso por módulo e por ação será configurado no banco."
          />
          <DisabledSetting
            title="Histórico de atividade"
            description="Usuário, data e dispositivo serão registrados após a auditoria do banco."
          />
        </>
      );
    if (section === "security")
      return (
        <>
          <SectionHeading
            eyebrow="ACESSO"
            title="Segurança"
            description="Proteção da conta e dos dados do estúdio."
          />
          <DisabledSetting
            title="Senha e recuperação"
            description="Será liberado junto com o login seguro por e-mail e senha."
          />
          <DisabledSetting
            title="Dispositivos conectados"
            description="Sessões só existem depois da autenticação definitiva."
          />
          <DisabledSetting
            title="Autenticação em dois fatores"
            description="Preparada como opção futura, sem obrigar Maryana agora."
          />
        </>
      );
    if (section === "data")
      return (
        <>
          <SectionHeading
            eyebrow="DADOS"
            title="Sincronização e backup"
            description="Ações locais disponíveis agora e recursos definitivos claramente separados."
          />
          <div className="settings-row-card featured">
            <div>
              <strong>Exportar preferências locais</strong>
              <p>Baixa um JSON com as configurações deste dispositivo.</p>
            </div>
            <button type="button" onClick={exportPreferences}>
              Baixar JSON
            </button>
          </div>
          <DisabledSetting
            title="Backup automático diário"
            description="Manterá 30 dias de versões quando o banco estiver conectado."
          />
          <DisabledSetting
            title="Exportação completa em ZIP"
            description="Incluirá JSON, CSV, fotos e documentos armazenados no banco e no R2."
          />
          <DisabledSetting
            title="Lixeira por 30 dias"
            description="A recuperação definitiva depende das tabelas e do armazenamento real."
          />
          <DisabledSetting
            title="Conflitos offline"
            description="As duas versões serão comparadas depois da sincronização entre dispositivos."
          />
        </>
      );
    return (
      <>
        <SectionHeading
          eyebrow="CONEXÕES"
          title="Integrações"
          description="Serviços planejados, sem ações simuladas nesta fase."
        />
        <DisabledSetting
          title="WhatsApp Business"
          description="Conversas, anexos e vínculo com clientes exigem a integração oficial."
        />
        <DisabledSetting
          title="Inteligência artificial"
          description="Sugestões com aprovação serão conectadas após o banco."
        />
        <DisabledSetting
          title="Calendário"
          description="A sincronização externa será configurada em uma fase própria."
        />
      </>
    );
  };

  const renderContent = () => {
    if (section === "overview") return renderOverview();
    if (section === "account") return renderAccount();
    if (section === "brands") return renderBrands();
    if (section === "watermarks") return renderWatermarks();
    if (section === "work") return renderWork();
    if (section === "agenda") return renderAgenda();
    if (section === "galleries") return renderGalleries();
    if (section === "finance") return renderFinance();
    if (section === "quotes") return renderQuotes();
    if (section === "contracts") return renderContracts();
    if (section === "products") return renderProducts();
    if (section === "appearance") return renderAppearance();
    if (section === "notifications") return renderNotifications();
    if (section === "privacy") return renderPrivacy();
    return renderFutureSection();
  };

  return (
    <>
      <div
        className="modal-backdrop settings-backdrop"
        role="presentation"
        onMouseDown={requestClose}
      >
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
            <button
              type="button"
              className="settings-close"
              onClick={requestClose}
              aria-label="Fechar"
            >
              ×
            </button>
          </header>
          {fileNotice && (
            <div className="settings-inline-error" role="alert">
              {fileNotice}
            </div>
          )}
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
              {dirty ? "● Alterações ainda não salvas" : "✓ Tudo sincronizado no Revelar."}
            </span>
            <div>
              <button type="button" className="outline-button" onClick={requestClose}>
                Cancelar
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => void save()}
                disabled={!loaded || saving}
              >
                {saving ? "Salvando…" : "Salvar configurações"}
              </button>
            </div>
          </footer>
        </section>
      </div>
      <input
        ref={templateReplaceInput}
        hidden
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(event) => {
          if (replaceTemplateId)
            void replaceContractTemplate(replaceTemplateId, event.target.files?.[0]);
          event.target.value = "";
          setReplaceTemplateId(null);
        }}
      />
      {previewTemplate && (
        <FileViewer
          file={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onReplace={() => {
            const template = draft.contractTemplates.find(
              (item) => item.file.id === previewTemplate.id,
            );
            if (!template) return;
            setReplaceTemplateId(template.id);
            window.setTimeout(() => templateReplaceInput.current?.click(), 0);
          }}
          onDelete={() => {
            const template = draft.contractTemplates.find(
              (item) => item.file.id === previewTemplate.id,
            );
            if (!template) return;
            removeFileFromDraft(template.file);
            updateDraft((current) => ({
              ...current,
              contractTemplates: current.contractTemplates.filter(
                (item) => item.id !== template.id,
              ),
            }));
            setPreviewTemplate(null);
          }}
        />
      )}
    </>
  );
}
