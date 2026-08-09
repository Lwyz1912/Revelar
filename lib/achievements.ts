import type {
  AgendaEvent,
  AchievementCategory,
  AchievementTier,
  AchievementUnlock,
  Client,
  Contract,
  DiaryEntry,
  FinanceTransaction,
  PhotoLocation,
  Product,
  Quote,
  Work,
} from "@/types/revelar";

export type AchievementContext = {
  clients: Client[];
  works: Work[];
  agendaEvents: AgendaEvent[];
  transactions: FinanceTransaction[];
  products: Product[];
  quotes: Quote[];
  contracts: Contract[];
  locations: PhotoLocation[];
  diaryEntries: DiaryEntry[];
};

export type AchievementDefinition = {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  goal: number;
  secret?: boolean;
  metric: (context: AchievementContext) => number;
};

export type AchievementEvaluation = Omit<AchievementDefinition, "metric"> & {
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
  retroactive?: boolean;
};

export const achievementCategories: AchievementCategory[] = [
  "Clientes",
  "Trabalhos",
  "Casamentos",
  "Prazos",
  "Financeiro",
  "Galerias",
  "Criatividade",
  "Organização",
  "Locais",
  "Marcos especiais",
];

export const achievementTiers: AchievementTier[] = [
  "Bronze",
  "Prata",
  "Ouro",
  "Platina",
  "Diamante",
];

const completedWorks = (context: AchievementContext) =>
  context.works.filter((work) => work.status === "completed").length;
const recurringClients = (context: AchievementContext) =>
  context.clients.filter((client) => client.workCount >= 2).length;
const stagesDone = (context: AchievementContext) =>
  context.works.reduce(
    (total, work) => total + work.stages.filter((stage) => stage.done).length,
    0,
  );
const checklistDone = (context: AchievementContext) =>
  context.works.reduce(
    (total, work) =>
      total +
      work.stages.reduce(
        (stageTotal, stage) =>
          stageTotal + (stage.checklist || []).filter((item) => item.done).length,
        0,
      ),
    0,
  );
const workPhotoTotal = (
  context: AchievementContext,
  key: "captured" | "selected" | "edited" | "delivered",
) => context.works.reduce((total, work) => total + work.photos[key], 0);
const distinctWorkCategories = (context: AchievementContext) =>
  new Set(context.works.map((work) => work.category)).size;
const professionalIncome = (context: AchievementContext, currency?: "BRL" | "EUR") =>
  context.transactions
    .filter(
      (transaction) =>
        transaction.scope === "professional" &&
        transaction.type === "income" &&
        transaction.status === "received" &&
        (!currency || transaction.currency === currency),
    )
    .reduce((total, transaction) => total + transaction.amount, 0);
const weddingWorks = (context: AchievementContext) =>
  context.works.filter((work) => work.category === "Casamento");
const moodboardReferences = (context: AchievementContext) =>
  context.works.reduce((total, work) => total + (work.moodboard?.references.length || 0), 0);
const mappedWorkCount = (context: AchievementContext) =>
  new Set(context.locations.flatMap((location) => location.workIds)).size;

const a = (
  id: string,
  icon: string,
  title: string,
  description: string,
  category: AchievementCategory,
  tier: AchievementTier,
  goal: number,
  metric: AchievementDefinition["metric"],
  secret = false,
): AchievementDefinition => ({
  id,
  icon,
  title,
  description,
  category,
  tier,
  goal,
  metric,
  secret,
});

export const achievementDefinitions: AchievementDefinition[] = [
  // Clientes · 8
  a(
    "clients-1",
    "♡",
    "Primeiro nome na agenda",
    "Cadastrar o primeiro cliente",
    "Clientes",
    "Bronze",
    1,
    (c) => c.clients.length,
  ),
  a(
    "clients-5",
    "♡",
    "Círculo de confiança",
    "Cadastrar 5 clientes",
    "Clientes",
    "Bronze",
    5,
    (c) => c.clients.length,
  ),
  a(
    "clients-10",
    "♡",
    "Agenda viva",
    "Cadastrar 10 clientes",
    "Clientes",
    "Prata",
    10,
    (c) => c.clients.length,
  ),
  a(
    "clients-25",
    "♡",
    "Retratos que ficam",
    "Cadastrar 25 clientes",
    "Clientes",
    "Ouro",
    25,
    (c) => c.clients.length,
  ),
  a(
    "clients-repeat-1",
    "↻",
    "Quero outra vez",
    "Ter o primeiro cliente recorrente",
    "Clientes",
    "Bronze",
    1,
    recurringClients,
  ),
  a(
    "clients-repeat-5",
    "↻",
    "Olhar de confiança",
    "Ter 5 clientes recorrentes",
    "Clientes",
    "Prata",
    5,
    recurringClients,
  ),
  a(
    "clients-dates-10",
    "✦",
    "Datas que importam",
    "Guardar datas importantes de 10 clientes",
    "Clientes",
    "Ouro",
    10,
    (c) =>
      c.clients.filter((client) => client.birthday || client.weddingDate || client.otherDate)
        .length,
  ),
  a(
    "clients-secret-50",
    "◆",
    "Nome que atravessa histórias",
    "Construir uma comunidade de 50 clientes",
    "Clientes",
    "Diamante",
    50,
    (c) => c.clients.length,
    true,
  ),

  // Trabalhos · 8
  a(
    "works-1",
    "◇",
    "Primeira revelação",
    "Cadastrar o primeiro trabalho",
    "Trabalhos",
    "Bronze",
    1,
    (c) => c.works.length,
  ),
  a(
    "works-5",
    "◇",
    "Portfólio em movimento",
    "Cadastrar 5 trabalhos",
    "Trabalhos",
    "Bronze",
    5,
    (c) => c.works.length,
  ),
  a(
    "works-10",
    "◇",
    "Histórias em série",
    "Cadastrar 10 trabalhos",
    "Trabalhos",
    "Prata",
    10,
    (c) => c.works.length,
  ),
  a(
    "works-25",
    "◇",
    "Temporada completa",
    "Cadastrar 25 trabalhos",
    "Trabalhos",
    "Ouro",
    25,
    (c) => c.works.length,
  ),
  a(
    "works-complete-1",
    "✓",
    "Missão entregue",
    "Concluir o primeiro trabalho",
    "Trabalhos",
    "Bronze",
    1,
    completedWorks,
  ),
  a(
    "works-complete-10",
    "✓",
    "De ponta a ponta",
    "Concluir 10 trabalhos",
    "Trabalhos",
    "Prata",
    10,
    completedWorks,
  ),
  a(
    "works-categories-6",
    "✺",
    "Olhar versátil",
    "Fotografar em 6 categorias diferentes",
    "Trabalhos",
    "Platina",
    6,
    distinctWorkCategories,
  ),
  a(
    "works-secret-50",
    "◆",
    "Uma vida em capítulos",
    "Cadastrar 50 trabalhos",
    "Trabalhos",
    "Diamante",
    50,
    (c) => c.works.length,
    true,
  ),

  // Casamentos · 7
  a(
    "weddings-1",
    "♢",
    "Primeiro sim",
    "Cadastrar o primeiro casamento",
    "Casamentos",
    "Bronze",
    1,
    (c) => weddingWorks(c).length,
  ),
  a(
    "weddings-complete-1",
    "♢",
    "Promessa entregue",
    "Concluir o primeiro casamento",
    "Casamentos",
    "Bronze",
    1,
    (c) => weddingWorks(c).filter((work) => work.status === "completed").length,
  ),
  a(
    "weddings-3",
    "♢",
    "Trilogia de afetos",
    "Cadastrar 3 casamentos",
    "Casamentos",
    "Prata",
    3,
    (c) => weddingWorks(c).length,
  ),
  a(
    "weddings-5",
    "♢",
    "Temporada de casamentos",
    "Cadastrar 5 casamentos",
    "Casamentos",
    "Ouro",
    5,
    (c) => weddingWorks(c).length,
  ),
  a(
    "weddings-pre-3",
    "☼",
    "Antes do altar",
    "Cadastrar 3 pré-weddings",
    "Casamentos",
    "Prata",
    3,
    (c) => c.works.filter((work) => work.category === "Pré-wedding").length,
  ),
  a(
    "weddings-photos-5000",
    "✦",
    "Cinco mil memórias",
    "Registrar 5.000 fotos em casamentos",
    "Casamentos",
    "Platina",
    5000,
    (c) => weddingWorks(c).reduce((total, work) => total + work.photos.captured, 0),
  ),
  a(
    "weddings-secret-25",
    "◆",
    "Legado de celebrações",
    "Contar 25 histórias de casamento",
    "Casamentos",
    "Diamante",
    25,
    (c) => weddingWorks(c).length,
    true,
  ),

  // Prazos · 7
  a(
    "deadlines-stage-5",
    "✓",
    "Cinco passos adiante",
    "Concluir 5 etapas de trabalhos",
    "Prazos",
    "Bronze",
    5,
    stagesDone,
  ),
  a(
    "deadlines-stage-20",
    "✓",
    "Fluxo afinado",
    "Concluir 20 etapas de trabalhos",
    "Prazos",
    "Prata",
    20,
    stagesDone,
  ),
  a(
    "deadlines-stage-50",
    "✓",
    "Ritmo de estúdio",
    "Concluir 50 etapas de trabalhos",
    "Prazos",
    "Ouro",
    50,
    stagesDone,
  ),
  a(
    "deadlines-check-10",
    "☑",
    "Checklist em dia",
    "Concluir 10 itens de checklist",
    "Prazos",
    "Bronze",
    10,
    checklistDone,
  ),
  a(
    "deadlines-check-50",
    "☑",
    "Nada passa despercebido",
    "Concluir 50 itens de checklist",
    "Prazos",
    "Ouro",
    50,
    checklistDone,
  ),
  a(
    "deadlines-workflow-5",
    "⌁",
    "Do orçamento à entrega",
    "Finalizar todas as etapas de 5 trabalhos",
    "Prazos",
    "Platina",
    5,
    (c) =>
      c.works.filter((work) => work.stages.length > 0 && work.stages.every((stage) => stage.done))
        .length,
  ),
  a(
    "deadlines-secret-100",
    "◆",
    "Precisão silenciosa",
    "Concluir 100 etapas",
    "Prazos",
    "Diamante",
    100,
    stagesDone,
    true,
  ),

  // Financeiro · 8
  a(
    "finance-first",
    "¤",
    "Primeiro recebimento",
    "Registrar o primeiro recebimento profissional",
    "Financeiro",
    "Bronze",
    1,
    (c) =>
      c.transactions.filter(
        (transaction) =>
          transaction.scope === "professional" &&
          transaction.type === "income" &&
          transaction.status === "received",
      ).length,
  ),
  a(
    "finance-income-1000",
    "¤",
    "Caixa em movimento",
    "Receber R$ 1.000 pelo trabalho",
    "Financeiro",
    "Bronze",
    1000,
    (c) => professionalIncome(c, "BRL"),
  ),
  a(
    "finance-income-5000",
    "¤",
    "Base sustentável",
    "Receber R$ 5.000 pelo trabalho",
    "Financeiro",
    "Prata",
    5000,
    (c) => professionalIncome(c, "BRL"),
  ),
  a(
    "finance-income-25000",
    "¤",
    "Negócio em foco",
    "Receber R$ 25.000 pelo trabalho",
    "Financeiro",
    "Platina",
    25000,
    (c) => professionalIncome(c, "BRL"),
  ),
  a(
    "finance-euro-1000",
    "€",
    "Novos horizontes",
    "Receber € 1.000 pelo trabalho",
    "Financeiro",
    "Ouro",
    1000,
    (c) => professionalIncome(c, "EUR"),
  ),
  a(
    "finance-signed-5",
    "✎",
    "Tudo combinado",
    "Ter 5 contratos assinados",
    "Financeiro",
    "Prata",
    5,
    (c) => c.contracts.filter((contract) => contract.status === "signed").length,
  ),
  a(
    "finance-approved-10",
    "✓",
    "Propostas que conectam",
    "Ter 10 orçamentos aprovados",
    "Financeiro",
    "Ouro",
    10,
    (c) => c.quotes.filter((quote) => quote.status === "approved").length,
  ),
  a(
    "finance-secret-100k",
    "◆",
    "Marco de seis dígitos",
    "Receber R$ 100.000 pelo trabalho",
    "Financeiro",
    "Diamante",
    100000,
    (c) => professionalIncome(c, "BRL"),
    true,
  ),

  // Galerias · 8
  a(
    "gallery-captured-100",
    "▧",
    "Primeiros cem cliques",
    "Registrar 100 fotos capturadas",
    "Galerias",
    "Bronze",
    100,
    (c) => workPhotoTotal(c, "captured"),
  ),
  a(
    "gallery-selected-100",
    "▣",
    "Escolhas que contam",
    "Registrar 100 fotos selecionadas",
    "Galerias",
    "Bronze",
    100,
    (c) => workPhotoTotal(c, "selected"),
  ),
  a(
    "gallery-edited-100",
    "✧",
    "Cem imagens reveladas",
    "Registrar 100 fotos editadas",
    "Galerias",
    "Prata",
    100,
    (c) => workPhotoTotal(c, "edited"),
  ),
  a(
    "gallery-delivered-100",
    "⇢",
    "Cem memórias entregues",
    "Registrar 100 fotos entregues",
    "Galerias",
    "Prata",
    100,
    (c) => workPhotoTotal(c, "delivered"),
  ),
  a(
    "gallery-selected-1000",
    "▣",
    "Curadoria de mil",
    "Registrar 1.000 fotos selecionadas",
    "Galerias",
    "Ouro",
    1000,
    (c) => workPhotoTotal(c, "selected"),
  ),
  a(
    "gallery-edited-5000",
    "✧",
    "Laboratório digital",
    "Registrar 5.000 fotos editadas",
    "Galerias",
    "Platina",
    5000,
    (c) => workPhotoTotal(c, "edited"),
  ),
  a(
    "gallery-attachments-25",
    "⌑",
    "Arquivo impecável",
    "Guardar 25 anexos nos trabalhos",
    "Galerias",
    "Ouro",
    25,
    (c) => c.works.reduce((total, work) => total + work.attachments.length, 0),
  ),
  a(
    "gallery-secret-10000",
    "◆",
    "Dez mil histórias",
    "Registrar 10.000 fotos entregues",
    "Galerias",
    "Diamante",
    10000,
    (c) => workPhotoTotal(c, "delivered"),
    true,
  ),

  // Criatividade · 7
  a(
    "creative-diary-1",
    "✎",
    "Primeira página",
    "Escrever a primeira entrada no diário",
    "Criatividade",
    "Bronze",
    1,
    (c) => c.diaryEntries.length,
  ),
  a(
    "creative-diary-10",
    "✎",
    "Caderno de processo",
    "Escrever 10 entradas no diário",
    "Criatividade",
    "Prata",
    10,
    (c) => c.diaryEntries.length,
  ),
  a(
    "creative-moodboard-1",
    "✣",
    "Visão antes do clique",
    "Criar o primeiro moodboard",
    "Criatividade",
    "Bronze",
    1,
    (c) => c.works.filter((work) => Boolean(work.moodboard)).length,
  ),
  a(
    "creative-moodboard-10",
    "✣",
    "Direção criativa",
    "Criar 10 moodboards",
    "Criatividade",
    "Ouro",
    10,
    (c) => c.works.filter((work) => Boolean(work.moodboard)).length,
  ),
  a(
    "creative-references-25",
    "⌘",
    "Biblioteca de inspiração",
    "Guardar 25 referências em moodboards",
    "Criatividade",
    "Prata",
    25,
    moodboardReferences,
  ),
  a(
    "creative-shotlist-50",
    "☑",
    "Cena por cena",
    "Concluir 50 fotos obrigatórias",
    "Criatividade",
    "Platina",
    50,
    (c) =>
      c.works.reduce(
        (total, work) => total + (work.moodboard?.shotList.filter((item) => item.done).length || 0),
        0,
      ),
  ),
  a(
    "creative-secret-50",
    "◆",
    "Arquivo de ideias",
    "Escrever 50 entradas no diário",
    "Criatividade",
    "Diamante",
    50,
    (c) => c.diaryEntries.length,
    true,
  ),

  // Organização · 7
  a(
    "organization-events-5",
    "◫",
    "Semana desenhada",
    "Cadastrar 5 eventos na agenda",
    "Organização",
    "Bronze",
    5,
    (c) => c.agendaEvents.length,
  ),
  a(
    "organization-events-25",
    "◫",
    "Agenda sob controle",
    "Cadastrar 25 eventos na agenda",
    "Organização",
    "Prata",
    25,
    (c) => c.agendaEvents.length,
  ),
  a(
    "organization-recurring-3",
    "↻",
    "Rotina que sustenta",
    "Criar 3 eventos recorrentes",
    "Organização",
    "Prata",
    3,
    (c) => c.agendaEvents.filter((event) => event.recurrence !== "none").length,
  ),
  a(
    "organization-linked-10",
    "⌁",
    "Tudo conectado",
    "Vincular 10 eventos a clientes ou trabalhos",
    "Organização",
    "Ouro",
    10,
    (c) => c.agendaEvents.filter((event) => event.clientId || event.workId).length,
  ),
  a(
    "organization-contacts-10",
    "◎",
    "Contatos completos",
    "Manter WhatsApp e e-mail de 10 clientes",
    "Organização",
    "Prata",
    10,
    (c) => c.clients.filter((client) => client.whatsapp && client.email).length,
  ),
  a(
    "organization-team-10",
    "♙",
    "Produção alinhada",
    "Cadastrar equipe em 10 trabalhos",
    "Organização",
    "Platina",
    10,
    (c) => c.works.filter((work) => work.team.length > 1).length,
  ),
  a(
    "organization-secret-100",
    "◆",
    "Mestre dos bastidores",
    "Concluir 100 itens entre etapas e checklists",
    "Organização",
    "Diamante",
    100,
    (c) => stagesDone(c) + checklistDone(c),
    true,
  ),

  // Locais · 7
  a(
    "locations-1",
    "◎",
    "Primeiro ponto no mapa",
    "Salvar o primeiro local",
    "Locais",
    "Bronze",
    1,
    (c) => c.locations.length,
  ),
  a(
    "locations-3",
    "◎",
    "Mapa de memórias",
    "Salvar 3 locais",
    "Locais",
    "Bronze",
    3,
    (c) => c.locations.length,
  ),
  a(
    "locations-5",
    "◎",
    "Rota de inspiração",
    "Salvar 5 locais",
    "Locais",
    "Prata",
    5,
    (c) => c.locations.length,
  ),
  a(
    "locations-cities-5",
    "⌖",
    "Cinco cenários",
    "Fotografar em 5 cidades diferentes",
    "Locais",
    "Ouro",
    5,
    (c) => new Set(c.locations.map((location) => location.city)).size,
  ),
  a(
    "locations-countries-2",
    "⌖",
    "Dois países, um olhar",
    "Registrar trabalhos em Brasil e Portugal",
    "Locais",
    "Platina",
    2,
    (c) => new Set(c.locations.map((location) => location.country)).size,
  ),
  a(
    "locations-linked-10",
    "⌁",
    "Mapa conectado",
    "Vincular 10 trabalhos a locais",
    "Locais",
    "Ouro",
    10,
    mappedWorkCount,
  ),
  a(
    "locations-secret-25",
    "◆",
    "Atlas particular",
    "Salvar 25 locais",
    "Locais",
    "Diamante",
    25,
    (c) => c.locations.length,
    true,
  ),

  // Marcos especiais · 8
  a(
    "milestone-photos-1000",
    "✦",
    "Mil cliques",
    "Registrar 1.000 fotos capturadas",
    "Marcos especiais",
    "Bronze",
    1000,
    (c) => workPhotoTotal(c, "captured"),
  ),
  a(
    "milestone-photos-5000",
    "✦",
    "Cinco mil instantes",
    "Registrar 5.000 fotos capturadas",
    "Marcos especiais",
    "Prata",
    5000,
    (c) => workPhotoTotal(c, "captured"),
  ),
  a(
    "milestone-photos-25000",
    "✦",
    "Arquivo de uma era",
    "Registrar 25.000 fotos capturadas",
    "Marcos especiais",
    "Platina",
    25000,
    (c) => workPhotoTotal(c, "captured"),
  ),
  a(
    "milestone-products-10",
    "◈",
    "Criação que viaja",
    "Realizar 10 vendas de produtos",
    "Marcos especiais",
    "Prata",
    10,
    (c) => c.products.reduce((total, product) => total + product.sales, 0),
  ),
  a(
    "milestone-completed-25",
    "✓",
    "Vinte e cinco histórias",
    "Concluir 25 trabalhos",
    "Marcos especiais",
    "Ouro",
    25,
    completedWorks,
  ),
  a(
    "milestone-portfolio-8",
    "✺",
    "Portfólio sem fronteiras",
    "Trabalhar nas 8 categorias do Revelar",
    "Marcos especiais",
    "Diamante",
    8,
    distinctWorkCategories,
  ),
  a(
    "milestone-community-100",
    "♡",
    "Cem histórias confiadas",
    "Alcançar 100 clientes",
    "Marcos especiais",
    "Diamante",
    100,
    (c) => c.clients.length,
  ),
  a(
    "milestone-secret-75",
    "◆",
    "Constelação completa",
    "Desbloquear todas as outras conquistas",
    "Marcos especiais",
    "Diamante",
    74,
    (c) =>
      achievementDefinitions.filter(
        (item) => item.id !== "milestone-secret-75" && item.metric(c) >= item.goal,
      ).length,
    true,
  ),
];

export function evaluateAchievements(
  context: AchievementContext,
  unlocks: AchievementUnlock[] = [],
): AchievementEvaluation[] {
  const unlockById = new Map(unlocks.map((unlock) => [unlock.id, unlock]));
  return achievementDefinitions.map(({ metric, ...definition }) => {
    const progress = Math.max(0, metric(context));
    const unlock = unlockById.get(definition.id);
    return {
      ...definition,
      progress: Math.min(progress, definition.goal),
      unlocked: Boolean(unlock) || progress >= definition.goal,
      unlockedAt: unlock?.unlockedAt,
      retroactive: unlock?.retroactive,
    };
  });
}

export function createMissingUnlocks(
  evaluations: AchievementEvaluation[],
  existing: AchievementUnlock[],
  unlockedAt: string,
  retroactive: boolean,
) {
  const known = new Set(existing.map((unlock) => unlock.id));
  return evaluations
    .filter((achievement) => achievement.unlocked && !known.has(achievement.id))
    .map((achievement) => ({ id: achievement.id, unlockedAt, retroactive }));
}
