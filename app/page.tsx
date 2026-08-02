"use client";

import { ChangeEvent, Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useRef, useState } from "react";

type ThemeMode = "light" | "dark" | "system";
type Palette = "essencia" | "terracota" | "rose" | "mono" | "lune";
type Currency = "BRL" | "EUR";
type ViewMode = "list" | "cards";
type ClientType = "person" | "company";
type WorkStatus = "planning" | "scheduled" | "editing" | "delivery" | "completed" | "archived" | "cancelled";
type WorkCategory = "Casamento" | "Pré-wedding" | "Ensaio pessoal" | "Família" | "Aniversário" | "Editorial para loja" | "Evento" | "Estúdio";

type Client = {
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
};

type NewClientData = {
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

type WorkStage = {
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

type Work = {
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
  photos: { captured: number; selected: number; edited: number; delivered: number };
  stages: WorkStage[];
  attachments: string[];
};

type NewWorkData = Omit<Work, "id" | "status">;

type AgendaViewMode = "month" | "week" | "day" | "list";
type AgendaEventKind = "session" | "deadline" | "payment" | "delivery" | "stage" | "meeting" | "personal" | "blocked";
type AgendaEventStatus = "normal" | "soon" | "late" | "completed";
type EventRecurrence = "none" | "weekly" | "monthly";
type EventTimezone = "America/Recife" | "Europe/Lisbon";

type AgendaEvent = {
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

const navItems = [
  { icon: "⌂", label: "Visão geral" },
  { icon: "□", label: "Agenda" },
  { icon: "♙", label: "Clientes" },
  { icon: "▱", label: "Trabalhos" },
  { icon: "◇", label: "Financeiro" },
  { icon: "⌖", label: "Locais" },
];

const palettes: Array<{ id: Palette; name: string; colors: string[] }> = [
  { id: "essencia", name: "Essência", colors: ["#173f2a", "#c99852", "#f6f1e7"] },
  { id: "terracota", name: "Terracota", colors: ["#702f2b", "#c47047", "#f7eee6"] },
  { id: "rose", name: "Rosé", colors: ["#75414b", "#c7908f", "#f8eff0"] },
  { id: "mono", name: "Monocromático", colors: ["#171717", "#7a7a7a", "#f3f3f3"] },
  { id: "lune", name: "Lunê", colors: ["#294796", "#d3a349", "#f7f0df"] },
];

const dashboardJobs = [
  { name: "Casamento · Amanda e João", progress: 44, edited: 140, total: 320, due: "12 ago" },
  { name: "Editorial · Loja Aurora", progress: 100, edited: 80, total: 80, due: "Hoje" },
  { name: "Família · Renata", progress: 55, edited: 66, total: 120, due: "15 ago" },
];

const appointments = [
  { day: "01", month: "AGO", title: "Ensaio de aniversário", meta: "15:30 · MF Studio", color: "gold" },
  { day: "03", month: "AGO", title: "Reunião pré-casamento", meta: "19:00 · Videochamada", color: "green" },
  { day: "08", month: "AGO", title: "Editorial Loja Aurora", meta: "09:00 · MF Studio", color: "rose" },
];

const initialClients: Client[] = [
  {
    id: 1,
    type: "person",
    name: "Camila Almeida",
    whatsapp: "+55 81 99912-4087",
    instagram: "@camilaalmeida",
    email: "camila.almeida@email.com",
    workCount: 2,
    lastWork: "Ensaio de aniversário · hoje",
    nextDate: "24 ago",
    nextDateLabel: "Aniversário",
    tag: "Recorrente",
  },
  {
    id: 2,
    type: "company",
    name: "Loja Aurora",
    whatsapp: "+55 81 99830-1122",
    instagram: "@lojaaurora",
    email: "contato@lojaaurora.com",
    workCount: 4,
    lastWork: "Editorial de inverno · 22 jul",
    nextDate: "08 ago",
    nextDateLabel: "Novo editorial",
    tag: "Empresa",
  },
  {
    id: 3,
    type: "person",
    name: "Amanda e João",
    whatsapp: "+55 81 99144-7306",
    instagram: "@amanda.ribeiro",
    email: "amanda.ribeiro@email.com",
    workCount: 1,
    lastWork: "Casamento · 18 jul",
    nextDate: "18 jul 2027",
    nextDateLabel: "Aniversário de casamento",
    tag: "Casamento",
  },
  {
    id: 4,
    type: "person",
    name: "Renata Barbosa",
    whatsapp: "+55 81 99621-8830",
    instagram: "@renatabarbosa",
    email: "renata.b@email.com",
    workCount: 3,
    lastWork: "Ensaio em família · 12 jul",
    nextDate: "03 set",
    nextDateLabel: "Aniversário infantil",
    tag: "Família",
  },
  {
    id: 5,
    type: "company",
    name: "Lunê Teen",
    whatsapp: "+55 81 99762-5411",
    instagram: "@luneteen",
    email: "contato@luneteen.com",
    workCount: 2,
    lastWork: "Coleção editorial · 28 jun",
    tag: "Empresa",
  },
];

const defaultStages = ["Orçamento", "Contrato", "Pagamento dos 50%", "Preparação", "Sessão", "Seleção", "Edição", "Pagamento completo", "Entrega"];

function stageChecklist(label: string, id: string) {
  const items: Record<string, string[]> = {
    Orçamento: ["Definir pacote", "Enviar orçamento ao cliente"],
    Contrato: ["Revisar dados", "Receber assinatura"],
    "Pagamento dos 50%": ["Conferir comprovante", "Confirmar recebimento"],
    Preparação: ["Alinhar referências", "Confirmar local e horário"],
    Sessão: ["Revisar equipamentos", "Realizar sessão"],
    Seleção: ["Enviar galeria", "Receber escolhas"],
    Edição: ["Editar seleção", "Revisar exportação"],
    "Pagamento completo": ["Conferir saldo", "Confirmar quitação"],
    Entrega: ["Preparar galeria final", "Enviar ao cliente"],
  };
  return (items[label] || ["Concluir tarefa"]).map((item, index) => ({ id: `${id}-check-${index}`, label: item, done: false }));
}

function createStages(prefix: string, doneCount = 0): WorkStage[] {
  return defaultStages.map((label, index) => ({
    id: `${prefix}-${index}`,
    label,
    done: index < doneCount,
    responsible: "Maryana",
    checklist: stageChecklist(label, `${prefix}-${index}`).map((item) => ({ ...item, done: index < doneCount })),
    attachments: [],
  }));
}

const initialWorks: Work[] = [
  {
    id: 1,
    title: "Casamento Amanda e João",
    category: "Casamento",
    clientIds: [3],
    status: "editing",
    date: "2026-07-18",
    time: "14:00",
    duration: "8h",
    location: "Villa Jardim, Caruaru",
    team: ["Maryana", "Lucas · assistente"],
    deliveryDate: "2026-08-12",
    packageName: "Memórias completas",
    currency: "BRL",
    totalValue: 4800,
    entryValue: 2400,
    installments: 2,
    costs: 780,
    photos: { captured: 1240, selected: 320, edited: 140, delivered: 0 },
    stages: createStages("w1", 6),
    attachments: ["contrato-assinado.pdf", "comprovante-entrada.pdf", "moodboard.pdf"],
  },
  {
    id: 2,
    title: "Editorial coleção Aurora",
    category: "Editorial para loja",
    clientIds: [2],
    status: "delivery",
    date: "2026-07-22",
    time: "09:00",
    duration: "4h",
    location: "MF Studio",
    team: ["Maryana", "Bianca · styling"],
    deliveryDate: "2026-08-01",
    packageName: "Editorial 80 fotos",
    currency: "BRL",
    totalValue: 1500,
    entryValue: 750,
    installments: 2,
    costs: 220,
    photos: { captured: 540, selected: 80, edited: 80, delivered: 0 },
    stages: createStages("w2", 7),
    attachments: ["referencias-colecao.pdf"],
  },
  {
    id: 3,
    title: "Aniversário de Camila",
    category: "Aniversário",
    clientIds: [1],
    status: "scheduled",
    date: "2026-08-01",
    time: "15:30",
    duration: "2h",
    location: "MF Studio",
    team: ["Maryana"],
    deliveryDate: "2026-08-10",
    packageName: "Ensaio Essencial",
    currency: "BRL",
    totalValue: 650,
    entryValue: 325,
    installments: 2,
    costs: 80,
    photos: { captured: 0, selected: 0, edited: 0, delivered: 0 },
    stages: createStages("w3", 4),
    attachments: ["referencias-camila.jpg"],
  },
  {
    id: 4,
    title: "Família Barbosa",
    category: "Família",
    clientIds: [4],
    status: "editing",
    date: "2026-07-12",
    time: "16:00",
    duration: "2h30",
    location: "Parque das Rendeiras",
    team: ["Maryana"],
    deliveryDate: "2026-08-15",
    packageName: "Família completa",
    currency: "BRL",
    totalValue: 900,
    entryValue: 450,
    installments: 2,
    costs: 95,
    photos: { captured: 410, selected: 120, edited: 66, delivered: 0 },
    stages: createStages("w4", 6),
    attachments: [],
  },
  {
    id: 5,
    title: "Pré-wedding Clara e Miguel",
    category: "Pré-wedding",
    clientIds: [1, 3],
    status: "planning",
    date: "2026-08-19",
    time: "16:30",
    duration: "3h",
    location: "A definir",
    team: ["Maryana"],
    deliveryDate: "2026-08-30",
    packageName: "Pré-wedding externo",
    currency: "EUR",
    totalValue: 420,
    entryValue: 120,
    installments: 3,
    costs: 60,
    photos: { captured: 0, selected: 0, edited: 0, delivered: 0 },
    stages: createStages("w5", 2),
    attachments: ["inspiracoes.pdf"],
  },
];

const initialAgendaEvents: AgendaEvent[] = [
  { id: "event-meeting-1", title: "Reunião pré-casamento", date: "2026-08-03", start: "19:00", end: "20:00", kind: "meeting", status: "soon", clientId: 3, workId: 1, location: "Videochamada", timezone: "America/Recife", recurrence: "none", reminder: "2 horas antes", notes: "Confirmar cronograma e lista de fotos em família.", source: "custom" },
  { id: "event-personal-1", title: "Bloqueio pessoal", date: "2026-08-05", start: "12:00", end: "14:00", kind: "blocked", status: "normal", timezone: "America/Recife", recurrence: "none", reminder: "30 minutos antes", notes: "Horário indisponível para novos trabalhos.", source: "custom" },
  { id: "event-editorial-1", title: "Editorial Loja Aurora", date: "2026-08-08", start: "09:00", end: "13:00", kind: "session", status: "normal", clientId: 2, workId: 2, location: "MF Studio", timezone: "America/Recife", recurrence: "none", reminder: "1 dia antes", notes: "Coleção de primavera · fundo bege e luz suave.", source: "custom" },
  { id: "event-admin-1", title: "Organização semanal do estúdio", date: "2026-08-04", start: "08:30", end: "09:00", kind: "meeting", status: "normal", location: "MF Studio", timezone: "America/Recife", recurrence: "weekly", reminder: "30 minutos antes", notes: "Revisar agenda, entregas e pagamentos da semana.", source: "custom" },
];

const emptyClient: NewClientData = {
  type: "person",
  name: "",
  whatsapp: "",
  instagram: "",
  email: "",
  birthday: "",
  weddingDate: "",
  otherDateLabel: "",
  otherDate: "",
  notes: "",
};

function useResolvedTheme(mode: ThemeMode) {
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return mode === "system" ? (systemDark ? "dark" : "light") : mode;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatMoney(value: number, currency: Currency) {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "pt-PT", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  if (!value) return "A definir";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)).replace(".", "");
}

function shiftDate(value: string, days: number) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function inferredStageDate(work: Work, index: number) {
  const offsets = [-45, -30, -21, -7, 0, 2];
  if (index < offsets.length) return shiftDate(work.date, offsets[index]);
  if (index === 6) return shiftDate(work.deliveryDate, -5);
  if (index === 7) return shiftDate(work.deliveryDate, -1);
  return work.deliveryDate;
}

function agendaDateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", options || { weekday: "long", day: "2-digit", month: "long" }).format(new Date(`${value}T12:00:00`));
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function calendarDays(value: string) {
  const first = new Date(`${monthStart(value)}T12:00:00`);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

function startOfWeek(value: string) {
  const day = new Date(`${value}T12:00:00`);
  day.setDate(day.getDate() - day.getDay());
  return day.toISOString().slice(0, 10);
}

function endTime(start: string, duration = "2h") {
  const [hours, minutes] = start.split(":").map(Number);
  const durationHours = Number(duration.match(/[\d,.]+/)?.[0]?.replace(",", ".")) || 2;
  const total = hours * 60 + minutes + Math.round(durationHours * 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function statusForDate(date: string, completed = false): AgendaEventStatus {
  if (completed) return "completed";
  const today = "2026-08-02";
  if (date < today) return "late";
  if (date <= addDays(today, 3)) return "soon";
  return "normal";
}

const agendaKindLabels: Record<AgendaEventKind, string> = {
  session: "Sessão",
  deadline: "Prazo",
  payment: "Pagamento",
  delivery: "Entrega",
  stage: "Etapa",
  meeting: "Reunião",
  personal: "Pessoal",
  blocked: "Indisponível",
};

function workProgress(work: Work) {
  const done = work.stages.filter((stage) => stage.done).length;
  return work.stages.length ? Math.round((done / work.stages.length) * 100) : 0;
}

function namesForClients(ids: number[], clients: Client[]) {
  return ids.map((id) => clients.find((client) => client.id === id)?.name).filter(Boolean).join(" + ");
}

const statusLabels: Record<WorkStatus, string> = {
  planning: "Planejamento",
  scheduled: "Agendado",
  editing: "Em edição",
  delivery: "Pronto para entrega",
  completed: "Concluído",
  archived: "Arquivado",
  cancelled: "Cancelado",
};

function Dashboard({ money, works, navigate, toast, onNewWork }: { money: { pending: string; month: string }; works: Work[]; navigate: (label: string) => void; toast: (message: string) => void; onNewWork: () => void }) {
  const urgentDeliveries = works.filter((work) => work.status !== "completed" && work.deliveryDate <= "2026-08-12");
  return (
    <div className="dashboard">
      <section className="welcome-row">
        <div>
          <p>SÁBADO, 1 DE AGOSTO</p>
          <h1>Boa tarde, Maryana</h1>
          <span>Aqui está um resumo do seu estúdio hoje.</span>
        </div>
        <button className="primary-button desktop-new" type="button" onClick={onNewWork}>＋ Novo trabalho</button>
      </section>

      <section className="metrics" aria-label="Resumo do estúdio">
        <article className="metric-card"><span className="metric-icon green">▣</span><div><p>ENSAIOS HOJE</p><strong>2</strong><small>Próximo às 15:30</small></div></article>
        <article className="metric-card"><span className="metric-icon gold">◫</span><div><p>FOTOS PARA EDITAR</p><strong>286</strong><small>Em 3 trabalhos</small></div></article>
        <article className="metric-card"><span className="metric-icon rose">⌛</span><div><p>ENTREGAS PENDENTES</p><strong>{works.filter((work) => work.status !== "completed").length}</strong><small>{urgentDeliveries.length} exigem atenção</small></div></article>
        <article className="metric-card"><span className="metric-icon green">＄</span><div><p>A RECEBER</p><strong>{money.pending}</strong><small>3 pagamentos</small></div></article>
      </section>

      <section className="dashboard-grid first-grid">
        <article className="card next-job">
          <div className="card-heading">
            <div><p>PRÓXIMO TRABALHO</p><h2>Ensaio de aniversário — Camila</h2><span>Hoje, 15:30 · MF Studio</span></div>
            <button className="outline-button" type="button" onClick={() => toast("Abrindo detalhes do ensaio")}>Ver detalhes <b>›</b></button>
          </div>
          <div className="job-facts">
            <div><span>◉</span><p>Pagamento<strong>50% recebido</strong></p></div>
            <div><span>▤</span><p>Cronograma<strong>5 etapas</strong></p></div>
            <div><span>♧</span><p>Moodboard<strong>12 referências</strong></p></div>
          </div>
          <div className="progress-title"><span>Preparação do trabalho</span><strong>75%</strong></div>
          <div className="progress"><i style={{ width: "75%" }} /></div>
          <p className="ready-note"><span>✓</span> Quase tudo pronto para o ensaio!</p>
        </article>

        <article className="card weather">
          <div className="weather-top"><div><p>CONDIÇÕES DE HOJE</p><h2>Caruaru, PE</h2></div><span>☀</span></div>
          <div className="temperature"><strong>26°</strong><span>Parcialmente nublado<small>Sensação de 27°</small></span></div>
          <div className="weather-facts">
            <div><span>↘</span><p>Pôr do sol<strong>17:28</strong></p></div>
            <div><span>☂</span><p>Chuva<strong>18%</strong></p></div>
          </div>
          <p className="weather-note">Luz suave prevista para o fim da tarde.</p>
        </article>
      </section>

      <section className="dashboard-grid second-grid">
        <article className="card editing-flow">
          <div className="card-heading compact"><div><p>FLUXO DE EDIÇÃO</p><h2>Trabalhos em andamento</h2></div><button className="text-button" type="button" onClick={() => navigate("Trabalhos")}>Ver todos ›</button></div>
          <div className="jobs-list">
            {dashboardJobs.map((job) => (
              <div className="job-row" key={job.name}>
                <div className="progress-title"><span>{job.name}</span><strong>{job.edited}/{job.total}</strong></div>
                <div className="progress"><i style={{ width: `${job.progress}%` }} /></div>
                <small>{job.progress === 100 ? "Pronto para entrega" : `Entrega: ${job.due}`}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="card agenda-card">
          <div className="card-heading compact"><div><p>AGENDA PRÓXIMA</p><h2>Próximos compromissos</h2></div><button className="text-button" type="button" onClick={() => navigate("Agenda")}>Calendário ›</button></div>
          <div className="appointment-list">
            {appointments.map((item) => (
              <button type="button" key={item.day} onClick={() => toast(item.title)}>
                <span className={`date-box ${item.color}`}><small>{item.month}</small><strong>{item.day}</strong></span>
                <span><strong>{item.title}</strong><small>{item.meta}</small></span><b>›</b>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="card deadline-alerts">
        <div className="card-heading compact"><div><p>PRAZOS IMPORTANTES</p><h2>Entregas no calendário</h2></div><button className="text-button" type="button" onClick={() => navigate("Agenda")}>Abrir calendário ›</button></div>
        <div className="deadline-alert-list">
          {urgentDeliveries.slice(0, 3).map((work) => (
            <button type="button" key={work.id} onClick={() => navigate("Trabalhos")}>
              <span className={`deadline-dot ${work.deliveryDate <= "2026-08-01" ? "late" : "soon"}`} />
              <span><strong>{work.title}</strong><small>{work.deliveryDate <= "2026-08-01" ? "Entrega hoje" : `Entrega em ${formatDate(work.deliveryDate)}`}</small></span>
              <b>›</b>
            </button>
          ))}
        </div>
      </section>

      <section className="card financial-strip">
        <div><p>FATURAMENTO DO MÊS</p><strong>{money.month}</strong><small>↑ 18% comparado a julho</small></div>
        <div className="mini-bars" aria-label="Evolução do faturamento"><i style={{ height: "32%" }} /><i style={{ height: "48%" }} /><i style={{ height: "39%" }} /><i style={{ height: "64%" }} /><i style={{ height: "58%" }} /><i style={{ height: "82%" }} /><i style={{ height: "100%" }} /></div>
        <button className="outline-button" type="button" onClick={() => navigate("Financeiro")}>Ver financeiro ›</button>
      </section>
    </div>
  );
}

function ClientsView({ clients, viewMode, setViewMode, search, setSearch, filter, setFilter, onNewClient, onOpenClient }: {
  clients: Client[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  search: string;
  setSearch: (value: string) => void;
  filter: "all" | ClientType;
  setFilter: (value: "all" | ClientType) => void;
  onNewClient: () => void;
  onOpenClient: (client: Client) => void;
}) {
  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesType = filter === "all" || client.type === filter;
      const matchesSearch = !term || [client.name, client.whatsapp, client.email, client.instagram].some((value) => value.toLowerCase().includes(term));
      return matchesType && matchesSearch;
    });
  }, [clients, filter, search]);

  const companies = clients.filter((client) => client.type === "company").length;
  const upcomingDates = clients.filter((client) => client.nextDate).length;

  return (
    <div className="clients-page">
      <section className="clients-title-row">
        <div>
          <p>RELACIONAMENTOS</p>
          <h1>Clientes</h1>
          <span>Contatos, histórico e oportunidades em um só lugar.</span>
        </div>
        <button className="primary-button" type="button" onClick={onNewClient}>＋ Novo cliente</button>
      </section>

      <section className="client-metrics" aria-label="Resumo de clientes">
        <article><span>CLIENTES ATIVOS</span><strong>{clients.length}</strong><small>4 retornaram este ano</small></article>
        <article><span>PESSOAS</span><strong>{clients.length - companies}</strong><small>Ensaios e eventos</small></article>
        <article><span>EMPRESAS E LOJAS</span><strong>{companies}</strong><small>Conteúdo recorrente</small></article>
        <article><span>PRÓXIMAS DATAS</span><strong>{upcomingDates}</strong><small>Oportunidades de contato</small></article>
      </section>

      <section className="clients-panel">
        <header className="clients-toolbar">
          <div className="client-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, WhatsApp ou Instagram" aria-label="Buscar clientes" /></div>
          <div className="type-filter" aria-label="Filtrar clientes">
            <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos</button>
            <button type="button" className={filter === "person" ? "active" : ""} onClick={() => setFilter("person")}>Pessoas</button>
            <button type="button" className={filter === "company" ? "active" : ""} onClick={() => setFilter("company")}>Empresas</button>
          </div>
          <div className="view-switch" aria-label="Modo de visualização">
            <button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} aria-label="Visualizar como lista">☷</button>
            <button type="button" className={viewMode === "cards" ? "active" : ""} onClick={() => setViewMode("cards")} aria-label="Visualizar como cards">▦</button>
          </div>
        </header>

        {filteredClients.length === 0 ? (
          <div className="empty-state"><span>⌕</span><h2>Nenhum cliente encontrado</h2><p>Tente outro termo ou limpe os filtros.</p><button type="button" className="outline-button" onClick={() => { setSearch(""); setFilter("all"); }}>Limpar busca</button></div>
        ) : viewMode === "list" ? (
          <div className="client-list">
            <div className="client-list-head"><span>CLIENTE</span><span>CONTATO</span><span>ÚLTIMO TRABALHO</span><span>PRÓXIMA DATA</span><span /></div>
            {filteredClients.map((client) => (
              <button type="button" className="client-row" key={client.id} onClick={() => onOpenClient(client)}>
                <span className="client-main"><span className="client-avatar">{client.avatar ? <img src={client.avatar} alt="" /> : initials(client.name)}</span><span><strong>{client.name}</strong><small>{client.type === "company" ? "Empresa / loja" : client.tag} · {client.workCount} {client.workCount === 1 ? "trabalho" : "trabalhos"}</small></span></span>
                <span className="client-contact"><strong>{client.whatsapp}</strong><small>{client.instagram}</small></span>
                <span className="client-last"><strong>{client.lastWork.split(" · ")[0]}</strong><small>{client.lastWork.split(" · ")[1] || "—"}</small></span>
                <span className="client-date">{client.nextDate ? <><strong>{client.nextDate}</strong><small>{client.nextDateLabel}</small></> : <small>Nenhuma data</small>}</span>
                <span className="row-arrow">›</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="client-card-grid">
            {filteredClients.map((client) => (
              <button type="button" className="client-card" key={client.id} onClick={() => onOpenClient(client)}>
                <span className="client-card-top"><span className="client-avatar large">{client.avatar ? <img src={client.avatar} alt="" /> : initials(client.name)}</span><span className="client-tag">{client.type === "company" ? "Empresa" : client.tag}</span></span>
                <strong className="client-card-name">{client.name}</strong><span className="client-card-handle">{client.instagram}</span>
                <span className="client-card-info"><span>◉ {client.whatsapp}</span><span>▱ {client.workCount} {client.workCount === 1 ? "trabalho" : "trabalhos"}</span></span>
                {client.nextDate && <span className="important-date"><b>◇</b><span><small>{client.nextDateLabel}</small><strong>{client.nextDate}</strong></span></span>}
              </button>
            ))}
          </div>
        )}
        <footer className="clients-footer">Mostrando {filteredClients.length} de {clients.length} clientes</footer>
      </section>
    </div>
  );
}

function NewClientDrawer({ clients, onClose, onSave }: { clients: Client[]; onClose: () => void; onSave: (client: NewClientData) => void }) {
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
    return clients.find((client) => (phone.length >= 8 && normalizePhone(client.whatsapp) === phone) || (!!email && client.email.toLowerCase() === email));
  }, [clients, form.email, form.whatsapp]);

  const update = (field: keyof NewClientData, value: string) => setForm((current) => ({ ...current, [field]: value }));

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
    if (!form.name.trim() || (!normalizePhone(form.whatsapp) && !form.email.trim()) || duplicate) return;
    onSave({ ...form, name: form.name.trim(), email: form.email.trim(), instagram: form.instagram.trim(), whatsapp: form.whatsapp.trim() });
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="client-drawer" role="dialog" aria-modal="true" aria-labelledby="new-client-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><p>NOVO CADASTRO</p><h2 id="new-client-title">Adicionar cliente</h2><span>Comece pelo essencial. O restante pode ser preenchido depois.</span></div>
          <button type="button" onClick={onClose} aria-label="Fechar cadastro">×</button>
        </header>

        <form onSubmit={submit} noValidate>
          <div className="drawer-body">
            <section className="form-section">
              <div className="client-type-picker">
                <button type="button" className={form.type === "person" ? "active" : ""} onClick={() => update("type", "person")}><span>♙</span><strong>Pessoa</strong><small>Ensaios e eventos</small></button>
                <button type="button" className={form.type === "company" ? "active" : ""} onClick={() => update("type", "company")}><span>▦</span><strong>Empresa / loja</strong><small>Editoriais e conteúdo</small></button>
              </div>

              <div className="photo-and-name">
                <button className="photo-picker" type="button" onClick={() => fileRef.current?.click()} aria-label="Adicionar foto opcional">
                  {form.avatar ? <img src={form.avatar} alt="Prévia do cliente" /> : <><span>＋</span><small>Foto opcional</small></>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
                <label className="field grow"><span>{form.type === "company" ? "Nome da empresa" : "Nome do cliente"} *</span><input autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} placeholder={form.type === "company" ? "Ex.: Loja Aurora" : "Ex.: Camila Almeida"} aria-invalid={submitted && !form.name.trim()} />{submitted && !form.name.trim() && <small className="field-error">Informe o nome.</small>}</label>
              </div>

              <div className="field-grid">
                <label className="field"><span>WhatsApp</span><input value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} placeholder="+55 (81) 99999-9999" inputMode="tel" /></label>
                <label className="field"><span>Instagram</span><input value={form.instagram} onChange={(event) => update("instagram", event.target.value)} placeholder="@usuario" /></label>
                <label className="field full"><span>E-mail</span><input value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="cliente@email.com" type="email" /></label>
              </div>
              {submitted && !normalizePhone(form.whatsapp) && !form.email.trim() && <p className="form-error">Informe pelo menos o WhatsApp ou o e-mail.</p>}
              {duplicate && <div className="duplicate-alert" role="alert"><span>!</span><div><strong>Possível cliente repetido</strong><p>O WhatsApp ou e-mail já pertence a <b>{duplicate.name}</b>.</p></div><button type="button" onClick={onClose}>Ver cliente</button></div>}
            </section>

            <section className={`optional-details ${detailsOpen ? "open" : ""}`}>
              <button type="button" className="details-toggle" onClick={() => setDetailsOpen(!detailsOpen)}><span><strong>Datas e informações importantes</strong><small>Aniversário, casamento e observações para futuras campanhas.</small></span><b>{detailsOpen ? "−" : "+"}</b></button>
              {detailsOpen && <div className="optional-fields">
                <div className="field-grid">
                  <label className="field"><span>{form.type === "company" ? "Aniversário da marca" : "Aniversário"}</span><input type="date" value={form.birthday} onChange={(event) => update("birthday", event.target.value)} /></label>
                  <label className="field"><span>Data de casamento / união</span><input type="date" value={form.weddingDate} onChange={(event) => update("weddingDate", event.target.value)} /></label>
                  <label className="field"><span>Nome de outra data</span><input value={form.otherDateLabel} onChange={(event) => update("otherDateLabel", event.target.value)} placeholder="Ex.: aniversário do filho" /></label>
                  <label className="field"><span>Outra data</span><input type="date" value={form.otherDate} onChange={(event) => update("otherDate", event.target.value)} /></label>
                  <label className="field full"><span>Observações</span><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Preferências, ideias ou informações úteis para os próximos trabalhos." rows={3} /></label>
                </div>
              </div>}
            </section>
          </div>

          <footer className="drawer-footer"><button className="cancel-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={!!duplicate}>Salvar cliente</button></footer>
        </form>
      </aside>
    </div>
  );
}

function WorksView({ works, clients, viewMode, setViewMode, search, setSearch, status, setStatus, category, setCategory, onNewWork, onOpenWork }: {
  works: Work[];
  clients: Client[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  search: string;
  setSearch: (value: string) => void;
  status: "all" | WorkStatus;
  setStatus: (value: "all" | WorkStatus) => void;
  category: "all" | WorkCategory;
  setCategory: (value: "all" | WorkCategory) => void;
  onNewWork: () => void;
  onOpenWork: (work: Work) => void;
}) {
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return works.filter((work) => {
      const haystack = `${work.title} ${work.category} ${work.location} ${namesForClients(work.clientIds, clients)}`.toLowerCase();
      return (status === "all" || work.status === status) && (category === "all" || work.category === category) && (!term || haystack.includes(term));
    });
  }, [works, clients, search, status, category]);
  const active = works.filter((work) => !["completed", "archived", "cancelled"].includes(work.status)).length;
  const scheduled = works.filter((work) => work.status === "scheduled" || work.status === "planning").length;
  const urgent = works.filter((work) => !["completed", "archived", "cancelled"].includes(work.status) && work.deliveryDate <= "2026-08-12").length;
  const receivableBRL = works.filter((work) => work.currency === "BRL").reduce((sum, work) => sum + Math.max(0, work.totalValue - work.entryValue), 0);
  const receivableEUR = works.filter((work) => work.currency === "EUR").reduce((sum, work) => sum + Math.max(0, work.totalValue - work.entryValue), 0);

  return (
    <div className="works-page">
      <section className="works-title-row">
        <div><p>PRODUÇÃO</p><h1>Trabalhos</h1><span>Acompanhe cada ensaio do orçamento até a entrega.</span></div>
        <button className="primary-button" type="button" onClick={onNewWork}>＋ Novo trabalho</button>
      </section>

      <section className="work-metrics" aria-label="Resumo de trabalhos">
        <article><span>EM ANDAMENTO</span><strong>{active}</strong><small>Todos os fluxos ativos</small></article>
        <article><span>AGENDADOS</span><strong>{scheduled}</strong><small>Preparação e sessão</small></article>
        <article className={urgent ? "metric-urgent" : ""}><span>PRAZOS PRÓXIMOS</span><strong>{urgent}</strong><small>Até 12 de agosto</small></article>
        <article><span>A RECEBER</span><strong>{formatMoney(receivableBRL, "BRL")}</strong><small>{receivableEUR ? `+ ${formatMoney(receivableEUR, "EUR")}` : "Nenhum valor em euro"}</small></article>
      </section>

      <section className="works-panel">
        <header className="works-toolbar">
          <label className="work-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar trabalho, cliente ou local" aria-label="Buscar trabalhos" /></label>
          <select value={status} onChange={(event) => setStatus(event.target.value as "all" | WorkStatus)} aria-label="Filtrar por andamento">
            <option value="all">Todos os andamentos</option>
            {Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value as "all" | WorkCategory)} aria-label="Filtrar por categoria">
            <option value="all">Todas as categorias</option>
            {(["Casamento", "Pré-wedding", "Ensaio pessoal", "Família", "Aniversário", "Editorial para loja", "Evento", "Estúdio"] as WorkCategory[]).map((item) => <option key={item}>{item}</option>)}
          </select>
          <div className="view-switch" aria-label="Modo de visualização">
            <button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} aria-label="Visualizar como lista">☷</button>
            <button type="button" className={viewMode === "cards" ? "active" : ""} onClick={() => setViewMode("cards")} aria-label="Visualizar como cards">▦</button>
          </div>
        </header>

        {filtered.length === 0 ? (
          <div className="empty-state"><span>⌕</span><h2>Nenhum trabalho encontrado</h2><p>Tente mudar a busca ou os filtros.</p><button className="outline-button" type="button" onClick={() => { setSearch(""); setStatus("all"); setCategory("all"); }}>Limpar filtros</button></div>
        ) : viewMode === "list" ? (
          <div className="work-list">
            <div className="work-list-head"><span>TRABALHO</span><span>DATA E LOCAL</span><span>ANDAMENTO</span><span>FINANCEIRO</span><span>PRAZO</span><span /></div>
            {filtered.map((work) => {
              const progress = workProgress(work);
              const balance = work.totalValue - work.entryValue;
              return <button className="work-row" type="button" key={work.id} onClick={() => onOpenWork(work)}>
                <span className="work-main"><span className={`work-category-icon status-${work.status}`}>▱</span><span><strong>{work.title}</strong><small>{work.category} · {namesForClients(work.clientIds, clients)}</small></span></span>
                <span className="work-date"><strong>{formatDate(work.date)} · {work.time}</strong><small>{work.location}</small></span>
                <span className="work-flow"><span><strong>{statusLabels[work.status]}</strong><small>{progress}%</small></span><i><b style={{ width: `${progress}%` }} /></i></span>
                <span className="work-money"><strong>{formatMoney(work.totalValue, work.currency)}</strong><small>{balance > 0 ? `${formatMoney(balance, work.currency)} pendente` : "Pago"}</small></span>
                <span className={`work-deadline ${work.deliveryDate <= "2026-08-01" ? "urgent" : ""}`}><strong>{formatDate(work.deliveryDate)}</strong><small>{work.deliveryDate <= "2026-08-01" ? "Entrega hoje" : "Prazo de entrega"}</small></span>
                <span className="row-arrow">›</span>
              </button>;
            })}
          </div>
        ) : (
          <div className="work-card-grid">
            {filtered.map((work) => {
              const progress = workProgress(work);
              return <button className="work-card" type="button" key={work.id} onClick={() => onOpenWork(work)}>
                <span className="work-card-top"><span className={`status-badge status-${work.status}`}>{statusLabels[work.status]}</span><span className="work-category-label">{work.category}</span></span>
                <strong className="work-card-title">{work.title}</strong><span className="work-card-clients">{namesForClients(work.clientIds, clients)}</span>
                <span className="work-card-info"><span>◇ {formatDate(work.date)} · {work.time}</span><span>⌖ {work.location}</span></span>
                <span className="work-card-progress"><span><small>Fluxo do trabalho</small><strong>{progress}%</strong></span><i><b style={{ width: `${progress}%` }} /></i></span>
                <span className={`work-card-deadline ${work.deliveryDate <= "2026-08-01" ? "urgent" : ""}`}><span>⌛</span><span><small>Entrega</small><strong>{formatDate(work.deliveryDate)}</strong></span></span>
                <span className="photo-counts"><span>{work.photos.captured}<small>Tiradas</small></span><span>{work.photos.selected}<small>Selecionadas</small></span><span>{work.photos.edited}<small>Editadas</small></span><span>{work.photos.delivered}<small>Entregues</small></span></span>
              </button>;
            })}
          </div>
        )}
        <footer className="clients-footer">Mostrando {filtered.length} de {works.length} trabalhos</footer>
      </section>
    </div>
  );
}

type WorkDetailTab = "overview" | "timeline" | "finance" | "photos" | "files" | "costs";

type LocalAttachment = { url: string; type: string; size: number };

function attachmentExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "arquivo";
}

function attachmentKind(name: string, type = "") {
  const extension = attachmentExtension(name);
  if (type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) return "image";
  if (type === "application/pdf" || extension === "pdf") return "pdf";
  return "other";
}

const workDetailTabs: Array<{ id: WorkDetailTab; label: string; icon: string }> = [
  { id: "overview", label: "Visão geral", icon: "◇" },
  { id: "timeline", label: "Timeline", icon: "⌁" },
  { id: "finance", label: "Financeiro", icon: "＄" },
  { id: "photos", label: "Fotos", icon: "▧" },
  { id: "files", label: "Arquivos", icon: "□" },
  { id: "costs", label: "Custos", icon: "−" },
];

function WorkDetails({ work, clients, onBack, onUpdate, onDuplicate, onArchive, onCancel, toast }: {
  work: Work;
  clients: Client[];
  onBack: () => void;
  onUpdate: (work: Work) => void;
  onDuplicate: (work: Work) => void;
  onArchive: (work: Work) => void;
  onCancel: (work: Work) => void;
  toast: (message: string) => void;
}) {
  const [tab, setTab] = useState<WorkDetailTab>("overview");
  const [selectedStageId, setSelectedStageId] = useState(work.stages.find((stage) => !stage.done)?.id || work.stages[0]?.id || "");
  const [newStage, setNewStage] = useState("");
  const [payment, setPayment] = useState("");
  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [localFiles, setLocalFiles] = useState<Record<string, LocalAttachment>>({});
  const localFilesRef = useRef<Record<string, LocalAttachment>>({});
  const [activities, setActivities] = useState([
    { id: 1, icon: "✓", title: "Seleção concluída", meta: "Maryana · hoje, 10:42" },
    { id: 2, icon: "＄", title: `${formatMoney(work.entryValue, work.currency)} registrados como recebidos`, meta: "Maryana · 22 jul, 14:18" },
    { id: 3, icon: "◇", title: "Prazo de entrega definido", meta: `${formatDate(work.deliveryDate)} · 18 jul, 19:05` },
    { id: 4, icon: "＋", title: "Trabalho criado", meta: "Maryana · 02 jun, 09:30" },
  ]);
  const stageFileRef = useRef<HTMLInputElement>(null);
  const workFileRef = useRef<HTMLInputElement>(null);
  const linkedClients = clients.filter((client) => work.clientIds.includes(client.id));
  const selectedStage = work.stages.find((stage) => stage.id === selectedStageId) || work.stages[0];
  const receivedPercent = work.totalValue ? Math.min(100, Math.round((work.entryValue / work.totalValue) * 100)) : 0;
  const progress = workProgress(work);
  const nextStage = work.stages.find((stage) => !stage.done);
  const currentPreview = previewFile ? localFiles[previewFile] : undefined;
  const currentPreviewKind = previewFile ? attachmentKind(previewFile, currentPreview?.type) : "other";

  useEffect(() => () => {
    Object.values(localFilesRef.current).forEach((file) => URL.revokeObjectURL(file.url));
  }, []);

  const addActivity = (title: string, icon = "◇") => setActivities((current) => [{ id: Date.now(), icon, title, meta: "Maryana · agora" }, ...current]);
  const update = (changes: Partial<Work>) => onUpdate({ ...work, ...changes });
  const updateStage = (stageId: string, changes: Partial<WorkStage>) => {
    const stages = work.stages.map((stage) => stage.id === stageId ? { ...stage, ...changes } : stage);
    const done = stages.filter((stage) => stage.done).length;
    const status: WorkStatus = done === stages.length ? "completed" : done >= 7 ? "delivery" : done >= 6 ? "editing" : work.date ? "scheduled" : "planning";
    update({ stages, status });
  };
  const toggleStage = (stage: WorkStage) => {
    if (!stage.done && stage.label === "Pagamento dos 50%" && work.entryValue < work.totalValue / 2) {
      toast(`Registre pelo menos ${formatMoney(work.totalValue / 2, work.currency)} antes de confirmar esta etapa.`);
      setTab("finance");
      return;
    }
    if (!stage.done && stage.label === "Pagamento completo" && work.entryValue < work.totalValue) {
      toast("O saldo ainda não foi totalmente recebido.");
      setTab("finance");
      return;
    }
    updateStage(stage.id, { done: !stage.done });
    addActivity(`${stage.label} ${stage.done ? "reaberta" : "concluída"}`, stage.done ? "↻" : "✓");
  };
  const moveStage = (stageId: string, direction: -1 | 1) => {
    const index = work.stages.findIndex((stage) => stage.id === stageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= work.stages.length) return;
    const stages = [...work.stages];
    [stages[index], stages[target]] = [stages[target], stages[index]];
    update({ stages });
    addActivity("Ordem das etapas alterada", "↕");
  };
  const addCustomStage = () => {
    const label = newStage.trim();
    if (!label) return;
    const id = `custom-${Date.now()}`;
    update({ stages: [...work.stages, { id, label, done: false, custom: true, responsible: "Maryana", checklist: stageChecklist(label, id), attachments: [] }] });
    setNewStage("");
    setSelectedStageId(id);
    addActivity(`Etapa “${label}” adicionada`, "＋");
  };
  const registerPayment = () => {
    const amount = Number(payment.replace(",", "."));
    if (!amount || amount <= 0) return;
    const received = Math.min(work.totalValue, work.entryValue + amount);
    update({ entryValue: received });
    setPayment("");
    addActivity(`Pagamento de ${formatMoney(amount, work.currency)} registrado`, "＄");
    toast("Pagamento registrado. Confirme manualmente a etapa correspondente.");
  };
  const rememberFiles = (files: File[]) => {
    const entries = Object.fromEntries(files.map((file) => [file.name, { url: URL.createObjectURL(file), type: file.type, size: file.size }]));
    localFilesRef.current = { ...localFilesRef.current, ...entries };
    setLocalFiles((current) => ({ ...current, ...entries }));
  };
  const addWorkFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    rememberFiles(selectedFiles);
    update({ attachments: [...work.attachments, ...selectedFiles.map((file) => file.name)] });
    addActivity(`${selectedFiles.length} arquivo(s) anexado(s)`, "□");
    event.target.value = "";
  };
  const addStageFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedStage) return;
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    rememberFiles(selectedFiles);
    updateStage(selectedStage.id, { attachments: [...(selectedStage.attachments || []), ...selectedFiles.map((file) => file.name)] });
    addActivity(`Arquivo anexado à etapa ${selectedStage.label}`, "□");
    event.target.value = "";
  };
  const whatsapp = linkedClients[0]?.whatsapp ? `https://wa.me/${normalizePhone(linkedClients[0].whatsapp)}` : "#";

  return (
    <div className="work-details-page">
      <button className="detail-back" type="button" onClick={onBack}>← Voltar para trabalhos</button>
      <section className="work-detail-hero">
        <div className="work-detail-title">
          <span className={`work-category-icon status-${work.status}`}>▱</span>
          <div><span className={`status-badge status-${work.status}`}>{statusLabels[work.status]}</span><h1>{work.title}</h1><p>{work.category} · {namesForClients(work.clientIds, clients)}</p></div>
        </div>
        <div className="work-detail-actions">
          <a className="whatsapp-button" href={whatsapp} target="_blank" rel="noreferrer">◉ WhatsApp</a>
          <button type="button" onClick={() => setEditing(!editing)}>✎ Editar</button>
          <button type="button" onClick={() => onDuplicate(work)}>⧉ Duplicar</button>
          <button type="button" onClick={() => onArchive(work)}>⌑ Arquivar</button>
          <button className="danger-action" type="button" onClick={() => setCancelOpen(true)}>× Cancelar</button>
        </div>
      </section>

      {editing && <section className="detail-inline-edit card">
        <div className="field-grid"><label className="field"><span>Título</span><input value={work.title} onChange={(event) => update({ title: event.target.value })} /></label><label className="field"><span>Local</span><input value={work.location} onChange={(event) => update({ location: event.target.value })} /></label><label className="field"><span>Data</span><input type="date" value={work.date} onChange={(event) => update({ date: event.target.value })} /></label><label className="field"><span>Horário</span><input type="time" value={work.time} onChange={(event) => update({ time: event.target.value })} /></label><label className="field"><span>Entrega</span><input type="date" value={work.deliveryDate} onChange={(event) => update({ deliveryDate: event.target.value })} /></label><label className="field"><span>Equipe</span><input value={work.team.join(", ")} onChange={(event) => update({ team: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label></div>
        <button className="primary-button" type="button" onClick={() => { setEditing(false); addActivity("Dados principais atualizados", "✎"); toast("Alterações salvas nesta sessão"); }}>Concluir edição</button>
      </section>}

      <nav className="work-detail-tabs" aria-label="Seções do trabalho">{workDetailTabs.map((item) => <button type="button" key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>

      {tab === "overview" && <div className="detail-content-grid">
        <section className="detail-main-column">
          <div className="detail-summary-grid">
            <article><span>SESSÃO</span><strong>{formatDate(work.date)} · {work.time}</strong><small>{work.duration} · {work.location}</small></article>
            <article><span>ENTREGA</span><strong className={work.deliveryDate <= "2026-08-01" ? "text-danger" : ""}>{formatDate(work.deliveryDate)}</strong><small>{work.deliveryDate <= "2026-08-01" ? "Prazo exige atenção" : "Prazo confirmado"}</small></article>
            <article><span>FINANCEIRO</span><strong>{formatMoney(work.entryValue, work.currency)} de {formatMoney(work.totalValue, work.currency)}</strong><small>{receivedPercent}% recebido</small></article>
            <article><span>FOTOS</span><strong>{work.photos.edited} de {work.photos.selected} editadas</strong><small>{work.photos.captured} capturadas</small></article>
          </div>
          <article className="card detail-progress-card"><div className="detail-section-heading"><div><p>ANDAMENTO</p><h2>Fluxo do trabalho</h2></div><strong>{progress}%</strong></div><div className="progress large"><i style={{ width: `${progress}%` }} /></div><div className="next-stage-callout"><span>→</span><div><small>PRÓXIMA ETAPA</small><strong>{nextStage?.label || "Trabalho concluído"}</strong><p>{nextStage ? `Responsável: ${nextStage.responsible || "A definir"}` : "Todas as etapas foram finalizadas."}</p></div><button type="button" onClick={() => { setTab("timeline"); if (nextStage) setSelectedStageId(nextStage.id); }}>Abrir timeline</button></div></article>
          <article className="card"><div className="detail-section-heading"><div><p>PRODUÇÃO</p><h2>Informações do trabalho</h2></div></div><div className="info-list"><div><span>Pacote contratado</span><strong>{work.packageName}</strong></div><div><span>Equipe</span><strong>{work.team.join(" · ")}</strong></div><div><span>Clientes</span><strong>{namesForClients(work.clientIds, clients)}</strong></div><div><span>Arquivos anexados</span><strong>{work.attachments.length}</strong></div></div></article>
        </section>
        <aside className="detail-activity card"><div className="detail-section-heading"><div><p>HISTÓRICO</p><h2>Atividades recentes</h2></div></div><div className="activity-list">{activities.map((item) => <div key={item.id}><span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.meta}</small></div></div>)}</div></aside>
      </div>}

      {tab === "timeline" && <div className="timeline-layout">
        <section className="timeline-panel card"><div className="detail-section-heading"><div><p>CRONOGRAMA</p><h2>Etapas do trabalho</h2></div><span>{work.stages.filter((stage) => stage.done).length} de {work.stages.length} concluídas</span></div>
          <div className="timeline-list">{work.stages.map((stage, index) => {
            const due = stage.dueDate || inferredStageDate(work, index);
            const state = stage.done ? "done" : due && due < "2026-08-01" ? "late" : due && due <= "2026-08-05" ? "soon" : "pending";
            return <div key={stage.id} className={`timeline-item ${state} ${selectedStageId === stage.id ? "selected" : ""}`}>
              <button className="stage-check" type="button" onClick={() => toggleStage(stage)} aria-label={stage.done ? `Reabrir ${stage.label}` : `Concluir ${stage.label}`}>{stage.done ? "✓" : index + 1}</button>
              <button className="stage-open" type="button" onClick={() => setSelectedStageId(stage.id)}><strong>{stage.label}</strong><small><span>{state === "late" ? "Atrasada" : state === "soon" ? "Prazo próximo" : stage.done ? "Concluída" : formatDate(due)}</span> · {stage.responsible || "Sem responsável"}</small></button>
              <span className="stage-move"><button type="button" onClick={() => moveStage(stage.id, -1)} disabled={index === 0}>↑</button><button type="button" onClick={() => moveStage(stage.id, 1)} disabled={index === work.stages.length - 1}>↓</button></span>
            </div>;
          })}</div>
          <div className="timeline-add"><input value={newStage} onChange={(event) => setNewStage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addCustomStage(); }} placeholder="Nova etapa personalizada" /><button type="button" onClick={addCustomStage}>＋ Adicionar etapa</button></div>
        </section>
        {selectedStage && <aside className="stage-detail card"><div className="stage-detail-head"><div><p>DETALHES DA ETAPA</p><h2>{selectedStage.label}</h2></div>{selectedStage.custom && <button type="button" onClick={() => { update({ stages: work.stages.filter((stage) => stage.id !== selectedStage.id) }); setSelectedStageId(work.stages[0]?.id || ""); }}>Remover</button>}</div>
          <div className="field-grid"><label className="field"><span>Prazo</span><input type="date" value={selectedStage.dueDate || inferredStageDate(work, work.stages.findIndex((stage) => stage.id === selectedStage.id))} onChange={(event) => { updateStage(selectedStage.id, { dueDate: event.target.value }); addActivity(`Prazo de ${selectedStage.label} alterado`, "◇"); }} /></label><label className="field"><span>Responsável</span><select value={selectedStage.responsible || "Maryana"} onChange={(event) => updateStage(selectedStage.id, { responsible: event.target.value })}>{[...new Set(["Maryana", ...work.team])].map((person) => <option key={person}>{person}</option>)}</select></label><label className="field full"><span>Observações</span><textarea rows={3} value={selectedStage.notes || ""} onChange={(event) => updateStage(selectedStage.id, { notes: event.target.value })} placeholder="Orientações, detalhes ou pendências desta etapa." /></label></div>
          <div className="stage-subsection"><div><strong>Checklist</strong><small>{(selectedStage.checklist || []).filter((item) => item.done).length}/{(selectedStage.checklist || []).length}</small></div><div className="stage-checklist">{(selectedStage.checklist || []).map((item) => <button type="button" key={item.id} className={item.done ? "done" : ""} onClick={() => updateStage(selectedStage.id, { checklist: selectedStage.checklist?.map((check) => check.id === item.id ? { ...check, done: !check.done } : check) })}><span>{item.done ? "✓" : ""}</span>{item.label}</button>)}</div></div>
          <div className="stage-subsection"><div><strong>Anexos da etapa</strong><small>{selectedStage.attachments?.length || 0}</small></div><input ref={stageFileRef} type="file" multiple hidden onChange={addStageFiles} /><button className="stage-upload" type="button" onClick={() => stageFileRef.current?.click()}>＋ Anexar arquivo</button>{selectedStage.attachments?.map((file) => <button className="mini-file" type="button" key={file} onClick={() => setPreviewFile(file)}><span>□ {file}</span><strong>Visualizar</strong></button>)}</div>
          <button className={selectedStage.done ? "cancel-button full-button" : "primary-button full-button"} type="button" onClick={() => toggleStage(selectedStage)}>{selectedStage.done ? "Reabrir etapa" : "Concluir etapa"}</button>
        </aside>}
      </div>}

      {tab === "finance" && <section className="tab-single card finance-tab"><div className="detail-section-heading"><div><p>FINANCEIRO</p><h2>Pagamentos do trabalho</h2></div><span>{receivedPercent}% recebido</span></div><div className="finance-detail-grid"><article><span>VALOR TOTAL</span><strong>{formatMoney(work.totalValue, work.currency)}</strong><small>{work.packageName}</small></article><article><span>RECEBIDO</span><strong>{formatMoney(work.entryValue, work.currency)}</strong><small>{receivedPercent >= 50 ? "Entrada mínima alcançada" : `Faltam ${formatMoney(work.totalValue / 2 - work.entryValue, work.currency)} para 50%`}</small></article><article><span>SALDO</span><strong>{formatMoney(Math.max(0, work.totalValue - work.entryValue), work.currency)}</strong><small>{work.installments} parcela(s) combinadas</small></article></div><div className="progress large"><i style={{ width: `${receivedPercent}%` }} /></div><div className="payment-register"><label className="field"><span>Novo pagamento ({work.currency === "BRL" ? "R$" : "€"})</span><input type="number" min="0" value={payment} onChange={(event) => setPayment(event.target.value)} placeholder="0,00" /></label><button className="primary-button" type="button" onClick={registerPayment}>Registrar pagamento</button></div><div className="payment-milestones"><div className={receivedPercent >= 50 ? "ready" : "blocked"}><span>{receivedPercent >= 50 ? "✓" : "⌛"}</span><div><strong>Pagamento dos 50%</strong><small>{receivedPercent >= 50 ? "Valor alcançado · aguardando confirmação manual" : "Será liberado ao atingir metade do total"}</small></div><button type="button" disabled={receivedPercent < 50} onClick={() => { const stage = work.stages.find((item) => item.label === "Pagamento dos 50%"); if (stage) toggleStage(stage); }}>Confirmar</button></div><div className={receivedPercent >= 100 ? "ready" : "blocked"}><span>{receivedPercent >= 100 ? "✓" : "⌛"}</span><div><strong>Pagamento completo</strong><small>{receivedPercent >= 100 ? "Valor quitado · aguardando confirmação manual" : "Será liberado quando o saldo chegar a zero"}</small></div><button type="button" disabled={receivedPercent < 100} onClick={() => { const stage = work.stages.find((item) => item.label === "Pagamento completo"); if (stage) toggleStage(stage); }}>Confirmar</button></div></div><p className="automation-note">◇ No futuro, pagamentos integrados poderão atualizar estas etapas automaticamente. A confirmação permanece manual nesta versão.</p></section>}

      {tab === "photos" && <section className="tab-single card"><div className="detail-section-heading"><div><p>PRODUÇÃO</p><h2>Controle de fotos</h2></div><span>Atualização manual</span></div><div className="photo-detail-grid">{(["captured", "selected", "edited", "delivered"] as const).map((field) => { const labels = { captured: "Tiradas", selected: "Selecionadas", edited: "Editadas", delivered: "Entregues" }; return <label key={field}><span>{labels[field]}</span><input type="number" min="0" value={work.photos[field]} onChange={(event) => update({ photos: { ...work.photos, [field]: Number(event.target.value) } })} /><small>{field === "edited" && work.photos.selected ? `${Math.round((work.photos.edited / work.photos.selected) * 100)}% da seleção` : field === "delivered" ? "Galeria final" : "Quantidade registrada"}</small></label>; })}</div><div className="photo-flow-line"><span className="done">Captura</span><i /><span className={work.photos.selected ? "done" : ""}>Seleção</span><i /><span className={work.photos.edited >= work.photos.selected && work.photos.selected ? "done" : ""}>Edição</span><i /><span className={work.photos.delivered ? "done" : ""}>Entrega</span></div><p className="automation-note">◇ Quando o módulo de galerias for conectado, seleção e entrega poderão avançar automaticamente.</p></section>}

      {tab === "files" && <section className="tab-single card"><div className="detail-section-heading"><div><p>ARQUIVOS</p><h2>Materiais do trabalho</h2></div><button className="outline-button" type="button" onClick={() => workFileRef.current?.click()}>＋ Adicionar arquivo</button></div><input ref={workFileRef} type="file" multiple hidden onChange={addWorkFiles} /><div className="work-file-grid">{work.attachments.map((file, index) => <article key={`${file}-${index}`}><span>□</span><button className="file-main-action" type="button" onClick={() => setPreviewFile(file)}><strong>{file}</strong><small>{attachmentExtension(file).toUpperCase()} · clique para visualizar</small></button><span className="file-actions"><button type="button" onClick={() => setPreviewFile(file)}>Visualizar</button><button className="remove-file" type="button" aria-label={`Remover ${file}`} onClick={() => update({ attachments: work.attachments.filter((_, fileIndex) => fileIndex !== index) })}>×</button></span></article>)}{work.attachments.length === 0 && <div className="empty-state"><span>□</span><h2>Nenhum arquivo anexado</h2><p>Adicione contratos, comprovantes ou referências.</p></div>}</div></section>}

      {tab === "costs" && <section className="tab-single card"><div className="detail-section-heading"><div><p>CUSTOS</p><h2>Resultado previsto</h2></div></div><div className="cost-summary"><article><span>RECEITA</span><strong>{formatMoney(work.totalValue, work.currency)}</strong></article><b>−</b><article><span>CUSTOS</span><strong>{formatMoney(work.costs, work.currency)}</strong></article><b>=</b><article className="result"><span>RESULTADO</span><strong>{formatMoney(work.totalValue - work.costs, work.currency)}</strong></article></div><label className="field cost-edit"><span>Custos previstos ou realizados</span><input type="number" min="0" value={work.costs} onChange={(event) => update({ costs: Number(event.target.value) })} /><small className="field-hint">Inclua transporte, equipe, locação, alimentação, impressão e outros gastos.</small></label><div className="cost-placeholder"><span>＋</span><div><strong>Detalhamento de custos</strong><p>No módulo Financeiro será possível separar cada gasto por categoria e moeda.</p></div></div></section>}

      {cancelOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setCancelOpen(false)}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-work-title" onMouseDown={(event) => event.stopPropagation()}><span>!</span><h2 id="cancel-work-title">Cancelar este trabalho?</h2><p>O trabalho continuará no histórico com o status “Cancelado”. Nenhum dado será apagado.</p><div><button className="cancel-button" type="button" onClick={() => setCancelOpen(false)}>Voltar</button><button className="danger-button" type="button" onClick={() => onCancel(work)}>Sim, cancelar trabalho</button></div></section></div>}
      {previewFile && <div className="modal-backdrop file-preview-backdrop" role="presentation" onMouseDown={() => setPreviewFile(null)}><section className="file-preview-modal" role="dialog" aria-modal="true" aria-labelledby="file-preview-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p>VISUALIZAÇÃO DO ANEXO</p><h2 id="file-preview-title">{previewFile}</h2><span>{currentPreview ? `${attachmentExtension(previewFile).toUpperCase()} · arquivo enviado nesta sessão` : "Arquivo demonstrativo"}</span></div><button type="button" aria-label="Fechar visualização" onClick={() => setPreviewFile(null)}>×</button></header>
        <div className="file-preview-body">
          {currentPreview && currentPreviewKind === "image" && <img src={currentPreview.url} alt={`Prévia de ${previewFile}`} />}
          {currentPreview && currentPreviewKind === "pdf" && <object data={currentPreview.url} type="application/pdf"><div className="unsupported-preview"><span>PDF</span><h3>Prévia indisponível neste navegador</h3><p>Use o botão de baixar para abrir o arquivo.</p></div></object>}
          {!currentPreview && currentPreviewKind === "image" && <div className="demo-image-preview"><span>PRÉVIA DEMONSTRATIVA</span><div className="demo-photo-shape"><i /><i /><i /></div><h3>Referência visual do ensaio</h3><p>Quando um arquivo real for enviado, a imagem original aparecerá aqui.</p></div>}
          {!currentPreview && currentPreviewKind === "pdf" && <div className="demo-document"><div className="demo-document-top"><span>REVELAR.</span><b>PRÉVIA DEMONSTRATIVA</b></div><h3>{previewFile.toLowerCase().includes("comprovante") ? "Comprovante de pagamento" : previewFile.toLowerCase().includes("contrato") ? "Contrato de prestação fotográfica" : "Documento do trabalho"}</h3><p>Casamento Amanda e João</p><div className="demo-document-grid"><span><small>CLIENTE</small><strong>Amanda e João</strong></span><span><small>DATA</small><strong>18 de julho de 2026</strong></span><span><small>STATUS</small><strong>Documento conferido</strong></span><span><small>RESPONSÁVEL</small><strong>Maryana</strong></span></div><div className="demo-document-lines"><i /><i /><i /><i /></div><div className="demo-signature">Assinatura / confirmação</div></div>}
          {currentPreview && currentPreviewKind === "other" && <div className="unsupported-preview"><span>{attachmentExtension(previewFile).toUpperCase()}</span><h3>Este formato não possui prévia</h3><p>O arquivo original continua disponível para baixar.</p></div>}
          {!currentPreview && currentPreviewKind === "other" && <div className="unsupported-preview"><span>{attachmentExtension(previewFile).toUpperCase()}</span><h3>Arquivo demonstrativo</h3><p>Envie um arquivo real para habilitar a visualização ou download.</p></div>}
        </div>
        <footer><p>{currentPreview ? "O arquivo ficará disponível apenas durante esta sessão demonstrativa." : "Esta é uma prévia ilustrativa; os arquivos reais serão persistidos após conectarmos o banco."}</p>{currentPreview ? <a className="primary-button" href={currentPreview.url} download={previewFile}>↓ Baixar arquivo</a> : <button className="primary-button" type="button" onClick={() => setPreviewFile(null)}>Entendi</button>}</footer>
      </section></div>}
    </div>
  );
}

function makeEmptyWork(): NewWorkData {
  return {
    title: "", category: "Casamento", clientIds: [], date: "", time: "", duration: "", location: "", team: ["Maryana"], deliveryDate: "", packageName: "", currency: "BRL", totalValue: 0, entryValue: 0, installments: 1, costs: 0,
    photos: { captured: 0, selected: 0, edited: 0, delivered: 0 },
    stages: createStages("new"), attachments: [],
  };
}

function NewWorkDrawer({ clients, onClose, onSave }: { clients: Client[]; onClose: () => void; onSave: (work: NewWorkData) => void }) {
  const [form, setForm] = useState<NewWorkData>(() => makeEmptyWork());
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [customStage, setCustomStage] = useState("");
  const [teamText, setTeamText] = useState("Maryana");
  const fileRef = useRef<HTMLInputElement>(null);
  const categories: WorkCategory[] = ["Casamento", "Pré-wedding", "Ensaio pessoal", "Família", "Aniversário", "Editorial para loja", "Evento", "Estúdio"];
  const stepNames = ["Essencial", "Agenda", "Financeiro", "Fluxo", "Revisão"];

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const update = <K extends keyof NewWorkData>(field: K, value: NewWorkData[K]) => setForm((current) => ({ ...current, [field]: value }));
  const validStep = step === 1 ? !!form.title.trim() && form.clientIds.length > 0 : step === 2 ? !!form.date && !!form.time && !!form.location.trim() && !!form.deliveryDate : step === 3 ? !!form.packageName.trim() && form.totalValue > 0 : true;
  const toggleClient = (id: number) => update("clientIds", form.clientIds.includes(id) ? form.clientIds.filter((clientId) => clientId !== id) : [...form.clientIds, id]);
  const goNext = () => { setSubmitted(true); if (!validStep) return; setSubmitted(false); setStep((current) => Math.min(5, current + 1)); };
  const addStage = () => {
    const label = customStage.trim();
    if (!label) return;
    const id = `custom-${Date.now()}`;
    update("stages", [...form.stages, { id, label, done: false, custom: true, responsible: "Maryana", checklist: stageChecklist(label, id), attachments: [] }]);
    setCustomStage("");
  };
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const names = Array.from(event.target.files || []).map((file) => file.name);
    update("attachments", [...form.attachments, ...names]);
  };
  const save = () => onSave({ ...form, title: form.title.trim(), location: form.location.trim(), packageName: form.packageName.trim(), team: teamText.split(",").map((item) => item.trim()).filter(Boolean) });

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="work-drawer" role="dialog" aria-modal="true" aria-labelledby="new-work-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header"><div><p>NOVO TRABALHO</p><h2 id="new-work-title">Criar trabalho</h2><span>Etapa {step} de 5 · {stepNames[step - 1]}</span></div><button type="button" onClick={onClose} aria-label="Fechar cadastro">×</button></header>
        <div className="work-stepper" aria-label="Progresso do cadastro">{stepNames.map((name, index) => <button type="button" key={name} className={step === index + 1 ? "active" : step > index + 1 ? "done" : ""} onClick={() => index + 1 < step && setStep(index + 1)}><span>{step > index + 1 ? "✓" : index + 1}</span><small>{name}</small></button>)}</div>
        <div className="work-drawer-body">
          {step === 1 && <section className="work-form-step">
            <div className="step-copy"><span>01</span><div><h3>O que será fotografado?</h3><p>Defina o trabalho e vincule todos os clientes envolvidos.</p></div></div>
            <label className="field"><span>Título do trabalho *</span><input autoFocus value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Ex.: Casamento Amanda e João" aria-invalid={submitted && !form.title.trim()} />{submitted && !form.title.trim() && <small className="field-error">Informe um título.</small>}</label>
            <div className="field"><span>Categoria *</span><div className="category-picker">{categories.map((item) => <button key={item} type="button" className={form.category === item ? "active" : ""} onClick={() => update("category", item)}>{item}</button>)}</div></div>
            <div className="field"><span>Clientes vinculados *</span><div className="client-picker">{clients.map((client) => <button key={client.id} type="button" className={form.clientIds.includes(client.id) ? "active" : ""} onClick={() => toggleClient(client.id)}><span className="client-avatar">{initials(client.name)}</span><span><strong>{client.name}</strong><small>{client.type === "company" ? "Empresa / loja" : client.whatsapp}</small></span><b>{form.clientIds.includes(client.id) ? "✓" : "+"}</b></button>)}</div>{submitted && form.clientIds.length === 0 && <small className="field-error">Selecione pelo menos um cliente.</small>}</div>
          </section>}

          {step === 2 && <section className="work-form-step">
            <div className="step-copy"><span>02</span><div><h3>Agenda e produção</h3><p>Organize sessão, prazo, local e equipe.</p></div></div>
            <div className="field-grid"><label className="field"><span>Data *</span><input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} /></label><label className="field"><span>Horário *</span><input type="time" value={form.time} onChange={(event) => update("time", event.target.value)} /></label><label className="field"><span>Duração</span><input value={form.duration} onChange={(event) => update("duration", event.target.value)} placeholder="Ex.: 3h30" /></label><label className="field"><span>Entrega prevista *</span><input type="date" value={form.deliveryDate} onChange={(event) => update("deliveryDate", event.target.value)} /></label><label className="field full"><span>Local *</span><input value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Nome e endereço do local" /></label><label className="field full"><span>Equipe</span><input value={teamText} onChange={(event) => setTeamText(event.target.value)} placeholder="Separe os nomes por vírgula" /><small className="field-hint">Ex.: Maryana, Lucas · assistente, Bianca · maquiagem</small></label></div>
            {submitted && !validStep && <p className="form-error">Preencha data, horário, local e prazo de entrega.</p>}
          </section>}

          {step === 3 && <section className="work-form-step">
            <div className="step-copy"><span>03</span><div><h3>Pacote e financeiro</h3><p>Registre o combinado, pagamentos e custos previstos.</p></div></div>
            <label className="field"><span>Pacote contratado *</span><input value={form.packageName} onChange={(event) => update("packageName", event.target.value)} placeholder="Ex.: Casamento Memórias Completas" /></label>
            <div className="field-grid finance-fields"><label className="field"><span>Moeda</span><select value={form.currency} onChange={(event) => update("currency", event.target.value as Currency)}><option value="BRL">Real (R$)</option><option value="EUR">Euro (€)</option></select></label><label className="field"><span>Valor total *</span><input type="number" min="0" value={form.totalValue || ""} onChange={(event) => update("totalValue", Number(event.target.value))} placeholder="0" /></label><label className="field"><span>Entrada recebida</span><input type="number" min="0" value={form.entryValue || ""} onChange={(event) => update("entryValue", Number(event.target.value))} placeholder="0" /></label><label className="field"><span>Parcelas</span><input type="number" min="1" max="24" value={form.installments} onChange={(event) => update("installments", Number(event.target.value))} /></label><label className="field"><span>Custos previstos</span><input type="number" min="0" value={form.costs || ""} onChange={(event) => update("costs", Number(event.target.value))} placeholder="Transporte, equipe..." /></label></div>
            <div className="finance-preview"><span><small>Total</small><strong>{formatMoney(form.totalValue, form.currency)}</strong></span><span><small>Saldo pendente</small><strong>{formatMoney(Math.max(0, form.totalValue - form.entryValue), form.currency)}</strong></span><span><small>Resultado previsto</small><strong>{formatMoney(Math.max(0, form.totalValue - form.costs), form.currency)}</strong></span></div>
            {submitted && !validStep && <p className="form-error">Informe o pacote e um valor total maior que zero.</p>}
          </section>}

          {step === 4 && <section className="work-form-step">
            <div className="step-copy"><span>04</span><div><h3>Etapas, fotos e arquivos</h3><p>Personalize o fluxo e centralize os materiais do trabalho.</p></div></div>
            <div className="stage-list">{form.stages.map((stage) => <div key={stage.id}><button type="button" className={stage.done ? "checked" : ""} onClick={() => update("stages", form.stages.map((item) => item.id === stage.id ? { ...item, done: !item.done } : item))}><span>{stage.done ? "✓" : ""}</span>{stage.label}</button>{stage.id.startsWith("custom-") && <button type="button" className="remove-stage" onClick={() => update("stages", form.stages.filter((item) => item.id !== stage.id))} aria-label={`Remover ${stage.label}`}>×</button>}</div>)}</div>
            <div className="add-stage"><input value={customStage} onChange={(event) => setCustomStage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addStage(); } }} placeholder="Nome de uma etapa personalizada" /><button type="button" onClick={addStage}>＋ Adicionar</button></div>
            <div className="photo-fields"><label><span>Tiradas</span><input type="number" min="0" value={form.photos.captured || ""} onChange={(event) => update("photos", { ...form.photos, captured: Number(event.target.value) })} /></label><label><span>Selecionadas</span><input type="number" min="0" value={form.photos.selected || ""} onChange={(event) => update("photos", { ...form.photos, selected: Number(event.target.value) })} /></label><label><span>Editadas</span><input type="number" min="0" value={form.photos.edited || ""} onChange={(event) => update("photos", { ...form.photos, edited: Number(event.target.value) })} /></label><label><span>Entregues</span><input type="number" min="0" value={form.photos.delivered || ""} onChange={(event) => update("photos", { ...form.photos, delivered: Number(event.target.value) })} /></label></div>
            <div className="file-drop"><input ref={fileRef} type="file" multiple hidden onChange={onFiles} /><button type="button" onClick={() => fileRef.current?.click()}><span>＋</span><strong>Anexar arquivos</strong><small>Contrato, referências, comprovantes e outros materiais</small></button>{form.attachments.length > 0 && <div className="attachment-list">{form.attachments.map((name, index) => <span key={`${name}-${index}`}>▧ {name}<button type="button" onClick={() => update("attachments", form.attachments.filter((_, fileIndex) => fileIndex !== index))}>×</button></span>)}</div>}</div>
          </section>}

          {step === 5 && <section className="work-form-step">
            <div className="step-copy"><span>05</span><div><h3>Revise antes de criar</h3><p>Os dados poderão ser alterados na ficha do trabalho.</p></div></div>
            <div className="work-review-hero"><span className="status-badge status-planning">Planejamento</span><strong>{form.title || "Trabalho sem título"}</strong><small>{form.category} · {form.clientIds.map((id) => clients.find((client) => client.id === id)?.name).filter(Boolean).join(" + ")}</small></div>
            <div className="review-grid"><div><small>SESSÃO</small><strong>{formatDate(form.date)} · {form.time}</strong><span>{form.location}</span></div><div><small>ENTREGA</small><strong>{formatDate(form.deliveryDate)}</strong><span>Alerta no Dashboard e calendário</span></div><div><small>PACOTE</small><strong>{form.packageName}</strong><span>{formatMoney(form.totalValue, form.currency)} · {form.installments}x</span></div><div><small>PRODUÇÃO</small><strong>{form.stages.length} etapas</strong><span>{form.team.length || 1} pessoa(s) · {form.attachments.length} arquivo(s)</span></div></div>
            <div className="review-note"><span>◇</span><p><strong>Cadastro demonstrativo</strong>Este trabalho ficará disponível enquanto o app estiver aberto. A persistência virá quando conectarmos o banco.</p></div>
          </section>}
        </div>
        <footer className="work-drawer-footer"><button className="cancel-button" type="button" onClick={step === 1 ? onClose : () => { setSubmitted(false); setStep((current) => current - 1); }}>{step === 1 ? "Cancelar" : "← Voltar"}</button><span>{step} de 5</span>{step < 5 ? <button className="primary-button" type="button" onClick={goNext}>Continuar →</button> : <button className="primary-button" type="button" onClick={save}>Criar trabalho</button>}</footer>
      </aside>
    </div>
  );
}

function AgendaView({ works, clients, customEvents, setCustomEvents, initialView, onOpenWork, toast }: {
  works: Work[];
  clients: Client[];
  customEvents: AgendaEvent[];
  setCustomEvents: Dispatch<SetStateAction<AgendaEvent[]>>;
  initialView: AgendaViewMode;
  onOpenWork: (work: Work) => void;
  toast: (message: string) => void;
}) {
  const [view, setView] = useState<AgendaViewMode>(initialView);
  const [focusDate, setFocusDate] = useState("2026-08-02");
  const [kindFilter, setKindFilter] = useState<"all" | AgendaEventKind>("all");
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [dayPanelOpen, setDayPanelOpen] = useState(false);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [movedDates, setMovedDates] = useState<Record<string, string>>({});
  const [conflictWarning, setConflictWarning] = useState(false);
  const [draft, setDraft] = useState<Omit<AgendaEvent, "id" | "status" | "source">>({
    title: "", date: "2026-08-02", start: "09:00", end: "10:00", kind: "meeting", timezone: "America/Recife", recurrence: "none", reminder: "1 dia antes", location: "", notes: "",
  });

  const workEvents = useMemo<AgendaEvent[]>(() => works.flatMap((work) => {
    if (work.status === "archived" || work.status === "cancelled") return [];
    const sessionStage = work.stages.find((stage) => stage.label === "Sessão");
    const deliveryStage = work.stages.find((stage) => stage.label === "Entrega");
    const base: AgendaEvent[] = [
      { id: `work-${work.id}-session`, title: work.title, date: work.date, start: work.time || "09:00", end: endTime(work.time || "09:00", work.duration), kind: "session", status: statusForDate(work.date, Boolean(sessionStage?.done)), clientId: work.clientIds[0], workId: work.id, location: work.location, timezone: work.currency === "EUR" ? "Europe/Lisbon" : "America/Recife", recurrence: "none", reminder: "1 dia antes", external: !/studio|estúdio|video/i.test(work.location), source: "work" },
      { id: `work-${work.id}-delivery`, title: `Entrega · ${work.title}`, date: work.deliveryDate, start: "17:00", end: "18:00", kind: "delivery", status: statusForDate(work.deliveryDate, Boolean(deliveryStage?.done)), clientId: work.clientIds[0], workId: work.id, location: "Online", timezone: work.currency === "EUR" ? "Europe/Lisbon" : "America/Recife", recurrence: "none", reminder: "1 dia antes", source: "work" },
    ];
    const stages = work.stages
      .filter((stage) => !["Sessão", "Entrega"].includes(stage.label))
      .map((stage): AgendaEvent => {
        const date = stage.dueDate || inferredStageDate(work, work.stages.findIndex((item) => item.id === stage.id));
        const payment = stage.label.toLowerCase().includes("pagamento");
        return { id: `work-${work.id}-stage-${stage.id}`, title: `${stage.label} · ${work.title}`, date, start: payment ? "10:00" : "09:00", end: payment ? "10:30" : "10:00", kind: payment ? "payment" : "stage", status: statusForDate(date, stage.done), clientId: work.clientIds[0], workId: work.id, location: "Revelar.", timezone: work.currency === "EUR" ? "Europe/Lisbon" : "America/Recife", recurrence: "none", reminder: payment ? "1 dia antes" : "2 horas antes", source: "work" };
      });
    return [...base, ...stages];
  }), [works]);

  const allEvents = useMemo(() => {
    const expanded = [...workEvents, ...customEvents].flatMap((event) => {
      const occurrences: AgendaEvent[] = [{ ...event, status: event.source === "custom" ? statusForDate(event.date) : event.status }];
      if (event.recurrence === "weekly") {
        for (let index = 1; index <= 5; index += 1) occurrences.push({ ...event, id: `${event.id}-r${index}`, date: addDays(event.date, index * 7), status: statusForDate(addDays(event.date, index * 7)) });
      }
      if (event.recurrence === "monthly") {
        for (let index = 1; index <= 2; index += 1) {
          const date = new Date(`${event.date}T12:00:00`);
          date.setMonth(date.getMonth() + index);
          const value = date.toISOString().slice(0, 10);
          occurrences.push({ ...event, id: `${event.id}-r${index}`, date: value, status: statusForDate(value) });
        }
      }
      return occurrences;
    });
    return expanded.map((event) => movedDates[event.id] ? { ...event, date: movedDates[event.id], status: statusForDate(movedDates[event.id], event.status === "completed") } : event);
  }, [customEvents, movedDates, workEvents]);

  const visibleEvents = useMemo(() => allEvents.filter((event) => kindFilter === "all" || event.kind === kindFilter).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)), [allEvents, kindFilter]);
  const currentMonth = focusDate.slice(0, 7);
  const monthDays = useMemo(() => calendarDays(focusDate), [focusDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(focusDate), index)), [focusDate]);
  const eventsForDay = (date: string) => visibleEvents.filter((event) => event.date === date);
  const clientName = (id?: number) => clients.find((client) => client.id === id)?.name;
  const workName = (id?: number) => works.find((work) => work.id === id)?.title;

  const movePeriod = (amount: number) => {
    const date = new Date(`${focusDate}T12:00:00`);
    if (view === "month") date.setMonth(date.getMonth() + amount);
    else if (view === "week") date.setDate(date.getDate() + amount * 7);
    else date.setDate(date.getDate() + amount);
    setFocusDate(date.toISOString().slice(0, 10));
  };

  const openDay = (date: string) => {
    setFocusDate(date);
    setSelectedEvent(null);
    setDayPanelOpen(true);
  };

  const openNewEvent = (date = focusDate) => {
    setDraft({ title: "", date, start: "09:00", end: "10:00", kind: "meeting", timezone: "America/Recife", recurrence: "none", reminder: "1 dia antes", location: "", notes: "" });
    setConflictWarning(false);
    setDayPanelOpen(false);
    setNewEventOpen(true);
  };

  const hasConflict = allEvents.some((event) => event.date === draft.date && event.start < draft.end && event.end > draft.start);
  const saveEvent = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    if (hasConflict && !conflictWarning) {
      setConflictWarning(true);
      return;
    }
    setCustomEvents((current) => [...current, { ...draft, id: `event-${Date.now()}`, status: statusForDate(draft.date), source: "custom" }]);
    setNewEventOpen(false);
    setFocusDate(draft.date);
    toast(hasConflict ? "Compromisso salvo mesmo com conflito de horário" : "Compromisso adicionado à agenda");
  };

  const dropEvent = (date: string, id: string) => {
    const event = allEvents.find((item) => item.id === id);
    if (!event || event.date === date) return;
    if (!window.confirm(`Mover “${event.title}” para ${agendaDateLabel(date, { day: "2-digit", month: "long" })}?`)) return;
    setMovedDates((current) => ({ ...current, [id]: date }));
    toast("Data do compromisso atualizada");
  };

  const eventButton = (event: AgendaEvent, compact = false) => (
    <button
      type="button"
      key={event.id}
      draggable
      className={`calendar-event kind-${event.kind} status-${event.status} ${compact ? "compact" : ""}`}
      onDragStart={(drag) => drag.dataTransfer.setData("text/plain", event.id)}
      onClick={(click) => { click.stopPropagation(); setSelectedEvent(event); setDayPanelOpen(false); }}
      title={`${event.start} · ${event.title}`}
    >
      <span>{event.start}</span><strong>{event.title}</strong>
    </button>
  );

  const title = view === "month"
    ? agendaDateLabel(monthStart(focusDate), { month: "long", year: "numeric" })
    : view === "week"
      ? `${agendaDateLabel(weekDays[0], { day: "2-digit", month: "short" })} — ${agendaDateLabel(weekDays[6], { day: "2-digit", month: "short", year: "numeric" })}`
      : agendaDateLabel(focusDate, { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="agenda-page">
      <section className="agenda-title-row">
        <div><p>ORGANIZAÇÃO</p><h1>Agenda</h1><span>Sessões, prazos, pagamentos e compromissos em um só calendário.</span></div>
        <button className="primary-button" type="button" onClick={() => openNewEvent()}>＋ Novo compromisso</button>
      </section>

      <section className="agenda-summary" aria-label="Resumo da agenda">
        <article><span>HOJE</span><strong>{eventsForDay("2026-08-02").length}</strong><small>compromissos</small></article>
        <article><span>PRÓXIMOS 7 DIAS</span><strong>{visibleEvents.filter((event) => event.date >= "2026-08-02" && event.date <= "2026-08-09").length}</strong><small>itens na agenda</small></article>
        <article><span>ATENÇÃO</span><strong>{visibleEvents.filter((event) => event.status === "late" || event.status === "soon").length}</strong><small>prazos e eventos</small></article>
        <article className="working-hours"><span>HORÁRIO DE TRABALHO</span><strong>Seg–Sáb · 08h–18h</strong><small>Domingos indisponíveis</small></article>
      </section>

      <section className="calendar-shell">
        <header className="calendar-toolbar">
          <div className="calendar-navigation"><button type="button" onClick={() => movePeriod(-1)} aria-label="Período anterior">‹</button><button type="button" className="today-button" onClick={() => setFocusDate("2026-08-02")}>Hoje</button><button type="button" onClick={() => movePeriod(1)} aria-label="Próximo período">›</button><h2>{title}</h2></div>
          <div className="calendar-controls">
            <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as "all" | AgendaEventKind)} aria-label="Filtrar agenda"><option value="all">Todos os tipos</option>{(Object.keys(agendaKindLabels) as AgendaEventKind[]).map((kind) => <option value={kind} key={kind}>{agendaKindLabels[kind]}</option>)}</select>
            <div className="calendar-view-switch" aria-label="Visualização do calendário">{(["month", "week", "day", "list"] as AgendaViewMode[]).map((mode) => <button type="button" key={mode} className={view === mode ? "active" : ""} onClick={() => setView(mode)}>{mode === "month" ? "Mês" : mode === "week" ? "Semana" : mode === "day" ? "Dia" : "Lista"}</button>)}</div>
          </div>
        </header>

        <div className="calendar-legend"><span><i className="kind-session" />Sessões</span><span><i className="kind-delivery" />Entregas</span><span><i className="kind-payment" />Pagamentos</span><span><i className="kind-meeting" />Compromissos</span><span><i className="status-late" />Atrasado</span><span><i className="status-completed" />Concluído</span></div>

        {view === "month" && <div className="month-calendar">
          {['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map((day) => <div className="weekday" key={day}>{day}</div>)}
          {monthDays.map((date) => {
            const dayEvents = eventsForDay(date);
            const sunday = new Date(`${date}T12:00:00`).getDay() === 0;
            return <div key={date} className={`calendar-day ${date.slice(0, 7) !== currentMonth ? "outside" : ""} ${date === "2026-08-02" ? "today" : ""} ${sunday ? "unavailable" : ""}`} onClick={() => openDay(date)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); dropEvent(date, event.dataTransfer.getData("text/plain")); }}>
              <button type="button" className="day-number" onClick={() => openDay(date)}>{new Date(`${date}T12:00:00`).getDate()}</button>
              <div className="day-events">{dayEvents.slice(0, 3).map((event) => eventButton(event, true))}{dayEvents.length > 3 && <button type="button" className="more-events" onClick={(event) => { event.stopPropagation(); openDay(date); }}>+ {dayEvents.length - 3} outros</button>}</div>
            </div>;
          })}
        </div>}

        {view === "week" && <div className="week-calendar">{weekDays.map((date) => <section key={date} className={date === "2026-08-02" ? "today" : ""} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropEvent(date, event.dataTransfer.getData("text/plain"))}><button type="button" className="week-day-heading" onClick={() => { setFocusDate(date); setView("day"); }}><span>{agendaDateLabel(date, { weekday: "short" })}</span><strong>{new Date(`${date}T12:00:00`).getDate()}</strong></button><div className="week-day-events">{eventsForDay(date).map((event) => eventButton(event))}{eventsForDay(date).length === 0 && <button type="button" className="empty-day-add" onClick={() => openNewEvent(date)}>＋ Adicionar</button>}</div></section>)}</div>}

        {view === "day" && <div className="day-agenda"><aside><strong>{new Date(`${focusDate}T12:00:00`).getDate()}</strong><span>{agendaDateLabel(focusDate, { weekday: "long", month: "long" })}</span><small>Horário disponível · 08:00–18:00</small></aside><div>{eventsForDay(focusDate).length ? eventsForDay(focusDate).map((event) => <article key={event.id} className={`agenda-list-event kind-${event.kind} status-${event.status}`} onClick={() => setSelectedEvent(event)}><time>{event.start}<small>{event.end}</small></time><div><span>{agendaKindLabels[event.kind]}</span><strong>{event.title}</strong><small>{event.location || "Local não informado"}{clientName(event.clientId) ? ` · ${clientName(event.clientId)}` : ""}</small></div><b>›</b></article>) : <div className="agenda-empty"><span>○</span><h3>Dia livre</h3><p>Nenhum compromisso marcado.</p><button className="outline-button" type="button" onClick={() => openNewEvent(focusDate)}>＋ Adicionar compromisso</button></div>}</div></div>}

        {view === "list" && <div className="agenda-list-view">{visibleEvents.filter((event) => event.date >= monthStart(focusDate) && event.date < addDays(monthStart(focusDate), 40)).map((event, index, list) => <div key={event.id} className="agenda-list-group">{(index === 0 || list[index - 1].date !== event.date) && <button type="button" className="list-date" onClick={() => { setFocusDate(event.date); setView("day"); }}><strong>{new Date(`${event.date}T12:00:00`).getDate()}</strong><span>{agendaDateLabel(event.date, { weekday: "long", month: "long" })}</span></button>}<article className={`agenda-list-event kind-${event.kind} status-${event.status}`} onClick={() => setSelectedEvent(event)}><time>{event.start}<small>{event.end}</small></time><div><span>{agendaKindLabels[event.kind]}</span><strong>{event.title}</strong><small>{event.location || "Local não informado"}{clientName(event.clientId) ? ` · ${clientName(event.clientId)}` : ""}</small></div><b>›</b></article></div>)}</div>}
      </section>

      {dayPanelOpen && <div className="drawer-backdrop" role="presentation" onMouseDown={() => setDayPanelOpen(false)}><aside className="agenda-side-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><p>AGENDA DO DIA</p><h2>{agendaDateLabel(focusDate, { weekday: "long", day: "2-digit", month: "long" })}</h2></div><button type="button" onClick={() => setDayPanelOpen(false)}>×</button></header><div className="agenda-panel-body">{eventsForDay(focusDate).length ? eventsForDay(focusDate).map((event) => <article key={event.id} className={`panel-event kind-${event.kind}`} onClick={() => { setDayPanelOpen(false); setSelectedEvent(event); }}><time>{event.start}</time><div><span>{agendaKindLabels[event.kind]}</span><strong>{event.title}</strong><small>{event.location || "Sem local"}</small></div><b>›</b></article>) : <div className="agenda-empty"><span>○</span><h3>Nenhum compromisso</h3><p>Este dia está livre na agenda.</p></div>}</div><footer><button className="primary-button" type="button" onClick={() => openNewEvent(focusDate)}>＋ Adicionar neste dia</button></footer></aside></div>}

      {selectedEvent && <div className="drawer-backdrop" role="presentation" onMouseDown={() => setSelectedEvent(null)}><aside className="agenda-side-panel event-detail-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><p>{agendaKindLabels[selectedEvent.kind].toUpperCase()}</p><h2>{selectedEvent.title}</h2></div><button type="button" onClick={() => setSelectedEvent(null)}>×</button></header><div className="agenda-panel-body"><div className={`event-status-banner status-${selectedEvent.status}`}><i />{selectedEvent.status === "late" ? "Atrasado" : selectedEvent.status === "soon" ? "Próximo do prazo" : selectedEvent.status === "completed" ? "Concluído" : "Agendado"}</div><dl className="event-facts"><div><dt>Data</dt><dd>{agendaDateLabel(selectedEvent.date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</dd></div><div><dt>Horário</dt><dd>{selectedEvent.start}–{selectedEvent.end}</dd></div><div><dt>Fuso horário</dt><dd>{selectedEvent.timezone === "America/Recife" ? "Recife (Brasil)" : "Lisboa (Portugal)"}</dd></div><div><dt>Lembrete</dt><dd>{selectedEvent.reminder}</dd></div><div><dt>Local</dt><dd>{selectedEvent.location || "Não informado"}</dd></div>{clientName(selectedEvent.clientId) && <div><dt>Cliente</dt><dd>{clientName(selectedEvent.clientId)}</dd></div>}{workName(selectedEvent.workId) && <div><dt>Trabalho</dt><dd>{workName(selectedEvent.workId)}</dd></div>}</dl>{selectedEvent.notes && <section className="event-notes"><span>OBSERVAÇÕES</span><p>{selectedEvent.notes}</p></section>}{selectedEvent.external && <section className="event-weather"><div><span>PREVISÃO DEMONSTRATIVA</span><strong>24° · Parcialmente nublado</strong></div><div><span>PÔR DO SOL</span><strong>17:31</strong></div><p>Condições e horário serão atualizados automaticamente quando o módulo de clima for conectado.</p></section>}</div>{selectedEvent.workId && <footer><button className="primary-button" type="button" onClick={() => { const work = works.find((item) => item.id === selectedEvent.workId); if (work) onOpenWork(work); }}>Abrir trabalho completo</button></footer>}</aside></div>}

      {newEventOpen && <div className="drawer-backdrop" role="presentation" onMouseDown={() => setNewEventOpen(false)}><aside className="agenda-side-panel new-event-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><p>NOVO COMPROMISSO</p><h2>Adicionar à agenda</h2></div><button type="button" onClick={() => setNewEventOpen(false)}>×</button></header><form onSubmit={saveEvent}><div className="agenda-panel-body"><label className="field full"><span>Título *</span><input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Reunião com cliente" /></label><div className="field-grid"><label className="field"><span>Data</span><input type="date" value={draft.date} onChange={(event) => { setDraft({ ...draft, date: event.target.value }); setConflictWarning(false); }} /></label><label className="field"><span>Tipo</span><select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as AgendaEventKind })}>{(["meeting", "personal", "session", "blocked"] as AgendaEventKind[]).map((kind) => <option value={kind} key={kind}>{agendaKindLabels[kind]}</option>)}</select></label><label className="field"><span>Início</span><input type="time" value={draft.start} onChange={(event) => { setDraft({ ...draft, start: event.target.value }); setConflictWarning(false); }} /></label><label className="field"><span>Fim</span><input type="time" value={draft.end} onChange={(event) => { setDraft({ ...draft, end: event.target.value }); setConflictWarning(false); }} /></label><label className="field"><span>Fuso horário</span><select value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value as EventTimezone })}><option value="America/Recife">Recife (Brasil)</option><option value="Europe/Lisbon">Lisboa (Portugal)</option></select></label><label className="field"><span>Repetição</span><select value={draft.recurrence} onChange={(event) => setDraft({ ...draft, recurrence: event.target.value as EventRecurrence })}><option value="none">Não repetir</option><option value="weekly">Toda semana</option><option value="monthly">Todo mês</option></select></label><label className="field"><span>Lembrete</span><select value={draft.reminder} onChange={(event) => setDraft({ ...draft, reminder: event.target.value })}><option>1 dia antes</option><option>2 horas antes</option><option>30 minutos antes</option><option>Sem lembrete</option></select></label><label className="field"><span>Cliente (opcional)</span><select value={draft.clientId || ""} onChange={(event) => setDraft({ ...draft, clientId: event.target.value ? Number(event.target.value) : undefined })}><option value="">Nenhum cliente</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label><label className="field full"><span>Trabalho (opcional)</span><select value={draft.workId || ""} onChange={(event) => setDraft({ ...draft, workId: event.target.value ? Number(event.target.value) : undefined })}><option value="">Nenhum trabalho</option>{works.map((work) => <option value={work.id} key={work.id}>{work.title}</option>)}</select></label><label className="field full"><span>Local</span><input value={draft.location || ""} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="Endereço, estúdio ou videochamada" /></label><label className="field full"><span>Observações</span><textarea rows={3} value={draft.notes || ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label></div>{hasConflict && <div className={`calendar-conflict ${conflictWarning ? "confirmed" : ""}`}><span>!</span><div><strong>Conflito de horário</strong><p>Já existe outro compromisso neste período. Você ainda pode salvar.</p></div></div>}</div><footer><button className="cancel-button" type="button" onClick={() => setNewEventOpen(false)}>Cancelar</button><button className="primary-button" type="submit">{hasConflict && conflictWarning ? "Salvar mesmo assim" : "Salvar compromisso"}</button></footer></form></aside></div>}
    </div>
  );
}

export default function Home() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [palette, setPalette] = useState<Palette>("essencia");
  const [currency, setCurrency] = useState<Currency>("BRL");
  const [activeNav, setActiveNav] = useState("Visão geral");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [clientSearch, setClientSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<"all" | ClientType>("all");
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [works, setWorks] = useState<Work[]>(initialWorks);
  const [workViewMode, setWorkViewMode] = useState<ViewMode>("list");
  const [workSearch, setWorkSearch] = useState("");
  const [workStatus, setWorkStatus] = useState<"all" | WorkStatus>("all");
  const [workCategory, setWorkCategory] = useState<"all" | WorkCategory>("all");
  const [newWorkOpen, setNewWorkOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>(initialAgendaEvents);
  const [agendaInitialView, setAgendaInitialView] = useState<AgendaViewMode>("month");
  const resolvedTheme = useResolvedTheme(themeMode);

  useEffect(() => {
    const savedMode = localStorage.getItem("revelar-theme") as ThemeMode | null;
    const savedPalette = localStorage.getItem("revelar-palette") as Palette | null;
    const savedCurrency = localStorage.getItem("revelar-currency") as Currency | null;
    const savedView = localStorage.getItem("revelar-client-view") as ViewMode | null;
    const savedWorkView = localStorage.getItem("revelar-work-view") as ViewMode | null;
    const timer = window.setTimeout(() => {
      if (savedMode) setThemeMode(savedMode);
      if (savedPalette) setPalette(savedPalette);
      if (savedCurrency) setCurrency(savedCurrency);
      if (savedView) setViewMode(savedView);
      if (savedWorkView) setWorkViewMode(savedWorkView);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("revelar-theme", themeMode);
    localStorage.setItem("revelar-palette", palette);
    localStorage.setItem("revelar-currency", currency);
    localStorage.setItem("revelar-client-view", viewMode);
    localStorage.setItem("revelar-work-view", workViewMode);
  }, [themeMode, palette, currency, viewMode, workViewMode]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const money = useMemo(() => currency === "BRL" ? { pending: "R$ 1.850", month: "R$ 8.920" } : { pending: "€ 298", month: "€ 1.438" }, [currency]);

  const navigate = (label: string) => {
    setSearchOpen(false);
    if (label === "Visão geral" || label === "Agenda" || label === "Clientes" || label === "Trabalhos") {
      if (label === "Agenda") {
        setAgendaInitialView(window.matchMedia("(max-width: 720px)").matches ? "list" : "month");
      }
      setSelectedWorkId(null);
      setActiveNav(label);
      return;
    }
    setToast(`${label} será o próximo módulo do Revelar.`);
  };

  const saveClient = (data: NewClientData) => {
    const date = data.birthday || data.weddingDate || data.otherDate;
    const dateLabel = data.birthday ? (data.type === "company" ? "Aniversário da marca" : "Aniversário") : data.weddingDate ? "Aniversário de casamento" : data.otherDateLabel || "Data importante";
    setClients((current) => [{
      id: Math.max(...current.map((client) => client.id), 0) + 1,
      type: data.type,
      name: data.name,
      whatsapp: data.whatsapp || "WhatsApp não informado",
      instagram: data.instagram || "Instagram não informado",
      email: data.email,
      avatar: data.avatar,
      workCount: 0,
      lastWork: "Nenhum trabalho ainda",
      nextDate: date ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`)).replace(".", "") : undefined,
      nextDateLabel: date ? dateLabel : undefined,
      tag: data.type === "company" ? "Empresa" : "Novo cliente",
    }, ...current]);
    setNewClientOpen(false);
    setToast(`${data.name} foi adicionado aos clientes`);
  };

  const openClient = (client: Client) => setToast(`Abrindo ficha de ${client.name}`);
  const saveWork = (data: NewWorkData) => {
    const completedStages = data.stages.filter((stage) => stage.done).length;
    const status: WorkStatus = completedStages >= data.stages.length ? "completed" : completedStages >= 7 ? "delivery" : completedStages >= 6 ? "editing" : data.date ? "scheduled" : "planning";
    setWorks((current) => [{ ...data, id: Math.max(...current.map((work) => work.id), 0) + 1, status }, ...current]);
    setNewWorkOpen(false);
    setActiveNav("Trabalhos");
    setToast(`${data.title} foi criado com ${data.stages.length} etapas`);
  };
  const openWork = (work: Work) => setSelectedWorkId(work.id);
  const updateWork = (updated: Work) => setWorks((current) => current.map((work) => work.id === updated.id ? updated : work));
  const duplicateWork = (work: Work) => {
    const id = Math.max(...works.map((item) => item.id), 0) + 1;
    const copy: Work = { ...work, id, title: `${work.title} · cópia`, status: "planning", stages: work.stages.map((stage, index) => ({ ...stage, id: `w${id}-${index}`, done: false, checklist: stage.checklist?.map((item, checkIndex) => ({ ...item, id: `w${id}-${index}-check-${checkIndex}`, done: false })) })) };
    setWorks((current) => [copy, ...current]);
    setSelectedWorkId(id);
    setToast("Trabalho duplicado. Ajuste datas e informações antes de usar.");
  };
  const archiveWork = (work: Work) => { updateWork({ ...work, status: "archived" }); setSelectedWorkId(null); setToast(`${work.title} foi arquivado`); };
  const cancelWork = (work: Work) => { updateWork({ ...work, status: "cancelled" }); setSelectedWorkId(null); setToast(`${work.title} foi cancelado e mantido no histórico`); };
  const isClients = activeNav === "Clientes";
  const isWorks = activeNav === "Trabalhos";
  const isAgenda = activeNav === "Agenda";
  const selectedWork = works.find((work) => work.id === selectedWorkId);

  return (
    <div className={`revelar-app theme-${resolvedTheme} palette-${palette}`}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark" aria-hidden="true">R.</div><div><strong>Revelar.</strong><span>Fotografia & gestão</span></div></div>
        <nav className="side-nav" aria-label="Navegação principal">
          <p>PRINCIPAL</p>
          {navItems.slice(0, 4).map((item) => <button key={item.label} className={activeNav === item.label ? "active" : ""} onClick={() => navigate(item.label)} type="button"><span>{item.icon}</span>{item.label}</button>)}
          <p className="nav-group">GESTÃO</p>
          {navItems.slice(4).map((item) => <button key={item.label} className={activeNav === item.label ? "active" : ""} onClick={() => navigate(item.label)} type="button"><span>{item.icon}</span>{item.label}</button>)}
        </nav>
        <div className="sidebar-bottom"><button type="button" onClick={() => setSettingsOpen(true)}><span>⚙</span> Configurações</button><button className="profile" type="button" onClick={() => setToast("Perfil da Maryana")}><span className="avatar">M</span><span><strong>Maryana</strong><small>Fotógrafa</small></span><b>›</b></button></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-logo">R.</div>
          <label className={`search ${searchOpen ? "open" : ""}`}><span>⌕</span><input aria-label="Buscar no Revelar" placeholder={isClients ? "Buscar clientes..." : isWorks ? "Buscar trabalhos..." : "Buscar clientes, trabalhos..."} value={isClients ? clientSearch : isWorks ? workSearch : ""} onChange={(event) => isClients ? setClientSearch(event.target.value) : isWorks && setWorkSearch(event.target.value)} readOnly={!isClients && !isWorks} /></label>
          <div className="top-actions">
            <button className="icon-button mobile-search" type="button" onClick={() => setSearchOpen(!searchOpen)} aria-label="Abrir busca">⌕</button>
            <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} aria-label="Moeda"><option value="BRL">R$</option><option value="EUR">€</option></select>
            <button className="icon-button" type="button" onClick={() => setThemeMode(resolvedTheme === "light" ? "dark" : "light")} aria-label="Alternar tema">{resolvedTheme === "light" ? "☾" : "☀"}</button>
            <button className="icon-button notification" type="button" onClick={() => setToast("Você não tem novas notificações")} aria-label="Notificações">♢<i /></button>
          </div>
        </header>

        {selectedWork ? <WorkDetails key={selectedWork.id} work={selectedWork} clients={clients} onBack={() => setSelectedWorkId(null)} onUpdate={updateWork} onDuplicate={duplicateWork} onArchive={archiveWork} onCancel={cancelWork} toast={setToast} /> : isAgenda ? <AgendaView works={works} clients={clients} customEvents={agendaEvents} setCustomEvents={setAgendaEvents} initialView={agendaInitialView} onOpenWork={openWork} toast={setToast} /> : isClients ? <ClientsView clients={clients} viewMode={viewMode} setViewMode={setViewMode} search={clientSearch} setSearch={setClientSearch} filter={clientFilter} setFilter={setClientFilter} onNewClient={() => setNewClientOpen(true)} onOpenClient={openClient} /> : isWorks ? <WorksView works={works} clients={clients} viewMode={workViewMode} setViewMode={setWorkViewMode} search={workSearch} setSearch={setWorkSearch} status={workStatus} setStatus={setWorkStatus} category={workCategory} setCategory={setWorkCategory} onNewWork={() => setNewWorkOpen(true)} onOpenWork={openWork} /> : <Dashboard money={money} works={works} navigate={navigate} toast={setToast} onNewWork={() => setNewWorkOpen(true)} />}
      </main>

      {!selectedWork && !isAgenda && <button className="floating-add" type="button" onClick={() => isClients ? setNewClientOpen(true) : setNewWorkOpen(true)} aria-label={isClients ? "Novo cliente" : "Novo trabalho"}>＋</button>}

      <nav className="mobile-nav" aria-label="Navegação móvel">
        {navItems.slice(0, 4).map((item) => <button type="button" key={item.label} className={activeNav === item.label ? "active" : ""} onClick={() => navigate(item.label)}><span>{item.icon}</span>{item.label === "Visão geral" ? "Início" : item.label}</button>)}
        <button type="button" onClick={() => setSettingsOpen(true)}><span>☰</span>Mais</button>
      </nav>

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><p>CONFIGURAÇÕES</p><h2 id="settings-title">Aparência</h2></div><button type="button" onClick={() => setSettingsOpen(false)} aria-label="Fechar">×</button></header>
            <div className="settings-section"><h3>Modo</h3><p>Escolha como o Revelar aparece para você.</p><div className="segmented">{(["system", "light", "dark"] as ThemeMode[]).map((mode) => <button type="button" key={mode} className={themeMode === mode ? "selected" : ""} onClick={() => setThemeMode(mode)}>{mode === "system" ? "◐ Automático" : mode === "light" ? "☀ Claro" : "☾ Escuro"}</button>)}</div></div>
            <div className="settings-section"><h3>Paleta</h3><p>Mude as cores sem perder a identidade profissional.</p><div className="palette-grid">{palettes.map((option) => <button type="button" key={option.id} className={palette === option.id ? "selected" : ""} onClick={() => setPalette(option.id)}><span className="color-dots">{option.colors.map((color) => <i key={color} style={{ background: color }} />)}</span><strong>{option.name}</strong><small>{palette === option.id ? "Ativo" : "Visualizar"}</small></button>)}</div></div>
            <footer><button className="primary-button" type="button" onClick={() => { setSettingsOpen(false); setToast("Aparência salva neste dispositivo"); }}>Salvar aparência</button></footer>
          </section>
        </div>
      )}

      {newClientOpen && <NewClientDrawer clients={clients} onClose={() => setNewClientOpen(false)} onSave={saveClient} />}
      {newWorkOpen && <NewWorkDrawer clients={clients} onClose={() => setNewWorkOpen(false)} onSave={saveWork} />}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}
