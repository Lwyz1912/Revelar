"use client";

import { useCallback, useMemo, useState } from "react";

import { navItems } from "@/config/navigation";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useRevelarData } from "@/hooks/use-revelar-data";
import { useRevelarPreferences } from "@/hooks/use-revelar-preferences";
import { useToast } from "@/hooks/use-toast";
import { buildDashboardOverview } from "@/lib/dashboard";
import { todayIso } from "@/lib/dates";
import {
  createClientRecord,
  createContractFromQuote as createContractRecord,
  createProductSaleTransaction,
  createQuoteFromProduct as createQuoteRecordFromProduct,
  createWorkFromQuote,
  createWorkRecord,
  duplicateWorkRecord,
  nextNumericId,
} from "@/lib/factories";
import type {
  AgendaViewMode,
  AppSection,
  AvailableSection,
  Client,
  ClientType,
  NewClientData,
  NewWorkData,
  Product,
  Quote,
  Work,
  WorkCategory,
  WorkGallery,
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
  const {
    themeMode,
    setThemeMode,
    palette,
    setPalette,
    currency,
    setCurrency,
    clientViewMode: viewMode,
    setClientViewMode: setViewMode,
    workViewMode,
    setWorkViewMode,
    resolvedTheme,
  } = useRevelarPreferences();
  const {
    clients,
    setClients,
    works,
    setWorks,
    agendaEvents,
    setAgendaEvents,
    transactions,
    setTransactions,
    products,
    setProducts,
    quotes,
    setQuotes,
    contracts,
    setContracts,
  } = useRevelarData();
  const { message: toast, showToast: setToast } = useToast();
  const [activeNav, setActiveNav] = useState<AvailableSection>("Visão geral");
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<"all" | ClientType>("all");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [workSearch, setWorkSearch] = useState("");
  const [workStatus, setWorkStatus] = useState<"all" | WorkStatus>("all");
  const [workCategory, setWorkCategory] = useState<"all" | WorkCategory>("all");
  const [newWorkOpen, setNewWorkOpen] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);
  const [agendaInitialView, setAgendaInitialView] = useState<AgendaViewMode>("month");
  const today = todayIso();
  const dashboardOverview = useMemo(
    () => buildDashboardOverview({ works, transactions, currency, today }),
    [currency, today, transactions, works],
  );

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
    const client = createClientRecord(data, nextNumericId(clients));
    setClients((current) => [client, ...current]);
    setNewClientOpen(false);
    setToast(`${data.name} foi adicionado aos clientes`);
  };

  const openClient = (client: Client) => setToast(`Abrindo ficha de ${client.name}`);
  const saveWork = (data: NewWorkData) => {
    const work = createWorkRecord(data, nextNumericId(works));
    setWorks((current) => [work, ...current]);
    setNewWorkOpen(false);
    setActiveNav("Trabalhos");
    setToast(`${data.title} foi criado com ${data.stages.length} etapas`);
  };
  const openWork = (work: Work) => setSelectedWorkId(work.id);
  const updateWork = (updated: Work) =>
    setWorks((current) => current.map((work) => (work.id === updated.id ? updated : work)));
  const duplicateWork = (work: Work) => {
    const id = nextNumericId(works);
    const copy = duplicateWorkRecord(work, id);
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
    const id = nextNumericId(works);
    const client = clients.find((item) => item.id === quote.clientId);
    const work = createWorkFromQuote(quote, id);
    setWorks((current) => [work, ...current]);
    setSelectedWorkId(id);
    setActiveNav("Trabalhos");
    setToast(`Orçamento de ${client?.name || "cliente"} convertido em trabalho`);
  };
  const createContractFromQuote = (quote: Quote) => {
    const id = nextNumericId(contracts);
    const client = clients.find((item) => item.id === quote.clientId);
    const contract = createContractRecord(quote, id, client?.name);
    setContracts((current) => [contract, ...current]);
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
    const transaction = createProductSaleTransaction({
      product,
      clientName: client?.name,
      options,
      total,
      date: today,
      id: `product-sale-${Date.now()}`,
    });
    setTransactions((current) => [transaction, ...current]);
    setToast(`Venda de ${product.name} registrada no Financeiro`);
  };
  const createQuoteFromProduct = (product: Product) => {
    const quote = createQuoteRecordFromProduct(
      product,
      nextNumericId(quotes),
      clients[0]?.id,
      today,
    );
    setQuotes((current) => [quote, ...current]);
    setActiveNav("Orçamentos");
    setToast(
      product.priceType === "consult"
        ? "Orçamento criado para definir o valor com o cliente"
        : "Produto adicionado a um novo orçamento",
    );
  };
  const registerPhotoExtras = useCallback(
    (work: Work, gallery: WorkGallery) => {
      const transactionId = `gallery-extra-${gallery.id}`;
      setTransactions((current) => {
        const transaction = {
          id: transactionId,
          type: "income" as const,
          scope: "professional" as const,
          description: `${gallery.stats.extraCount} foto${gallery.stats.extraCount === 1 ? " adicional" : "s adicionais"} · ${gallery.clientName}`,
          amount: gallery.stats.extraAmount,
          currency: gallery.currency,
          date: today,
          category: "Cliente",
          tags: ["fotos adicionais", work.category],
          account: "A receber",
          paymentMethod: "A definir",
          status: "pending" as const,
          workId: work.id,
          origin: `Galeria · ${gallery.workTitle}`,
        };
        const exists = current.some((item) => item.id === transactionId);
        return exists
          ? current.map((item) => (item.id === transactionId ? transaction : item))
          : [transaction, ...current];
      });
    },
    [setTransactions, today],
  );
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
            onPhotoExtras={registerPhotoExtras}
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
            overview={dashboardOverview}
            currency={currency}
            works={works}
            navigate={navigate}
            onOpenWork={openWork}
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
