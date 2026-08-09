import type { NotificationKind, NotificationPreferences } from "@/types/revelar";

export const notificationCategoryOptions: Array<{
  id: NotificationKind;
  label: string;
  description: string;
}> = [
  {
    id: "deadline",
    label: "Prazos e entregas",
    description: "Datas de entrega próximas ou vencidas",
  },
  { id: "work", label: "Trabalhos próximos", description: "Ensaios, eventos e reuniões agendadas" },
  { id: "stage", label: "Etapas atrasadas", description: "Pendências do fluxo de cada trabalho" },
  { id: "payment", label: "Pagamentos", description: "Valores pendentes, vencidos ou recebidos" },
  { id: "contract", label: "Contratos", description: "Envio, assinatura e pendências" },
  {
    id: "gallery",
    label: "Galerias",
    description: "Seleções, comentários, aprovações e downloads",
  },
  {
    id: "birthday",
    label: "Aniversários",
    description: "Datas de clientes e oportunidades de contato",
  },
  {
    id: "important-date",
    label: "Datas importantes",
    description: "Casamentos e datas personalizadas",
  },
];

export const defaultNotificationPreferences: NotificationPreferences = {
  browserEnabled: false,
  reminderDays: [7, 3, 1, 0],
  categories: {
    deadline: true,
    work: true,
    stage: true,
    payment: true,
    contract: true,
    gallery: true,
    birthday: true,
    "important-date": true,
  },
};
