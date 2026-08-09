import { catalogKindLabels } from "@/config/labels";
import { buildContractFromQuote } from "@/lib/contracts";
import { addDays } from "@/lib/dates";
import { quoteTotal } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { discountedProductPrice, productToQuoteKind } from "@/lib/products";
import { createStages } from "@/lib/workflow";
import type {
  Client,
  Contract,
  FinanceTransaction,
  NewClientData,
  NewWorkData,
  Product,
  Quote,
  Work,
  WorkStatus,
} from "@/types/revelar";

export function nextNumericId(records: Array<{ id: number }>) {
  return Math.max(...records.map((record) => record.id), 0) + 1;
}

export function createClientRecord(data: NewClientData, id: number): Client {
  const date = data.birthday || data.weddingDate || data.otherDate;
  const dateLabel = data.birthday
    ? data.type === "company"
      ? "Aniversário da marca"
      : "Aniversário"
    : data.weddingDate
      ? "Aniversário de casamento"
      : data.otherDateLabel || "Data importante";

  return {
    id,
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
    birthday: data.birthday || undefined,
    weddingDate: data.weddingDate || undefined,
    otherDateLabel: data.otherDateLabel || undefined,
    otherDate: data.otherDate || undefined,
    notes: data.notes || undefined,
    archived: false,
    createdAt: new Date().toISOString(),
  };
}

export function createWorkRecord(data: NewWorkData, id: number): Work {
  const completedStages = data.stages.filter((stage) => stage.done).length;
  const status: WorkStatus =
    data.stages.length > 0 && completedStages >= data.stages.length
      ? "completed"
      : completedStages >= 7
        ? "delivery"
        : completedStages >= 6
          ? "editing"
          : data.date
            ? "scheduled"
            : "planning";

  return { ...data, id, status };
}

export function duplicateWorkRecord(work: Work, id: number): Work {
  return {
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
}

export function createWorkFromQuote(quote: Quote, id: number): Work {
  return {
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
}

export function createContractFromQuote(
  quote: Quote,
  id: number,
  clientName = "{{cliente}}",
): Contract {
  return {
    id,
    title: `Contrato · ${quote.title}`,
    clientId: quote.clientId,
    quoteId: quote.id,
    status: "draft",
    template: "standard",
    updatedAt: "Agora",
    content: buildContractFromQuote({
      clientName,
      quoteTitle: quote.title,
      formattedTotal: formatMoney(quoteTotal(quote), quote.currency),
    }),
  };
}

export function createQuoteFromProduct(
  product: Product,
  id: number,
  clientId: number | undefined,
  createdOn: string,
): Quote {
  const unitPrice = product.priceType === "consult" ? 0 : discountedProductPrice(product);

  return {
    id,
    title: product.name,
    clientId,
    currency: product.currency,
    items: [
      {
        id: `product-${product.id}-${id}`,
        kind: productToQuoteKind(product.kind),
        description: product.name,
        quantity: 1,
        unitPrice,
        productId: product.id,
      },
    ],
    discount: 0,
    validUntil: addDays(createdOn, 14),
    notes:
      product.priceType === "consult"
        ? "Valor a definir após conversa com o cliente."
        : "Produto adicionado a partir do catálogo Revelar.",
    status: "draft",
  };
}

export function createProductSaleTransaction({
  product,
  clientName,
  options,
  total,
  date,
  id,
}: {
  product: Product;
  clientName?: string;
  options: string[];
  total: number;
  date: string;
  id: string;
}): FinanceTransaction {
  return {
    id,
    type: "income",
    scope: "professional",
    description: `Venda · ${product.name}`,
    amount: total,
    currency: product.currency,
    date,
    category: catalogKindLabels[product.kind],
    tags: [product.kind, ...options],
    account: "Conta principal",
    paymentMethod: "Pix / transferência",
    status: "received",
    origin: clientName || "Venda direta sem cliente",
  };
}
