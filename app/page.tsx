"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ThemeMode = "light" | "dark" | "system";
type Palette = "essencia" | "terracota" | "rose" | "mono" | "lune";
type Currency = "BRL" | "EUR";
type ViewMode = "list" | "cards";
type ClientType = "person" | "company";
type WorkStatus = "planning" | "scheduled" | "editing" | "delivery" | "completed";
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

type WorkStage = { id: string; label: string; done: boolean };

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

const defaultStages = ["Orçamento", "Contrato", "Pagamento", "Preparação", "Sessão", "Seleção", "Edição", "Entrega"];

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
    stages: defaultStages.map((label, index) => ({ id: `w1-${index}`, label, done: index < 6 })),
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
    stages: defaultStages.map((label, index) => ({ id: `w2-${index}`, label, done: index < 7 })),
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
    stages: defaultStages.map((label, index) => ({ id: `w3-${index}`, label, done: index < 4 })),
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
    stages: defaultStages.map((label, index) => ({ id: `w4-${index}`, label, done: index < 6 })),
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
    stages: defaultStages.map((label, index) => ({ id: `w5-${index}`, label, done: index < 2 })),
    attachments: ["inspiracoes.pdf"],
  },
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
  const active = works.filter((work) => work.status !== "completed").length;
  const scheduled = works.filter((work) => work.status === "scheduled" || work.status === "planning").length;
  const urgent = works.filter((work) => work.status !== "completed" && work.deliveryDate <= "2026-08-12").length;
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

function makeEmptyWork(): NewWorkData {
  return {
    title: "", category: "Casamento", clientIds: [], date: "", time: "", duration: "", location: "", team: ["Maryana"], deliveryDate: "", packageName: "", currency: "BRL", totalValue: 0, entryValue: 0, installments: 1, costs: 0,
    photos: { captured: 0, selected: 0, edited: 0, delivered: 0 },
    stages: defaultStages.map((label, index) => ({ id: `new-${index}`, label, done: false })), attachments: [],
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
    update("stages", [...form.stages, { id: `custom-${Date.now()}`, label, done: false }]);
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
    if (label === "Visão geral" || label === "Clientes" || label === "Trabalhos") {
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
    const status: WorkStatus = completedStages >= 7 ? "delivery" : completedStages >= 5 ? "editing" : data.date ? "scheduled" : "planning";
    setWorks((current) => [{ ...data, id: Math.max(...current.map((work) => work.id), 0) + 1, status }, ...current]);
    setNewWorkOpen(false);
    setActiveNav("Trabalhos");
    setToast(`${data.title} foi criado com ${data.stages.length} etapas`);
  };
  const openWork = (work: Work) => setToast(`Abrindo ${work.title}`);
  const isClients = activeNav === "Clientes";
  const isWorks = activeNav === "Trabalhos";

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

        {isClients ? <ClientsView clients={clients} viewMode={viewMode} setViewMode={setViewMode} search={clientSearch} setSearch={setClientSearch} filter={clientFilter} setFilter={setClientFilter} onNewClient={() => setNewClientOpen(true)} onOpenClient={openClient} /> : isWorks ? <WorksView works={works} clients={clients} viewMode={workViewMode} setViewMode={setWorkViewMode} search={workSearch} setSearch={setWorkSearch} status={workStatus} setStatus={setWorkStatus} category={workCategory} setCategory={setWorkCategory} onNewWork={() => setNewWorkOpen(true)} onOpenWork={openWork} /> : <Dashboard money={money} works={works} navigate={navigate} toast={setToast} onNewWork={() => setNewWorkOpen(true)} />}
      </main>

      <button className="floating-add" type="button" onClick={() => isClients ? setNewClientOpen(true) : setNewWorkOpen(true)} aria-label={isClients ? "Novo cliente" : "Novo trabalho"}>＋</button>

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
