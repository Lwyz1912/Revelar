import type {
  AgendaEventKind,
  ContractStatus,
  ProductKind,
  ProductPriceType,
  QuoteItem,
  QuoteStatus,
  WorkStatus,
} from "@/types/revelar";

export const agendaKindLabels: Record<AgendaEventKind, string> = {
  session: "Sessão",
  deadline: "Prazo",
  payment: "Pagamento",
  delivery: "Entrega",
  stage: "Etapa",
  meeting: "Reunião",
  personal: "Pessoal",
  blocked: "Indisponível",
};

export const workStatusLabels: Record<WorkStatus, string> = {
  planning: "Planejamento",
  scheduled: "Agendado",
  editing: "Em edição",
  delivery: "Pronto para entrega",
  completed: "Concluído",
  archived: "Arquivado",
  cancelled: "Cancelado",
};

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  declined: "Recusado",
};

export const contractStatusLabels: Record<ContractStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  waiting: "Aguardando assinatura",
  signed: "Assinado",
  cancelled: "Cancelado",
};

export const quoteItemKindLabels: Record<QuoteItem["kind"], string> = {
  service: "Serviço fotográfico",
  photo: "Venda de fotos",
  course: "Curso",
  pdf: "PDF / e-book",
  preset: "Preset",
  extra: "Extra",
};

export const catalogKindLabels: Record<ProductKind, string> = {
  course: "Curso",
  pdf: "PDF / e-book",
  preset: "Preset",
  photo: "Foto avulsa",
  album: "Álbum",
  package: "Pacote fotográfico",
};

export const productPriceLabels: Record<ProductPriceType, string> = {
  fixed: "Preço fixo",
  from: "A partir de",
  consult: "Sob consulta",
};
