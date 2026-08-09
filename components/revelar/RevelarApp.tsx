"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { navItems } from "@/config/navigation";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useRevelarData } from "@/hooks/use-revelar-data";
import { useRevelarPreferences } from "@/hooks/use-revelar-preferences";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import { buildDashboardOverview } from "@/lib/dashboard";
import { todayIso } from "@/lib/dates";
import { visibleNotifications } from "@/lib/notifications";
import {
  createClientRecord,
  createProductSaleTransaction,
  createQuoteFromProduct as createQuoteRecordFromProduct,
  createWorkFromQuote,
  createWorkRecord,
  duplicateWorkRecord,
  nextNumericId,
} from "@/lib/factories";
import type {
  AgendaViewMode,
  AppNotification,
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
import { ClientDetails } from "@/components/modules/clients/ClientDetails";
import { NewClientDrawer } from "@/components/modules/clients/NewClientDrawer";
import { Dashboard } from "@/components/modules/dashboard/Dashboard";
import { FinancialView } from "@/components/modules/finance/FinancialView";
import { EditingStudioView } from "@/components/modules/editing/EditingStudioView";
import { GalleryLibraryView } from "@/components/modules/gallery/GalleryLibraryView";
import { ProductsView } from "@/components/modules/products/ProductsView";
import { QuotesView } from "@/components/modules/quotes/QuotesView";
import { NotificationsCenter } from "@/components/modules/notifications/NotificationsCenter";
import { LocationsView } from "@/components/modules/locations/LocationsView";
import { DiaryView } from "@/components/modules/diary/DiaryView";
import {
  AchievementCelebration,
  type AchievementCelebrationState,
} from "@/components/modules/diary/AchievementCelebration";
import { WhatsAppAIView } from "@/components/modules/whatsapp/WhatsAppAIView";
import { NewWorkDrawer } from "@/components/modules/works/NewWorkDrawer";
import { WorkDetails } from "@/components/modules/works/WorkDetails";
import { WorksView } from "@/components/modules/works/WorksView";
import { SettingsModal } from "@/components/shared/SettingsModal";
import { HelpCenter } from "@/components/shared/HelpCenter";
import { Toast } from "@/components/shared/Toast";
import { createMissingUnlocks, evaluateAchievements } from "@/lib/achievements";

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
    locations,
    setLocations,
    diaryEntries,
    setDiaryEntries,
    achievementUnlocks,
    setAchievementUnlocks,
    referenceLibrary,
    setReferenceLibrary,
    storeSettings,
    setStoreSettings,
    cloudReady,
  } = useRevelarData();
  const {
    notifications,
    setNotifications,
    preferences: notificationPreferences,
    setPreferences: setNotificationPreferences,
    automations,
    setAutomations,
    requestBrowserPermission,
  } = useNotifications();
  const { message: toast, showToast: setToast } = useToast();
  const [activeNav, setActiveNav] = useState<AvailableSection>("Visão geral");
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<"all" | ClientType | "archived">("all");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [workSearch, setWorkSearch] = useState("");
  const [workStatus, setWorkStatus] = useState<"all" | WorkStatus>("all");
  const [workCategory, setWorkCategory] = useState<"all" | WorkCategory>("all");
  const [newWorkOpen, setNewWorkOpen] = useState(false);
  const [newWorkClientId, setNewWorkClientId] = useState<number | undefined>();
  const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);
  const [notificationsCenterOpen, setNotificationsCenterOpen] = useState(false);
  const [agendaInitialView, setAgendaInitialView] = useState<AgendaViewMode>("month");
  const [achievementCelebration, setAchievementCelebration] =
    useState<AchievementCelebrationState | null>(null);
  const achievementTrackingStarted = useRef(false);
  const today = todayIso();
  const dashboardOverview = useMemo(
    () => buildDashboardOverview({ works, transactions, currency, today }),
    [currency, today, transactions, works],
  );
  const activeNotifications = useMemo(
    () => visibleNotifications(notifications, notificationPreferences),
    [notificationPreferences, notifications],
  );
  const achievements = useMemo(
    () =>
      evaluateAchievements(
        {
          clients,
          works,
          agendaEvents,
          transactions,
          products,
          quotes,
          contracts,
          locations,
          diaryEntries,
        },
        achievementUnlocks,
      ),
    [
      achievementUnlocks,
      agendaEvents,
      clients,
      contracts,
      diaryEntries,
      locations,
      products,
      quotes,
      transactions,
      works,
    ],
  );

  useEffect(() => {
    if (!cloudReady) return;
    const retroactive = !achievementTrackingStarted.current;
    achievementTrackingStarted.current = true;
    const missing = createMissingUnlocks(
      achievements,
      achievementUnlocks,
      new Date().toISOString(),
      retroactive,
    );
    if (missing.length === 0) return;
    setAchievementUnlocks((current) => [...current, ...missing]);
    const tierWeight = { Bronze: 1, Prata: 2, Ouro: 3, Platina: 4, Diamante: 5 };
    const newlyUnlocked = achievements
      .filter((achievement) => missing.some((unlock) => unlock.id === achievement.id))
      .sort((left, right) => tierWeight[right.tier] - tierWeight[left.tier]);
    const highlight = newlyUnlocked[0];
    if (!highlight) return;
    setAchievementCelebration({ achievement: highlight, count: missing.length, retroactive });
    setToast(
      retroactive && missing.length > 1
        ? `${missing.length} conquistas foram reconhecidas pelo histórico`
        : `Conquista desbloqueada: ${highlight.title}`,
    );
  }, [achievementUnlocks, achievements, cloudReady, setAchievementUnlocks, setToast]);

  const navigate = (label: AppSection) => {
    setSearchOpen(false);
    const item = navItems.find((navigationItem) => navigationItem.label === label);
    if (item?.available) {
      if (label === "Agenda") {
        setAgendaInitialView(window.matchMedia("(max-width: 720px)").matches ? "list" : "month");
      }
      setSelectedWorkId(null);
      setSelectedClientId(null);
      setNotificationsCenterOpen(false);
      setActiveNav(label as AvailableSection);
      return;
    }
    setToast(`${label} será o próximo módulo do Revelar.`);
  };

  const saveClient = (data: NewClientData) => {
    if (editingClientId) {
      const existing = clients.find((client) => client.id === editingClientId);
      if (!existing) return;
      const updated = {
        ...existing,
        ...createClientRecord(data, editingClientId),
        workCount: existing.workCount,
        lastWork: existing.lastWork,
        tag: existing.tag,
        archived: existing.archived,
      };
      setClients((current) =>
        current.map((client) => (client.id === editingClientId ? updated : client)),
      );
      setEditingClientId(null);
      setNewClientOpen(false);
      setToast(`${updated.name} foi atualizado`);
      return;
    }
    const client = createClientRecord(data, nextNumericId(clients));
    setClients((current) => [client, ...current]);
    setNewClientOpen(false);
    setToast(`${data.name} foi adicionado aos clientes`);
  };

  const openClient = (client: Client) => {
    setSelectedWorkId(null);
    setNotificationsCenterOpen(false);
    setSelectedClientId(client.id);
  };
  const updateClient = (updated: Client) =>
    setClients((current) => current.map((client) => (client.id === updated.id ? updated : client)));
  const saveWork = (data: NewWorkData) => {
    const work = createWorkRecord(data, nextNumericId(works));
    setWorks((current) => [work, ...current]);
    setClients((current) =>
      current.map((client) =>
        data.clientIds.includes(client.id)
          ? { ...client, workCount: client.workCount + 1, lastWork: `${data.title} · agora` }
          : client,
      ),
    );
    setNewWorkOpen(false);
    setNewWorkClientId(undefined);
    setSelectedClientId(null);
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
  const convertQuoteToWork = (quote: Quote, contractNeeded: boolean) => {
    const existing = works.find((item) => item.sourceQuoteId === quote.id);
    if (existing) {
      setSelectedWorkId(existing.id);
      setActiveNav("Trabalhos");
      setToast("Este orçamento já possui um trabalho vinculado");
      return existing.id;
    }
    const id = nextNumericId(works);
    const client = clients.find((item) => item.id === quote.clientId);
    const work = createWorkFromQuote(quote, id, client?.name, contractNeeded);
    setWorks((current) => [work, ...current]);
    setSelectedWorkId(id);
    setActiveNav("Trabalhos");
    setToast(`Trabalho de ${client?.name || "cliente"} criado pelo orçamento aprovado`);
    return id;
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
  const isGallery = activeNav === "Galeria";
  const isEditing = activeNav === "Presets e edição";
  const isProducts = activeNav === "Produtos";
  const isQuotes = activeNav === "Orçamentos";
  const isLocations = activeNav === "Locais";
  const isDiary = activeNav === "Diário";
  const isWhatsApp = activeNav === "WhatsApp e IA";
  const selectedWork = works.find((work) => work.id === selectedWorkId);
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const editingClient = clients.find((client) => client.id === editingClientId);

  const openNotification = (notification: AppNotification) => {
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
    );
    if (notification.workId) {
      const work = works.find((item) => item.id === notification.workId);
      if (work) {
        setNotificationsCenterOpen(false);
        setSelectedClientId(null);
        setSelectedWorkId(work.id);
        setActiveNav("Trabalhos");
        return;
      }
    }
    if (notification.clientId) {
      const client = clients.find((item) => item.id === notification.clientId);
      if (client) {
        setActiveNav("Clientes");
        openClient(client);
      }
    }
  };

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
          notifications={activeNotifications}
          onOpenNotification={openNotification}
          onMarkAllNotificationsRead={() =>
            setNotifications((current) => current.map((item) => ({ ...item, read: true })))
          }
          onShowAllNotifications={() => {
            setSelectedWorkId(null);
            setSelectedClientId(null);
            setNotificationsCenterOpen(true);
          }}
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
            referenceLibrary={referenceLibrary}
            setReferenceLibrary={setReferenceLibrary}
            toast={setToast}
          />
        ) : selectedClient ? (
          <ClientDetails
            client={selectedClient}
            works={works}
            transactions={transactions}
            quotes={quotes}
            contracts={contracts}
            currency={currency}
            onBack={() => setSelectedClientId(null)}
            onEdit={() => {
              setEditingClientId(selectedClient.id);
              setNewClientOpen(true);
            }}
            onNewWork={() => {
              setNewWorkClientId(selectedClient.id);
              setNewWorkOpen(true);
            }}
            onOpenWork={(work) => {
              setSelectedClientId(null);
              openWork(work);
            }}
            onNavigate={(section) => {
              setSelectedClientId(null);
              setActiveNav(section);
            }}
            onUpdate={updateClient}
            onArchive={() => {
              updateClient({ ...selectedClient, archived: !selectedClient.archived });
              setToast(
                selectedClient.archived
                  ? "Cliente restaurado"
                  : "Cliente arquivado sem apagar o histórico",
              );
            }}
            toast={setToast}
          />
        ) : notificationsCenterOpen ? (
          <NotificationsCenter
            notifications={notifications}
            automations={automations}
            onBack={() => setNotificationsCenterOpen(false)}
            onNotificationsChange={setNotifications}
            onAutomationsChange={setAutomations}
            onOpenRelated={openNotification}
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
        ) : isGallery ? (
          <GalleryLibraryView works={works} onOpenWork={openWork} toast={setToast} />
        ) : isEditing ? (
          <EditingStudioView toast={setToast} />
        ) : isProducts ? (
          <ProductsView
            products={products}
            setProducts={setProducts}
            clients={clients}
            currency={currency}
            onSale={sellProduct}
            onCreateQuote={createQuoteFromProduct}
            storeSettings={storeSettings}
            setStoreSettings={setStoreSettings}
            toast={setToast}
          />
        ) : isQuotes ? (
          <QuotesView
            quotes={quotes}
            setQuotes={setQuotes}
            clients={clients}
            currency={currency}
            onApprove={convertQuoteToWork}
            toast={setToast}
          />
        ) : isLocations ? (
          <LocationsView
            locations={locations}
            setLocations={setLocations}
            works={works}
            toast={setToast}
          />
        ) : isDiary ? (
          <DiaryView
            entries={diaryEntries}
            setEntries={setDiaryEntries}
            works={works}
            achievements={achievements}
            achievementUnlocks={achievementUnlocks}
            toast={setToast}
          />
        ) : isWhatsApp ? (
          <WhatsAppAIView clients={clients} works={works} toast={setToast} />
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

      {!selectedWork &&
        !selectedClient &&
        !notificationsCenterOpen &&
        !isAgenda &&
        !isGallery &&
        !isEditing &&
        !isFinancial &&
        !isProducts &&
        !isQuotes &&
        !isLocations &&
        !isDiary &&
        !isWhatsApp && (
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
          notificationPreferences={notificationPreferences}
          onNotificationPreferencesChange={setNotificationPreferences}
          onRequestBrowserPermission={requestBrowserPermission}
          onClose={() => setSettingsOpen(false)}
          onSave={() => {
            setSettingsOpen(false);
            setToast("Configurações salvas e sincronizadas");
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
          initialData={
            editingClient
              ? {
                  type: editingClient.type,
                  name: editingClient.name,
                  whatsapp: editingClient.whatsapp,
                  instagram: editingClient.instagram,
                  email: editingClient.email,
                  birthday: editingClient.birthday || "",
                  weddingDate: editingClient.weddingDate || "",
                  otherDateLabel: editingClient.otherDateLabel || "",
                  otherDate: editingClient.otherDate || "",
                  notes: editingClient.notes || "",
                  avatar: editingClient.avatar,
                }
              : undefined
          }
          clientId={editingClient?.id}
          onClose={() => {
            setNewClientOpen(false);
            setEditingClientId(null);
          }}
          onSave={saveClient}
        />
      )}
      {newWorkOpen && (
        <NewWorkDrawer
          clients={clients}
          initialClientId={newWorkClientId}
          onClose={() => {
            setNewWorkOpen(false);
            setNewWorkClientId(undefined);
          }}
          onSave={saveWork}
        />
      )}
      <Toast message={toast} />
      {achievementCelebration && (
        <AchievementCelebration
          celebration={achievementCelebration}
          onClose={() => setAchievementCelebration(null)}
        />
      )}
    </div>
  );
}
