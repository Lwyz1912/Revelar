export type ThemeMode = "light" | "dark" | "system";
export type Palette = "essencia" | "terracota" | "rose" | "mono" | "lune";
export type Currency = "BRL" | "EUR";
export type ViewMode = "list" | "cards";
export type AppSection =
  | "Visão geral"
  | "Agenda"
  | "Clientes"
  | "Trabalhos"
  | "Galeria"
  | "Financeiro"
  | "Produtos"
  | "Orçamentos"
  | "Contratos"
  | "Locais";
export type AvailableSection = Exclude<AppSection, "Locais">;
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
  deliveryFile?: string;
  deliveryLink?: string;
  discountType: ProductDiscountType;
  discountValue: number;
  discountStart?: string;
  discountEnd?: string;
  status: "active" | "draft" | "archived";
  publicReady: boolean;
  sales: number;
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
};
export type Contract = {
  id: number;
  title: string;
  clientId?: number;
  quoteId?: number;
  status: ContractStatus;
  template: "standard" | "custom";
  templateFile?: string;
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
  attachments?: string[];
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
  photos: { captured: number; selected: number; edited: number; delivered: number };
  stages: WorkStage[];
  attachments: string[];
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
  hasPreview: boolean;
  hasOriginal: boolean;
  hasHigh: boolean;
  hasSocial: boolean;
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
  workId: number;
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
