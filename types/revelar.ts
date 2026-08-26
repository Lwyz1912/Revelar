export type ThemeMode = "light" | "dark" | "system";
export type Palette = "essencia" | "terracota" | "rose" | "mono" | "lune";
export type Currency = "BRL" | "EUR";
export type ViewMode = "list" | "cards";
export type AppFileRef = {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt?: string;
  storage?: "cloud" | "local";
};
export type AppSection =
  | "Visão geral"
  | "Agenda"
  | "Clientes"
  | "Trabalhos"
  | "Galeria"
  | "Presets e edição"
  | "Financeiro"
  | "Produtos"
  | "Orçamentos"
  | "Locais"
  | "Diário"
  | "WhatsApp e IA";
export type AvailableSection = AppSection;

export type EditingAdjustments = {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  temperature: number;
  tint: number;
  saturation: number;
  fade: number;
  grain: number;
  vignette: number;
  halation: number;
  chromatic: number;
  dust: number;
  lightLeak: number;
  softness: number;
  motionTrail: number;
  coolShadows: number;
  warmHighlights: number;
  xmp?: XmpColorRecipe;
};

export type XmpColorRecipe = {
  whites: number;
  blacks: number;
  vibrance: number;
  clarity: number;
  dehaze: number;
  texture: number;
  grayscale: boolean;
  hue: number[];
  colorSaturation: number[];
  luminance: number[];
  toneCurve: Array<[number, number]>;
  redCurve: Array<[number, number]>;
  greenCurve: Array<[number, number]>;
  blueCurve: Array<[number, number]>;
  shadowHue: number;
  shadowSaturation: number;
  shadowLuminance: number;
  midtoneHue: number;
  midtoneSaturation: number;
  midtoneLuminance: number;
  highlightHue: number;
  highlightSaturation: number;
  highlightLuminance: number;
  balance: number;
  blending: number;
  grainSize: number;
  grainFrequency: number;
  vignetteMidpoint: number;
  vignetteFeather: number;
  vignetteRoundness: number;
  sharpness: number;
  sharpenRadius: number;
  sharpenDetail: number;
  sharpenMasking: number;
  luminanceNoiseReduction: number;
  colorNoiseReduction: number;
  shadowTint: number;
  absoluteWhiteBalance: boolean;
};

export type EditingPreset = {
  id: string;
  name: string;
  camera: string;
  description: string;
  adjustments: EditingAdjustments;
  builtIn: boolean;
  source?: "xmp" | "dng" | "custom";
  category?: string;
  collection?: "2shoot" | "imported";
  compatibility?: "full" | "partial";
  compatibilityNotes?: string[];
};

export type EditingAlbum = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
};

export type EditingPhoto = {
  id: string;
  albumId: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  previewUrl: string;
  originalUrl: string;
  editedUrl?: string;
  presetId?: string;
  adjustments: EditingAdjustments;
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
};
export type ClientType = "person" | "company";
export type WorkStatus =
  | "planning"
  | "scheduled"
  | "editing"
  | "delivery"
  | "completed"
  | "archived"
  | "cancelled";
export type WorkCategory =
  | "Casamento"
  | "Pré-wedding"
  | "Ensaio pessoal"
  | "Família"
  | "Aniversário"
  | "Editorial para loja"
  | "Evento"
  | "Estúdio";
export type FinanceScope = "professional" | "personal";
export type TransactionType = "income" | "expense" | "transfer";
export type TransactionStatus = "paid" | "received" | "pending" | "late";
export type QuoteStatus = "draft" | "sent" | "approved" | "declined";
export type ContractStatus = "draft" | "sent" | "waiting" | "signed" | "cancelled";
export type ProductKind = "course" | "pdf" | "preset" | "photo" | "album" | "package";
export type ProductPriceType = "fixed" | "from" | "consult";
export type ProductAvailability = "unlimited" | "stock" | "capacity";
export type ProductDiscountType = "none" | "fixed" | "percent";
export type ProductStatus = "active" | "draft" | "hidden" | "archived" | "deleted";
export type ProductBadge = "Novo" | "Promoção" | "Últimas unidades" | "Destaque";
export type NotificationKind =
  | "deadline"
  | "work"
  | "stage"
  | "payment"
  | "contract"
  | "gallery"
  | "birthday"
  | "important-date";
export type NotificationPriority = "normal" | "important" | "urgent";
export type AchievementTier = "Bronze" | "Prata" | "Ouro" | "Platina" | "Diamante";
export type AchievementCategory =
  | "Clientes"
  | "Trabalhos"
  | "Casamentos"
  | "Prazos"
  | "Financeiro"
  | "Galerias"
  | "Criatividade"
  | "Organização"
  | "Locais"
  | "Marcos especiais";
export type AchievementUnlock = {
  id: string;
  unlockedAt: string;
  retroactive: boolean;
};

export type ProductOptionValue = { id: string; label: string; priceDelta: number };
export type ProductOption = { id: string; name: string; values: ProductOptionValue[] };
export type Product = {
  id: number;
  name: string;
  kind: ProductKind;
  description: string;
  currency: Currency;
  priceType: ProductPriceType;
  basePrice: number;
  options: ProductOption[];
  availability: ProductAvailability;
  availableQuantity?: number;
  availabilityLabel?: string;
  deliveryType: "manual" | "file" | "link";
  deliveryFile?: string | AppFileRef;
  deliveryLink?: string;
  discountType: ProductDiscountType;
  discountValue: number;
  discountStart?: string;
  discountEnd?: string;
  status: ProductStatus;
  publicReady: boolean;
  sku?: string;
  badges?: ProductBadge[];
  coverFile?: AppFileRef;
  galleryFiles?: AppFileRef[];
  hideWhenSoldOut?: boolean;
  allowBackorder?: boolean;
  deletedAt?: string;
  sales: number;
};

export type StoreSettings = {
  enabled: boolean;
  title: string;
  description: string;
  whatsapp: string;
};

export type StoreOrderStatus = "new" | "confirmed" | "completed" | "cancelled";

export type StoreOrder = {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  note: string;
  items: Array<{
    productId: number;
    name: string;
    quantity: number;
    options: string[];
    unitPrice: number;
    currency: Currency;
  }>;
  totals: Partial<Record<Currency, number>>;
  status: StoreOrderStatus;
  createdAt: string;
};

export type WorkCost = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  amount: number;
  status: "planned" | "paid";
  date: string;
};

export type WorkIncome = {
  id: string;
  name: string;
  category: "Pagamento" | "Gorjeta" | "Adicional" | "Reembolso" | "Outro";
  tags: string[];
  amount: number;
  status: "pending" | "received";
  date: string;
  countsTowardContract: boolean;
};

export type ChecklistTemplate = {
  id: string;
  name: string;
  items: Array<{ id: string; label: string }>;
};

export type FinanceTransaction = {
  id: string;
  type: TransactionType;
  scope: FinanceScope;
  description: string;
  amount: number;
  currency: Currency;
  date: string;
  category: string;
  tags: string[];
  account: string;
  destinationAccount?: string;
  paymentMethod: string;
  status: TransactionStatus;
  workId?: number;
  origin: string;
};

export type QuoteItem = {
  id: string;
  kind: "service" | "photo" | "course" | "pdf" | "preset" | "extra";
  description: string;
  quantity: number;
  unitPrice: number;
  productId?: number;
  options?: string[];
};
export type Quote = {
  id: number;
  title: string;
  clientId?: number;
  currency: Currency;
  items: QuoteItem[];
  discount: number;
  validUntil: string;
  notes: string;
  status: QuoteStatus;
  declinedAt?: string;
  trashedAt?: string;
  workId?: number;
  approvedSnapshot?: {
    approvedAt: string;
    title: string;
    currency: Currency;
    items: QuoteItem[];
    discount: number;
    total: number;
  };
};
export type Contract = {
  id: number;
  title: string;
  clientId?: number;
  quoteId?: number;
  status: ContractStatus;
  template: "standard" | "custom";
  templateFile?: string | AppFileRef;
  content: string;
  updatedAt: string;
};

export type Client = {
  id: number;
  type: ClientType;
  name: string;
  whatsapp: string;
  instagram: string;
  email: string;
  avatar?: string;
  workCount: number;
  lastWork: string;
  nextDate?: string;
  nextDateLabel?: string;
  tag: string;
  birthday?: string;
  weddingDate?: string;
  otherDateLabel?: string;
  otherDate?: string;
  notes?: string;
  archived?: boolean;
  createdAt?: string;
};

export type NewClientData = {
  type: ClientType;
  name: string;
  whatsapp: string;
  instagram: string;
  email: string;
  birthday: string;
  weddingDate: string;
  otherDateLabel: string;
  otherDate: string;
  notes: string;
  avatar?: string;
};

export type WorkStage = {
  id: string;
  label: string;
  done: boolean;
  dueDate?: string;
  responsible?: string;
  notes?: string;
  checklist?: Array<{ id: string; label: string; done: boolean }>;
  attachments?: Array<string | AppFileRef>;
  custom?: boolean;
};

export type Work = {
  id: number;
  title: string;
  category: WorkCategory;
  clientIds: number[];
  status: WorkStatus;
  date: string;
  time: string;
  duration: string;
  location: string;
  team: string[];
  deliveryDate: string;
  packageName: string;
  currency: Currency;
  totalValue: number;
  entryValue: number;
  installments: number;
  costs: number;
  costItems?: WorkCost[];
  incomeItems?: WorkIncome[];
  photos: { captured: number; selected: number; edited: number; delivered: number };
  stages: WorkStage[];
  attachments: Array<string | AppFileRef>;
  moodboard?: WorkMoodboard;
  sourceQuoteId?: number;
  contract?: WorkContract;
};

export type WorkContractStatus = "not_required" | "pending" | "sent" | "signed";

export type WorkContract = {
  status: WorkContractStatus;
  title: string;
  content: string;
  updatedAt: string;
  file?: AppFileRef;
};

export type MoodboardReference = {
  id: string;
  kind: "image" | "link" | "pose" | "lighting" | "equipment";
  title: string;
  value: string;
  notes?: string;
  file?: AppFileRef;
};

export type WorkMoodboard = {
  style: string;
  palette: string[];
  notes: string;
  shotList: Array<{ id: string; label: string; done: boolean }>;
  references: MoodboardReference[];
};

export type PhotoLocation = {
  id: string;
  name: string;
  city: string;
  country: "Portugal" | "Brasil";
  latitude: number;
  longitude: number;
  contact: string;
  price: string;
  parking: string;
  accessibility: string;
  bestTime: string;
  notes: string;
  cover: string;
  workIds: number[];
};

export type DiaryEntry = {
  id: string;
  title: string;
  body: string;
  date: string;
  mood: "inspirada" | "orgulhosa" | "tranquila" | "aprendizado";
  clientId?: number;
  workId?: number;
};

export type NewWorkData = Omit<Work, "id" | "status">;

export type GalleryPhase = "selection" | "approval" | "delivery";
export type GalleryFolder = "preview" | "selection" | "edited" | "delivered" | "originals";
export type GalleryStorageMode = "smart" | "backup";

export type GalleryPhoto = {
  id: string;
  folder: GalleryFolder;
  filename: string;
  mimeType: string;
  size: number;
  selected: boolean;
  approved: boolean;
  comment: string;
  internalNote: string;
  caption: string;
  tags: string[];
  rating: number;
  editingPhotoId?: string;
  comments: GalleryComment[];
  deletedAt?: string;
  hasPreview: boolean;
  hasOriginal: boolean;
  hasHigh: boolean;
  hasSocial: boolean;
};

export type GalleryComment = {
  id: string;
  authorRole: "client" | "photographer";
  authorName: string;
  message: string;
  createdAt: string;
};

export type GalleryAsset = {
  id: string;
  kind: "high_zip" | "social_zip" | "watermark";
  filename: string;
  size: number;
};

export type GalleryEvent = {
  id: string;
  eventType: string;
  detail: string;
  createdAt: string;
};

export type WorkGallery = {
  id: string;
  workId?: number;
  name: string;
  description: string;
  albumDate?: string;
  workTitle: string;
  clientName: string;
  slug: string;
  url: string;
  hasPin: boolean;
  expiresAt?: string;
  phase: GalleryPhase;
  selectionLimit: number;
  extraPriceCents: number;
  currency: Currency;
  selectionLocked: boolean;
  revisionLimit: number;
  revisionRound: number;
  watermarkLabel: string;
  storageMode: GalleryStorageMode;
  photos: GalleryPhoto[];
  assets: GalleryAsset[];
  events: GalleryEvent[];
  stats: {
    captured: number;
    selected: number;
    edited: number;
    delivered: number;
    totalBytes: number;
    extraCount: number;
    extraAmount: number;
  };
};

export type AgendaViewMode = "month" | "week" | "day" | "list";
export type AgendaEventKind =
  | "session"
  | "deadline"
  | "payment"
  | "delivery"
  | "stage"
  | "meeting"
  | "personal"
  | "blocked";
export type AgendaEventStatus = "normal" | "soon" | "late" | "completed";
export type EventRecurrence = "none" | "weekly" | "monthly";
export type EventTimezone = "America/Recife" | "Europe/Lisbon";

export type AgendaEvent = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  allDay?: boolean;
  kind: AgendaEventKind;
  status: AgendaEventStatus;
  clientId?: number;
  workId?: number;
  location?: string;
  notes?: string;
  timezone: EventTimezone;
  recurrence: EventRecurrence;
  reminder: string;
  external?: boolean;
  source: "work" | "custom";
};

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  createdAt: string;
  dueAt?: string;
  read: boolean;
  snoozedUntil?: string;
  priority: NotificationPriority;
  clientId?: number;
  workId?: number;
  actionLabel?: string;
};

export type NotificationPreferences = {
  browserEnabled: boolean;
  reminderDays: number[];
  categories: Record<NotificationKind, boolean>;
};

export type Automation = {
  id: string;
  title: string;
  description: string;
  trigger: string;
  action: string;
  enabled: boolean;
  requiresConfirmation: boolean;
  lastRun?: string;
  runs: number;
};
