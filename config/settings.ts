export type SettingsFileRef = {
  id: string;
  name: string;
  type: string;
  size: number;
};

export type BrandSettings = {
  id: string;
  name: string;
  use: string;
  initials: string;
  email: string;
  phone: string;
  instagram: string;
  site: string;
  address: string;
  document: string;
  logoLight?: SettingsFileRef;
  logoDark?: SettingsFileRef;
  logoMono?: SettingsFileRef;
  symbolLight?: SettingsFileRef;
  symbolDark?: SettingsFileRef;
  symbolMono?: SettingsFileRef;
  signature?: SettingsFileRef;
  signatureText: string;
};

export type WatermarkSettings = {
  id: string;
  name: string;
  file: SettingsFileRef;
};

export type ContractTemplateSettings = {
  id: string;
  file: SettingsFileRef;
  category: "Casamento" | "Ensaio" | "Evento" | "Editorial" | "Geral";
  brandId: string;
};

export type ProfessionalSettings = {
  profile: {
    name: string;
    email: string;
    phone: string;
    instagram: string;
    site: string;
    bio: string;
    avatar?: SettingsFileRef;
  };
  brands: BrandSettings[];
  activeBrandId: string;
  watermarks: WatermarkSettings[];
  selectedWatermarkId: string;
  watermarkMode: "corner" | "center" | "tile";
  watermarkCorner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  watermarkOpacity: number;
  watermarkSize: number;
  watermarkTargets: string[];
  watermarkPreview: boolean;
  watermarkDownload: boolean;
  contractTemplates: ContractTemplateSettings[];
  defaultContracts: Record<string, string>;
  automaticContractFields: boolean;
  work: {
    categories: string[];
    stages: string[];
    packages: string[];
  };
  agenda: {
    workDays: string[];
    startTime: string;
    endTime: string;
    breakStart: string;
    breakEnd: string;
    timezone: string;
    defaultReminderMinutes: number[];
  };
  galleries: {
    pinEnabled: boolean;
    validityDays: number;
    downloadsEnabled: boolean;
    selectionLimit: number;
    revisionLimit: number;
    extraPhotoPrice: number;
    defaultWatermarkId: string;
  };
  finance: {
    currencies: Array<"BRL" | "EUR">;
    defaultCurrency: "BRL" | "EUR";
    accounts: string[];
    categories: string[];
    paymentMethods: string[];
    confirmCriticalChanges: boolean;
  };
  quotes: {
    prefix: string;
    nextNumber: number;
    validityDays: number;
    defaultNotes: string;
    brandId: string;
  };
  products: {
    defaultAvailability: "unlimited" | "stock" | "capacity";
    defaultDelivery: "file" | "link" | "manual";
    monthlyCapacity: number;
    promotionType: "none" | "fixed" | "percent";
  };
  appearance: {
    interfaceSize: "compact" | "comfortable" | "large";
    highContrast: boolean;
  };
  privacy: {
    imageConsentRequired: boolean;
    retentionMonths: number;
    deletionNoticeDays: number;
  };
};

const initialBrands: BrandSettings[] = [
  {
    id: "mary-fotografia",
    name: "Mary Fotografia",
    use: "Casamentos e ensaios",
    initials: "M",
    email: "",
    phone: "",
    instagram: "@maryfotografiaa__",
    site: "",
    address: "",
    document: "",
    signatureText: "Maryana Ferreira",
  },
  {
    id: "mf-studio",
    name: "MF Studio",
    use: "Estúdio e editoriais",
    initials: "MF",
    email: "",
    phone: "",
    instagram: "@mfstudio.__",
    site: "",
    address: "",
    document: "",
    signatureText: "Maryana Ferreira",
  },
];

export const defaultProfessionalSettings: ProfessionalSettings = {
  profile: {
    name: "Maryana Ferreira",
    email: "",
    phone: "",
    instagram: "@maryfotografiaa__",
    site: "",
    bio: "Fotógrafa de casamentos, ensaios e histórias reais.",
  },
  brands: initialBrands,
  activeBrandId: "mary-fotografia",
  watermarks: [],
  selectedWatermarkId: "",
  watermarkMode: "corner",
  watermarkCorner: "bottom-right",
  watermarkOpacity: 42,
  watermarkSize: 28,
  watermarkTargets: ["Prévias", "Seleção"],
  watermarkPreview: true,
  watermarkDownload: false,
  contractTemplates: [],
  defaultContracts: {},
  automaticContractFields: true,
  work: {
    categories: [
      "Casamento",
      "Pré-wedding",
      "Ensaio pessoal",
      "Família",
      "Aniversário",
      "Editorial para loja",
      "Evento",
      "Estúdio",
    ],
    stages: [
      "Orçamento",
      "Contrato",
      "Pagamento 50%",
      "Preparação",
      "Sessão",
      "Seleção",
      "Edição",
      "Pagamento completo",
      "Entrega",
    ],
    packages: ["Essencial", "Completo"],
  },
  agenda: {
    workDays: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
    startTime: "09:00",
    endTime: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    timezone: "America/Recife",
    defaultReminderMinutes: [1440, 120, 30],
  },
  galleries: {
    pinEnabled: false,
    validityDays: 30,
    downloadsEnabled: true,
    selectionLimit: 30,
    revisionLimit: 1,
    extraPhotoPrice: 0,
    defaultWatermarkId: "",
  },
  finance: {
    currencies: ["BRL", "EUR"],
    defaultCurrency: "BRL",
    accounts: ["Caixa", "Banco"],
    categories: ["Ensaio", "Casamento", "Equipamento", "Transporte"],
    paymentMethods: ["PIX", "Transferência", "Dinheiro", "Cartão"],
    confirmCriticalChanges: true,
  },
  quotes: {
    prefix: "ORC",
    nextNumber: 1,
    validityDays: 15,
    defaultNotes: "Valores sujeitos à disponibilidade da data.",
    brandId: "mary-fotografia",
  },
  products: {
    defaultAvailability: "unlimited",
    defaultDelivery: "manual",
    monthlyCapacity: 4,
    promotionType: "none",
  },
  appearance: {
    interfaceSize: "comfortable",
    highContrast: false,
  },
  privacy: {
    imageConsentRequired: true,
    retentionMonths: 60,
    deletionNoticeDays: 30,
  },
};

export function normalizeProfessionalSettings(value: unknown): ProfessionalSettings {
  if (!value || typeof value !== "object") return structuredClone(defaultProfessionalSettings);
  const current = value as Partial<ProfessionalSettings> & {
    activeBrand?: string;
    watermarks?: Array<string | WatermarkSettings>;
    contractTemplates?: Array<string | ContractTemplateSettings>;
    defaultContract?: string;
  };
  const normalized = structuredClone(defaultProfessionalSettings);
  normalized.profile = { ...normalized.profile, ...(current.profile ?? {}) };
  const savedBrands = Array.isArray(current.brands) ? current.brands : [];
  normalized.brands = initialBrands.map((brand) => ({
    ...brand,
    ...(savedBrands.find((saved) => saved.id === brand.id) ?? {}),
  }));
  normalized.activeBrandId =
    normalized.brands.find((brand) => brand.id === current.activeBrandId)?.id ??
    normalized.brands.find((brand) => brand.name === current.activeBrand)?.id ??
    "mary-fotografia";
  normalized.watermarks = Array.isArray(current.watermarks)
    ? current.watermarks.filter((item): item is WatermarkSettings => typeof item !== "string")
    : [];
  normalized.selectedWatermarkId =
    current.selectedWatermarkId ?? normalized.watermarks[0]?.id ?? "";
  normalized.watermarkMode = current.watermarkMode ?? normalized.watermarkMode;
  normalized.watermarkCorner = current.watermarkCorner ?? normalized.watermarkCorner;
  normalized.watermarkOpacity = current.watermarkOpacity ?? normalized.watermarkOpacity;
  normalized.watermarkSize = current.watermarkSize ?? normalized.watermarkSize;
  normalized.watermarkTargets = current.watermarkTargets ?? normalized.watermarkTargets;
  normalized.watermarkPreview = current.watermarkPreview ?? normalized.watermarkPreview;
  normalized.watermarkDownload = current.watermarkDownload ?? normalized.watermarkDownload;
  normalized.contractTemplates = Array.isArray(current.contractTemplates)
    ? current.contractTemplates.filter(
        (item): item is ContractTemplateSettings => typeof item !== "string",
      )
    : [];
  normalized.defaultContracts = current.defaultContracts ?? normalized.defaultContracts;
  normalized.automaticContractFields =
    current.automaticContractFields ?? normalized.automaticContractFields;
  normalized.work = { ...normalized.work, ...(current.work ?? {}) };
  normalized.agenda = { ...normalized.agenda, ...(current.agenda ?? {}) };
  normalized.galleries = { ...normalized.galleries, ...(current.galleries ?? {}) };
  normalized.finance = { ...normalized.finance, ...(current.finance ?? {}) };
  normalized.quotes = { ...normalized.quotes, ...(current.quotes ?? {}) };
  normalized.products = { ...normalized.products, ...(current.products ?? {}) };
  normalized.appearance = { ...normalized.appearance, ...(current.appearance ?? {}) };
  normalized.privacy = { ...normalized.privacy, ...(current.privacy ?? {}) };
  return normalized;
}
