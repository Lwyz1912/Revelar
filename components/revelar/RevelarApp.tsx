"use client";

import { useEffect, useMemo, useState } from "react";

import { navItems } from "@/config/navigation";
import { catalogKindLabels } from "@/config/labels";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import {
  initialAgendaEvents,
  initialClients,
  initialContracts,
  initialFinanceTransactions,
  initialProducts,
  initialQuotes,
  initialWorks,
} from "@/data/demo";
import { useStoredJsonState, useStoredTextState } from "@/hooks/use-persisted-state";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { buildContractFromQuote } from "@/lib/contracts";
import { quoteTotal, workTransactions } from "@/lib/finance";
import { addDays, todayIso } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { discountedProductPrice, productToQuoteKind } from "@/lib/products";
import { storageKeys } from "@/lib/storage";
import { createStages } from "@/lib/workflow";
import type {
  AgendaEvent,
  AgendaViewMode,
  AppSection,
  AvailableSection,
  Client,
  ClientType,
  Contract,
  Currency,
  FinanceTransaction,
  NewClientData,
  NewWorkData,
  Palette,
  Product,
  Quote,
  ThemeMode,
  ViewMode,
  Work,
  WorkCategory,
  WorkStatus,
} from "@/types/revelar";
import { AgendaView } from "@/components/modules/agenda/AgendaView";
import { ClientsView } from "@/components/modules/clients/ClientsView";
import { NewClientDrawer } from "@/components/modules/clients/NewClientDrawer";
import { ContractsView } from "@/components/modules/contracts/ContractsView";
import { Dashboard } from "@/components/modules/dashboard/Dashboard";
import { FinancialView } from "@/components/modules/finance/FinancialView";
import { ProductsView } from "@/components/modules/products/ProductsView";
import { QuotesView } from "@/components/modules/quotes/QuotesView";
import { NewWorkDrawer } from "@/components/modules/works/NewWorkDrawer";
import { WorkDetails } from "@/components/modules/works/WorkDetails";
import { WorksView } from "@/components/modules/works/WorksView";
import { SettingsModal } from "@/components/shared/SettingsModal";
import { HelpCenter } from "@/components/shared/HelpCenter";
import { Toast } from "@/components/shared/Toast";

export function RevelarApp() {
  const [themeMode, setThemeMode] = useStoredTextState<ThemeMode>(storageKeys.theme, "light", [
    "light",
    "dark",
    "system",
  ]);
  const [palette, setPalette] = useStoredTextState<Palette>(storageKeys.palette, "essencia", [
    "essencia",
    "terracota",
    "rose",
    "mono",
    "lune",
  ]);
  const [currency, setCurrency] = useStoredTextState<Currency>(storageKeys.currency, "BRL", [
    "BRL",
    "EUR",
  ]);
  const [activeNav, setActiveNav] = useState<AvailableSection>("Visão geral");
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [viewMode, setViewMode] = useStoredTextState<ViewMode>(storageKeys.clientView, "list", [
    "list",
    "cards",
  ]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<"all" | ClientType>("all");
  const [clients, setClients] = useStoredJsonState<Client[]>(storageKeys.clients, initialClients);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [works, setWorks] = useStoredJsonState<Work[]>(storageKeys.works, initialWorks);
  const [workViewMode, setWorkViewMode] = useStoredTextState<ViewMode>(
    storageKeys.workView,
    "list",
    ["list", "cards"],
  );
  const [workSearch, setWorkSearch] = useState("");
  const [workStatus, setWorkStatus] = useState<"all" | WorkStatus>("all");
  const [workCategory, setWorkCategory] = useState<"all" | WorkCategory>("all");
  const [newWorkOpen, setNewWorkOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);
  const [agendaEvents, setAgendaEvents] = useStoredJsonState<AgendaEvent[]>(
    storageKeys.agendaEvents,
    initialAgendaEvents,
  );
  const [agendaInitialView, setAgendaInitialView] = useState<AgendaViewMode>("month");
  const [transactions, setTransactions] = useStoredJsonState<FinanceTransaction[]>(
    storageKeys.transactions,
    initialFinanceTransactions,
  );
  const [products, setProducts] = useStoredJsonState<Product[]>(
    storageKeys.products,
    initialProducts,
  );
  const [quotes, setQuotes] = useStoredJsonState<Quote[]>(storageKeys.quotes, initialQuotes);
  const [contracts, setContracts] = useStoredJsonState<Contract[]>(
    storageKeys.contracts,
    initialContracts,
  );
  const resolvedTheme = useResolvedTheme(themeMode);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const money = useMemo(() => {
    const visibleTransactions = [...transactions, ...workTransactions(works)].filter(
      (transaction) => transaction.currency === currency,
    );
    const pending = visibleTransactions
      .filter(
        (transaction) =>
          transaction.type === "income" &&
          (transaction.status === "pending" || transaction.status === "late"),
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const received = visibleTransactions
      .filter((transaction) => transaction.type === "income" && transaction.status === "received")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      pending: formatMoney(pending, currency),
      month: formatMoney(received, currency),
    };
  }, [currency, transactions, works]);

  const navigate = (label: AppSection) => {
    setSearchOpen(false);
    const item = navItems.find((navigationItem) => navigationItem.label === label);
    if (item?.available) {
      if (label === "Agenda") {
        setAgendaInitialView(window.matchMedia("(max-width: 720px)").matches ? "list" : "month");
      }
      setSelectedWorkId(null);
      setActiveNav(label as AvailableSection);
      return;
    }
    setToast(`${label} será o próximo módulo do Revelar.`);
  };

  const saveClient = (data: NewClientData) => {
    const date = data.birthday || data.weddingDate || data.otherDate;
    const dateLabel = data.birthday
      ? data.type === "company"
        ? "Aniversário da marca"
        : "Aniversário"
      : data.weddingDate
        ? "Aniversário de casamento"
        : data.otherDateLabel || "Data importante";
    setClients((current) => [
      {
        id: Math.max(...current.map((client) => client.id), 0) + 1,
        type: data.type,
        name: data.name,
        whatsapp: data.whatsapp || "WhatsApp não informado",
        instagram: data.instagram || "Instagram não informado",
        email: data.email,
        avatar: data.avatar,
        workCount: 0,
        lastWork: "Nenhum trabalho ainda",
        nextDate: date
          ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
              .format(new Date(`${date}T12:00:00`))
              .replace(".", "")
          : undefined,
        nextDateLabel: date ? dateLabel : undefined,
        tag: data.type === "company" ? "Empresa" : "Novo cliente",
      },
      ...current,
    ]);
    setNewClientOpen(false);
    setToast(`${data.name} foi adicionado aos clientes`);
  };

  const openClient = (client: Client) => setToast(`Abrindo ficha de ${client.name}`);
  const saveWork = (data: NewWorkData) => {
    const completedStages = data.stages.filter((stage) => stage.done).length;
    const status: WorkStatus =
      completedStages >= data.stages.length
        ? "completed"
        : completedStages >= 7
          ? "delivery"
          : completedStages >= 6
            ? "editing"
            : data.date
              ? "scheduled"
              : "planning";
    setWorks((current) => [
      { ...data, id: Math.max(...current.map((work) => work.id), 0) + 1, status },
      ...current,
    ]);
    setNewWorkOpen(false);
    setActiveNav("Trabalhos");
    setToast(`${data.title} foi criado com ${data.stages.length} etapas`);
  };
  const openWork = (work: Work) => setSelectedWorkId(work.id);
  const updateWork = (updated: Work) =>
    setWorks((current) => current.map((work) => (work.id === updated.id ? updated : work)));
  const duplicateWork = (work: Work) => {
    const id = Math.max(...works.map((item) => item.id), 0) + 1;
    const copy: Work = {
      ...work,
      id,
      title: `${work.title} · cópia`,
      status: "planning",
      stages: work.stages.map((stage, index) => ({
        ...stage,
        id: `w${id}-${index}`,
        done: false,
        checklist: stage.checklist?.map((item, checkIndex) => ({
          ...item,
          id: `w${id}-${index}-check-${checkIndex}`,
          done: false,
        })),
      })),
    };
    setWorks((current) => [copy, ...current]);
    setSelectedWorkId(id);
    setToast("Trabalho duplicado. Ajuste datas e informações antes de usar.");
  };
  const archiveWork = (work: Work) => {
    updateWork({ ...work, status: "archived" });
    setSelectedWorkId(null);
    setToast(`${work.title} foi arquivado`);
  };
  const cancelWork = (work: Work) => {
    updateWork({ ...work, status: "cancelled" });
    setSelectedWorkId(null);
    setToast(`${work.title} foi cancelado e mantido no histórico`);
  };
  const convertQuoteToWork = (quote: Quote) => {
    const id = Math.max(...works.map((item) => item.id), 0) + 1;
    const client = clients.find((item) => item.id === quote.clientId);
    const work: Work = {
      id,
      title: quote.title,
      category: "Estúdio",
      clientIds: quote.clientId ? [quote.clientId] : [],
      status: "planning",
      date: "",
      time: "",
      duration: "",
      location: "",
      team: ["Maryana"],
      deliveryDate: "",
      packageName: quote.items
        .map((item) => item.description)
        .filter(Boolean)
        .join(" + "),
      currency: quote.currency,
      totalValue: quoteTotal(quote),
      entryValue: 0,
      installments: 1,
      costs: 0,
      costItems: [],
      photos: { captured: 0, selected: 0, edited: 0, delivered: 0 },
      stages: createStages(`w${id}`, 2),
      attachments: [`orcamento-${quote.id}.pdf`],
    };
    setWorks((current) => [work, ...current]);
    setSelectedWorkId(id);
    setActiveNav("Trabalhos");
    setToast(`Orçamento de ${client?.name || "cliente"} convertido em trabalho`);
  };
  const createContractFromQuote = (quote: Quote) => {
    const id = Math.max(...contracts.map((item) => item.id), 0) + 1;
    const client = clients.find((item) => item.id === quote.clientId);
    setContracts((current) => [
      {
        id,
        title: `Contrato · ${quote.title}`,
        clientId: quote.clientId,
        quoteId: quote.id,
        status: "draft",
        template: "standard",
        updatedAt: "Agora",
        content: buildContractFromQuote({
          clientName: client?.name || "{{cliente}}",
          quoteTitle: quote.title,
          formattedTotal: formatMoney(quoteTotal(quote), quote.currency),
        }),
      },
      ...current,
    ]);
    setActiveNav("Contratos");
    setToast("Contrato criado a partir do orçamento aprovado");
  };
  const sellProduct = (
    product: Product,
    clientId: number | undefined,
    quantity: number,
    options: string[],
    total: number,
  ) => {
    const client = clients.find((item) => item.id === clientId);
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? {
              ...item,
              sales: item.sales + quantity,
              availableQuantity:
                item.availability === "unlimited"
                  ? item.availableQuantity
                  : Math.max(0, (item.availableQuantity || 0) - quantity),
            }
          : item,
      ),
    );
    setTransactions((current) => [
      {
        id: `product-sale-${Date.now()}`,
        type: "income",
        scope: "professional",
        description: `Venda · ${product.name}`,
        amount: total,
        currency: product.currency,
        date: todayIso(),
        category: catalogKindLabels[product.kind],
        tags: [product.kind, ...options],
        account: "Conta principal",
        paymentMethod: "Pix / transferência",
        status: "received",
        origin: client?.name || "Venda direta sem cliente",
      },
      ...current,
    ]);
    setToast(`Venda de ${product.name} registrada no Financeiro`);
  };
  const createQuoteFromProduct = (product: Product) => {
    const id = Math.max(...quotes.map((item) => item.id), 0) + 1;
    const unitPrice = product.priceType === "consult" ? 0 : discountedProductPrice(product);
    setQuotes((current) => [
      {
        id,
        title: product.name,
        clientId: clients[0]?.id,
        currency: product.currency,
        items: [
          {
            id: `product-${product.id}-${Date.now()}`,
            kind: productToQuoteKind(product.kind),
            description: product.name,
            quantity: 1,
            unitPrice,
            productId: product.id,
          },
        ],
        discount: 0,
        validUntil: addDays(todayIso(), 14),
        notes:
          product.priceType === "consult"
            ? "Valor a definir após conversa com o cliente."
            : "Produto adicionado a partir do catálogo Revelar.",
        status: "draft",
      },
      ...current,
    ]);
    setActiveNav("Orçamentos");
    setToast(
      product.priceType === "consult"
        ? "Orçamento criado para definir o valor com o cliente"
        : "Produto adicionado a um novo orçamento",
    );
  };
  const isClients = activeNav === "Clientes";
  const isWorks = activeNav === "Trabalhos";
  const isAgenda = activeNav === "Agenda";
  const isFinancial = activeNav === "Financeiro";
  const isProducts = activeNav === "Produtos";
  const isQuotes = activeNav === "Orçamentos";
  const isContracts = activeNav === "Contratos";
  const selectedWork = works.find((work) => work.id === selectedWorkId);

  return (
    <div className={`revelar-app theme-${resolvedTheme} palette-${palette}`}>
      <Sidebar
        activeNav={activeNav}
        onNavigate={navigate}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onToast={setToast}
      />

      <main className="main-content">
        <Topbar
          currency={currency}
          onCurrencyChange={setCurrency}
          resolvedTheme={resolvedTheme}
          onThemeChange={setThemeMode}
          searchOpen={searchOpen}
          onSearchToggle={() => setSearchOpen(!searchOpen)}
          searchContext={isClients ? "clients" : isWorks ? "works" : "none"}
          searchValue={isClients ? clientSearch : isWorks ? workSearch : ""}
          onSearchChange={(value) =>
            isClients ? setClientSearch(value) : isWorks ? setWorkSearch(value) : undefined
          }
          onOpenHelp={() => setHelpOpen(true)}
          onToast={setToast}
        />

        {selectedWork ? (
          <WorkDetails
            key={selectedWork.id}
            work={selectedWork}
            clients={clients}
            onBack={() => setSelectedWorkId(null)}
            onUpdate={updateWork}
            onDuplicate={duplicateWork}
            onArchive={archiveWork}
            onCancel={cancelWork}
            toast={setToast}
          />
        ) : isAgenda ? (
          <AgendaView
            works={works}
            clients={clients}
            customEvents={agendaEvents}
            setCustomEvents={setAgendaEvents}
            initialView={agendaInitialView}
            onOpenWork={openWork}
            toast={setToast}
          />
        ) : isClients ? (
          <ClientsView
            clients={clients}
            viewMode={viewMode}
            setViewMode={setViewMode}
            search={clientSearch}
            setSearch={setClientSearch}
            filter={clientFilter}
            setFilter={setClientFilter}
            onNewClient={() => setNewClientOpen(true)}
            onOpenClient={openClient}
          />
        ) : isWorks ? (
          <WorksView
            works={works}
            clients={clients}
            viewMode={workViewMode}
            setViewMode={setWorkViewMode}
            search={workSearch}
            setSearch={setWorkSearch}
            status={workStatus}
            setStatus={setWorkStatus}
            category={workCategory}
            setCategory={setWorkCategory}
            onNewWork={() => setNewWorkOpen(true)}
            onOpenWork={openWork}
          />
        ) : isFinancial ? (
          <FinancialView
            works={works}
            transactions={transactions}
            setTransactions={setTransactions}
            currency={currency}
            setCurrency={setCurrency}
            onOpenWork={openWork}
            toast={setToast}
          />
        ) : isProducts ? (
          <ProductsView
            products={products}
            setProducts={setProducts}
            clients={clients}
            currency={currency}
            onSale={sellProduct}
            onCreateQuote={createQuoteFromProduct}
            toast={setToast}
          />
        ) : isQuotes ? (
          <QuotesView
            quotes={quotes}
            setQuotes={setQuotes}
            clients={clients}
            currency={currency}
            onConvert={convertQuoteToWork}
            onCreateContract={createContractFromQuote}
            toast={setToast}
          />
        ) : isContracts ? (
          <ContractsView
            contracts={contracts}
            setContracts={setContracts}
            clients={clients}
            quotes={quotes}
            toast={setToast}
          />
        ) : (
          <Dashboard
            money={money}
            works={works}
            navigate={navigate}
            toast={setToast}
            onNewWork={() => setNewWorkOpen(true)}
            onNewClient={() => setNewClientOpen(true)}
          />
        )}
      </main>

      {!selectedWork && !isAgenda && !isFinancial && !isProducts && !isQuotes && !isContracts && (
        <button
          className="floating-add"
          type="button"
          onClick={() => (isClients ? setNewClientOpen(true) : setNewWorkOpen(true))}
          aria-label={isClients ? "Novo cliente" : "Novo trabalho"}
        >
          ＋
        </button>
      )}

      <MobileNavigation
        activeNav={activeNav}
        onNavigate={navigate}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {settingsOpen && (
        <SettingsModal
          themeMode={themeMode}
          palette={palette}
          onThemeModeChange={setThemeMode}
          onPaletteChange={setPalette}
          onClose={() => setSettingsOpen(false)}
          onSave={() => {
            setSettingsOpen(false);
            setToast("Aparência salva neste dispositivo");
          }}
        />
      )}

      {helpOpen && (
        <HelpCenter
          activeSection={activeNav}
          onClose={() => setHelpOpen(false)}
          onNavigate={navigate}
        />
      )}

      {newClientOpen && (
        <NewClientDrawer
          clients={clients}
          onClose={() => setNewClientOpen(false)}
          onSave={saveClient}
        />
      )}
      {newWorkOpen && (
        <NewWorkDrawer clients={clients} onClose={() => setNewWorkOpen(false)} onSave={saveWork} />
      )}
      <Toast message={toast} />
    </div>
  );
}
