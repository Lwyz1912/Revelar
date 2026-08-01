"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ThemeMode = "light" | "dark" | "system";
type Palette = "essencia" | "terracota" | "rose" | "mono" | "lune";
type Currency = "BRL" | "EUR";
type ViewMode = "list" | "cards";
type ClientType = "person" | "company";

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

const jobs = [
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

function Dashboard({ money, navigate, toast }: { money: { pending: string; month: string }; navigate: (label: string) => void; toast: (message: string) => void }) {
  return (
    <div className="dashboard">
      <section className="welcome-row">
        <div>
          <p>SÁBADO, 1 DE AGOSTO</p>
          <h1>Boa tarde, Maryana</h1>
          <span>Aqui está um resumo do seu estúdio hoje.</span>
        </div>
        <button className="primary-button desktop-new" type="button" onClick={() => toast("Novo trabalho iniciado")}>＋ Novo trabalho</button>
      </section>

      <section className="metrics" aria-label="Resumo do estúdio">
        <article className="metric-card"><span className="metric-icon green">▣</span><div><p>ENSAIOS HOJE</p><strong>2</strong><small>Próximo às 15:30</small></div></article>
        <article className="metric-card"><span className="metric-icon gold">◫</span><div><p>FOTOS PARA EDITAR</p><strong>286</strong><small>Em 3 trabalhos</small></div></article>
        <article className="metric-card"><span className="metric-icon rose">⌛</span><div><p>ENTREGAS PENDENTES</p><strong>4</strong><small>1 vence amanhã</small></div></article>
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
            {jobs.map((job) => (
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
  const resolvedTheme = useResolvedTheme(themeMode);

  useEffect(() => {
    const savedMode = localStorage.getItem("revelar-theme") as ThemeMode | null;
    const savedPalette = localStorage.getItem("revelar-palette") as Palette | null;
    const savedCurrency = localStorage.getItem("revelar-currency") as Currency | null;
    const savedView = localStorage.getItem("revelar-client-view") as ViewMode | null;
    const timer = window.setTimeout(() => {
      if (savedMode) setThemeMode(savedMode);
      if (savedPalette) setPalette(savedPalette);
      if (savedCurrency) setCurrency(savedCurrency);
      if (savedView) setViewMode(savedView);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("revelar-theme", themeMode);
    localStorage.setItem("revelar-palette", palette);
    localStorage.setItem("revelar-currency", currency);
    localStorage.setItem("revelar-client-view", viewMode);
  }, [themeMode, palette, currency, viewMode]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const money = useMemo(() => currency === "BRL" ? { pending: "R$ 1.850", month: "R$ 8.920" } : { pending: "€ 298", month: "€ 1.438" }, [currency]);

  const navigate = (label: string) => {
    setSearchOpen(false);
    if (label === "Visão geral" || label === "Clientes") {
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
  const isClients = activeNav === "Clientes";

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
          <label className={`search ${searchOpen ? "open" : ""}`}><span>⌕</span><input aria-label="Buscar no Revelar" placeholder={isClients ? "Buscar clientes..." : "Buscar clientes, trabalhos..."} value={isClients ? clientSearch : ""} onChange={(event) => isClients && setClientSearch(event.target.value)} readOnly={!isClients} /></label>
          <div className="top-actions">
            <button className="icon-button mobile-search" type="button" onClick={() => setSearchOpen(!searchOpen)} aria-label="Abrir busca">⌕</button>
            <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} aria-label="Moeda"><option value="BRL">R$</option><option value="EUR">€</option></select>
            <button className="icon-button" type="button" onClick={() => setThemeMode(resolvedTheme === "light" ? "dark" : "light")} aria-label="Alternar tema">{resolvedTheme === "light" ? "☾" : "☀"}</button>
            <button className="icon-button notification" type="button" onClick={() => setToast("Você não tem novas notificações")} aria-label="Notificações">♢<i /></button>
          </div>
        </header>

        {isClients ? <ClientsView clients={clients} viewMode={viewMode} setViewMode={setViewMode} search={clientSearch} setSearch={setClientSearch} filter={clientFilter} setFilter={setClientFilter} onNewClient={() => setNewClientOpen(true)} onOpenClient={openClient} /> : <Dashboard money={money} navigate={navigate} toast={setToast} />}
      </main>

      <button className="floating-add" type="button" onClick={() => isClients ? setNewClientOpen(true) : setToast("Escolha: novo cliente ou novo ensaio")} aria-label={isClients ? "Novo cliente" : "Nova ação"}>＋</button>

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
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}
