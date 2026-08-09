import { initialProducts } from "@/data/demo";
import { calculateProductSaleTotal } from "@/lib/products";
import { getRuntimeBindings } from "@/lib/server/runtime-bindings";
import type { Product, StoreOrder, StoreSettings } from "@/types/revelar";

const fallbackSettings: StoreSettings = {
  enabled: true,
  title: "Loja Mary Fotografia",
  description: "Produtos digitais, álbuns e experiências pensadas para guardar histórias.",
  whatsapp: "",
};

type StoreState = {
  ownerEmail: string | null;
  products: Product[];
  settings: StoreSettings;
};

async function latestState(): Promise<StoreState> {
  const { DB } = getRuntimeBindings();
  const row = await DB.prepare(
    "SELECT owner_email, data_json FROM app_state ORDER BY updated_at DESC LIMIT 1",
  )
    .first<{ owner_email: string; data_json: string }>()
    .catch(() => null);
  let parsed: { products?: Product[]; storeSettings?: Partial<StoreSettings> } = {};
  if (row?.data_json) {
    try {
      parsed = JSON.parse(row.data_json) as typeof parsed;
    } catch {
      parsed = {};
    }
  }
  let profilePhone = "";
  const settingsRow = await DB.prepare(
    "SELECT data_json FROM professional_settings ORDER BY updated_at DESC LIMIT 1",
  )
    .first<{ data_json: string }>()
    .catch(() => null);
  if (settingsRow?.data_json) {
    try {
      const professional = JSON.parse(settingsRow.data_json) as {
        profile?: { phone?: string };
        brands?: Array<{ id?: string; phone?: string }>;
        activeBrandId?: string;
      };
      profilePhone =
        professional.brands?.find((brand) => brand.id === professional.activeBrandId)?.phone ||
        professional.profile?.phone ||
        "";
    } catch {
      profilePhone = "";
    }
  }
  return {
    ownerEmail: row?.owner_email || null,
    products: Array.isArray(parsed.products) ? parsed.products : initialProducts,
    settings: {
      ...fallbackSettings,
      ...(parsed.storeSettings || {}),
      whatsapp: parsed.storeSettings?.whatsapp || profilePhone,
    },
  };
}

export async function publicCatalog() {
  const state = await latestState();
  const products = state.products.filter((product) => {
    if (product.status !== "active" || !product.publicReady) return false;
    const soldOut = product.availability !== "unlimited" && (product.availableQuantity || 0) <= 0;
    return !(soldOut && product.hideWhenSoldOut);
  });
  return { settings: state.settings, products };
}

export async function publicStoreAssetOwner(fileId: string) {
  const state = await latestState();
  const published = state.products.filter(
    (product) => product.status === "active" && product.publicReady,
  );
  const allowed = published.some(
    (product) =>
      product.coverFile?.id === fileId || product.galleryFiles?.some((file) => file.id === fileId),
  );
  return allowed ? state.ownerEmail : null;
}

async function ensureOrdersTable() {
  const { DB } = getRuntimeBindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS store_orders (
      id text PRIMARY KEY NOT NULL,
      owner_email text,
      customer_name text NOT NULL,
      customer_whatsapp text NOT NULL,
      note text NOT NULL,
      items_json text NOT NULL,
      totals_json text NOT NULL,
      status text NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL
    )`),
    DB.prepare(
      "CREATE INDEX IF NOT EXISTS store_orders_owner_idx ON store_orders (owner_email, created_at)",
    ),
  ]);
}

export async function createStoreOrder(input: {
  customerName: string;
  customerWhatsapp: string;
  note?: string;
  items: Array<{ productId: number; quantity: number; optionValueIds: string[] }>;
}) {
  await ensureOrdersTable();
  const state = await latestState();
  const publicProducts = state.products.filter(
    (product) => product.status === "active" && product.publicReady,
  );
  const items: StoreOrder["items"] = input.items.map((requested) => {
    const product = publicProducts.find((item) => item.id === requested.productId);
    if (!product) throw new Error("Um produto do carrinho não está mais disponível.");
    const quantity = Math.max(1, Math.floor(requested.quantity));
    const soldOut = product.availability !== "unlimited" && (product.availableQuantity || 0) <= 0;
    if (soldOut && !product.allowBackorder) throw new Error(`${product.name} está esgotado.`);
    if (
      product.availability !== "unlimited" &&
      !product.allowBackorder &&
      quantity > (product.availableQuantity || 0)
    )
      throw new Error(`Há apenas ${product.availableQuantity || 0} unidade(s) de ${product.name}.`);
    const selected = product.options
      .flatMap((option) => option.values)
      .filter((option) => requested.optionValueIds.includes(option.id));
    const unitPrice =
      product.priceType === "consult"
        ? 0
        : calculateProductSaleTotal(product, selected, 1).unitPrice;
    return {
      productId: product.id,
      name: product.name,
      quantity,
      options: selected.map((option) => option.label),
      unitPrice,
      currency: product.currency,
    };
  });
  const totals = items.reduce<StoreOrder["totals"]>((current, item) => {
    current[item.currency] = (current[item.currency] || 0) + item.unitPrice * item.quantity;
    return current;
  }, {});
  const order: StoreOrder = {
    id: crypto.randomUUID(),
    customerName: input.customerName.trim(),
    customerWhatsapp: input.customerWhatsapp.trim(),
    note: input.note?.trim() || "",
    items,
    totals,
    status: "new",
    createdAt: new Date().toISOString(),
  };
  const { DB } = getRuntimeBindings();
  await DB.prepare(
    `INSERT INTO store_orders (
      id, owner_email, customer_name, customer_whatsapp, note, items_json, totals_json,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      order.id,
      state.ownerEmail,
      order.customerName,
      order.customerWhatsapp,
      order.note,
      JSON.stringify(order.items),
      JSON.stringify(order.totals),
      order.status,
      order.createdAt,
      order.createdAt,
    )
    .run();
  const lines = [
    `Olá! Quero finalizar o pedido ${order.id.slice(0, 8).toUpperCase()}:`,
    ...order.items.map(
      (item) =>
        `• ${item.quantity}x ${item.name}${item.options.length ? ` (${item.options.join(", ")})` : ""}`,
    ),
    ...Object.entries(order.totals).map(([currency, total]) =>
      total
        ? `Total ${currency}: ${new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "pt-PT", { style: "currency", currency }).format(total)}`
        : "",
    ),
    order.note ? `Observação: ${order.note}` : "",
    `Nome: ${order.customerName}`,
  ].filter(Boolean);
  const phone = state.settings.whatsapp.replace(/\D/g, "");
  return {
    order,
    whatsappUrl: phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`
      : null,
  };
}

export async function listStoreOrders(ownerEmail: string) {
  await ensureOrdersTable();
  const { DB } = getRuntimeBindings();
  const rows = (
    await DB.prepare(
      "SELECT * FROM store_orders WHERE owner_email = ? ORDER BY created_at DESC LIMIT 200",
    )
      .bind(ownerEmail)
      .all<Record<string, string>>()
  ).results;
  return rows.map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    customerWhatsapp: row.customer_whatsapp,
    note: row.note,
    items: JSON.parse(row.items_json),
    totals: JSON.parse(row.totals_json),
    status: row.status,
    createdAt: row.created_at,
  })) as StoreOrder[];
}

export async function updateStoreOrderStatus(
  ownerEmail: string,
  id: string,
  status: StoreOrder["status"],
) {
  await ensureOrdersTable();
  const { DB } = getRuntimeBindings();
  await DB.prepare(
    "UPDATE store_orders SET status = ?, updated_at = ? WHERE id = ? AND owner_email = ?",
  )
    .bind(status, new Date().toISOString(), id, ownerEmail)
    .run();
}
