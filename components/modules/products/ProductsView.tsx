import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from "react";

import { FileViewer } from "@/components/shared/FileViewer";
import { catalogKindLabels, productPriceLabels } from "@/config/labels";
import {
  deleteAppFile,
  fileDownloadUrl,
  isAppFileRef,
  uploadAppFile,
} from "@/lib/app-files.client";
import { formatMoney } from "@/lib/format";
import {
  calculateProductSaleTotal,
  discountedProductPrice,
  emptyProduct,
  productDiscountActive,
} from "@/lib/products";
import type {
  Client,
  Currency,
  Product,
  ProductAvailability,
  ProductDiscountType,
  ProductKind,
  ProductOption,
  ProductOptionValue,
  ProductPriceType,
  AppFileRef,
  ProductBadge,
  ProductStatus,
  StoreOrder,
  StoreSettings,
} from "@/types/revelar";

export function ProductsView({
  products,
  setProducts,
  clients,
  currency,
  onSale,
  onCreateQuote,
  storeSettings,
  setStoreSettings,
  toast,
}: {
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  clients: Client[];
  currency: Currency;
  onSale: (
    product: Product,
    clientId: number | undefined,
    quantity: number,
    options: string[],
    total: number,
  ) => void;
  onCreateQuote: (product: Product) => void;
  storeSettings: StoreSettings;
  setStoreSettings: Dispatch<SetStateAction<StoreSettings>>;
  toast: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | ProductKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");
  const [adminView, setAdminView] = useState<"catalog" | "orders">("catalog");
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Omit<Product, "id" | "sales">>(emptyProduct(currency));
  const [saleProductId, setSaleProductId] = useState<number | null>(null);
  const [saleClientId, setSaleClientId] = useState<number | undefined>(clients[0]?.id);
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleOptions, setSaleOptions] = useState<Record<string, string>>({});
  const [previewFile, setPreviewFile] = useState<AppFileRef | null>(null);

  useEffect(() => {
    void fetch("/api/store/orders", { cache: "no-store" })
      .then(async (response) =>
        response.ok ? ((await response.json()) as { orders?: StoreOrder[] }) : null,
      )
      .then((result) => setOrders(result?.orders || []))
      .catch(() => undefined);
  }, []);

  const visible = products.filter(
    (product) =>
      (kind === "all" || product.kind === kind) &&
      (statusFilter === "all" || product.status === statusFilter) &&
      (!search.trim() ||
        `${product.name} ${product.description} ${catalogKindLabels[product.kind]}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())),
  );
  const saleProduct = products.find((product) => product.id === saleProductId);
  const selectedOptionValues = saleProduct?.options
    .map((option) => option.values.find((value) => value.id === saleOptions[option.id]))
    .filter(Boolean) as ProductOptionValue[] | undefined;
  const saleTotals = saleProduct
    ? calculateProductSaleTotal(saleProduct, selectedOptionValues || [], saleQuantity)
    : { unitPrice: 0, total: 0 };
  const saleUnitPrice = saleTotals.unitPrice;
  const saleTotal = saleTotals.total;
  const deliveryFileName = (file: Product["deliveryFile"]) =>
    isAppFileRef(file) ? file.name : file || "";
  const uploadDeliveryFile = async (file?: File) => {
    if (!file) return;
    try {
      const uploaded = await uploadAppFile(file, "product", editingId ? String(editingId) : "new");
      if (isAppFileRef(draft.deliveryFile))
        await deleteAppFile(draft.deliveryFile).catch(() => undefined);
      setDraft({ ...draft, deliveryFile: uploaded });
      toast("Arquivo do produto salvo no Revelar.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível enviar o arquivo");
    }
  };
  const uploadCoverFile = async (file?: File) => {
    if (!file) return;
    try {
      const uploaded = await uploadAppFile(file, "product", editingId ? String(editingId) : "new");
      if (draft.coverFile) await deleteAppFile(draft.coverFile).catch(() => undefined);
      setDraft({ ...draft, coverFile: uploaded });
      toast("Imagem de capa salva para a loja");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível enviar a imagem");
    }
  };

  const updateProductStatus = (product: Product, status: ProductStatus) => {
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? {
              ...item,
              status,
              deletedAt: status === "deleted" ? new Date().toISOString() : undefined,
            }
          : item,
      ),
    );
    toast(
      status === "deleted" ? "Produto movido para a lixeira" : "Situação do produto atualizada",
    );
  };

  const updateOrder = async (order: StoreOrder, status: StoreOrder["status"]) => {
    const response = await fetch(`/api/store/orders/${order.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return;
    if (status === "confirmed" && order.status === "new") {
      setProducts((current) =>
        current.map((product) => {
          const ordered = order.items
            .filter((item) => item.productId === product.id)
            .reduce((sum, item) => sum + item.quantity, 0);
          if (!ordered) return product;
          return {
            ...product,
            sales: product.sales + ordered,
            availableQuantity:
              product.availability === "unlimited"
                ? product.availableQuantity
                : Math.max(0, (product.availableQuantity || 0) - ordered),
          };
        }),
      );
    }
    setOrders((current) =>
      current.map((item) => (item.id === order.id ? { ...item, status } : item)),
    );
    toast("Pedido atualizado");
  };

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyProduct(currency));
    setEditorOpen(true);
  };
  const openEdit = (product: Product) => {
    const { id, sales, ...editable } = product;
    void id;
    void sales;
    setEditingId(product.id);
    setDraft(editable);
    setEditorOpen(true);
  };
  const saveProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || (draft.priceType !== "consult" && draft.basePrice <= 0)) return;
    if (editingId)
      setProducts((current) =>
        current.map((product) =>
          product.id === editingId ? { ...draft, id: editingId, sales: product.sales } : product,
        ),
      );
    else
      setProducts((current) => [
        { ...draft, id: Math.max(...current.map((product) => product.id), 0) + 1, sales: 0 },
        ...current,
      ]);
    setEditorOpen(false);
    toast(editingId ? "Produto atualizado" : "Produto criado no catálogo");
  };
  const addOption = () =>
    setDraft({
      ...draft,
      options: [
        ...draft.options,
        {
          id: `option-${Date.now()}`,
          name: "Nova opção",
          values: [{ id: `value-${Date.now()}`, label: "Opção padrão", priceDelta: 0 }],
        },
      ],
    });
  const updateOption = (optionId: string, changes: Partial<ProductOption>) =>
    setDraft({
      ...draft,
      options: draft.options.map((option) =>
        option.id === optionId ? { ...option, ...changes } : option,
      ),
    });
  const updateOptionValue = (
    optionId: string,
    valueId: string,
    changes: Partial<ProductOptionValue>,
  ) =>
    setDraft({
      ...draft,
      options: draft.options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: option.values.map((value) =>
                value.id === valueId ? { ...value, ...changes } : value,
              ),
            }
          : option,
      ),
    });
  const addOptionValue = (optionId: string) =>
    setDraft({
      ...draft,
      options: draft.options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: [
                ...option.values,
                {
                  id: `value-${Date.now()}-${option.values.length}`,
                  label: "Nova variação",
                  priceDelta: 0,
                },
              ],
            }
          : option,
      ),
    });
  const openSale = (product: Product) => {
    if (product.priceType === "consult") {
      onCreateQuote(product);
      return;
    }
    setSaleProductId(product.id);
    setSaleQuantity(1);
    setSaleClientId(clients[0]?.id);
    setSaleOptions(
      Object.fromEntries(product.options.map((option) => [option.id, option.values[0]?.id || ""])),
    );
  };
  const confirmSale = (event: FormEvent) => {
    event.preventDefault();
    if (!saleProduct || saleQuantity < 1 || saleTotal <= 0) return;
    onSale(
      saleProduct,
      saleClientId,
      saleQuantity,
      (selectedOptionValues || []).map((option) => option.label),
      saleTotal,
    );
    setSaleProductId(null);
  };
  const statusLabel: Record<ProductStatus, string> = {
    active: "Ativo",
    draft: "Rascunho",
    hidden: "Oculto",
    archived: "Arquivado",
    deleted: "Na lixeira",
  };
  const orderStatusLabel: Record<StoreOrder["status"], string> = {
    new: "Novo",
    confirmed: "Confirmado",
    completed: "Concluído",
    cancelled: "Cancelado",
  };
  const storefrontUrl = typeof window === "undefined" ? "/loja" : `${window.location.origin}/loja`;

  return (
    <div className="products-page">
      <section className="documents-title-row">
        <div>
          <p>CATÁLOGO E VENDAS</p>
          <h1>Produtos</h1>
          <span>Preços reutilizáveis para pacotes, álbuns, fotos, cursos, PDFs e presets.</span>
        </div>
        <button className="primary-button" type="button" onClick={openNew}>
          ＋ Novo produto
        </button>
      </section>
      <section className="products-admin-tabs" aria-label="Gestão da loja">
        <button
          type="button"
          className={adminView === "catalog" ? "active" : ""}
          onClick={() => setAdminView("catalog")}
        >
          Catálogo
        </button>
        <button
          type="button"
          className={adminView === "orders" ? "active" : ""}
          onClick={() => setAdminView("orders")}
        >
          Pedidos <span>{orders.filter((order) => order.status === "new").length}</span>
        </button>
        <a href="/loja" target="_blank" rel="noreferrer">
          Abrir loja pública ↗
        </a>
      </section>
      <section className="store-settings card">
        <div className="store-settings-copy">
          <p>LOJA PÚBLICA</p>
          <h2>Venda pelo catálogo e finalize no WhatsApp</h2>
          <span>
            O pedido fica registrado antes de abrir a conversa, com itens e valores conferidos.
          </span>
        </div>
        <label>
          <span>Nome da loja</span>
          <input
            value={storeSettings.title}
            onChange={(event) => setStoreSettings({ ...storeSettings, title: event.target.value })}
          />
        </label>
        <label>
          <span>WhatsApp para pedidos</span>
          <input
            inputMode="tel"
            value={storeSettings.whatsapp}
            onChange={(event) =>
              setStoreSettings({ ...storeSettings, whatsapp: event.target.value })
            }
            placeholder="5511999999999"
          />
        </label>
        <label className="store-settings-description">
          <span>Apresentação</span>
          <input
            value={storeSettings.description}
            onChange={(event) =>
              setStoreSettings({ ...storeSettings, description: event.target.value })
            }
          />
        </label>
        <label className="store-enabled-toggle">
          <input
            type="checkbox"
            checked={storeSettings.enabled}
            onChange={(event) =>
              setStoreSettings({ ...storeSettings, enabled: event.target.checked })
            }
          />
          <span>Loja publicada</span>
        </label>
        <button
          type="button"
          className="copy-store-link"
          onClick={() => {
            void navigator.clipboard.writeText(storefrontUrl);
            toast("Link da loja copiado");
          }}
        >
          Copiar link
        </button>
      </section>
      {adminView === "catalog" ? (
        <>
          <section className="document-metrics">
            <article>
              <span>PRODUTOS ATIVOS</span>
              <strong>{products.filter((product) => product.status === "active").length}</strong>
              <small>Prontos para vender</small>
            </article>
            <article>
              <span>DIGITAIS</span>
              <strong>
                {
                  products.filter((product) => ["course", "pdf", "preset"].includes(product.kind))
                    .length
                }
              </strong>
              <small>Entrega por arquivo ou link</small>
            </article>
            <article>
              <span>DISPONIBILIDADE</span>
              <strong>
                {products.filter((product) => product.availability !== "unlimited").length}
              </strong>
              <small>Com estoque ou limite</small>
            </article>
            <article>
              <span>VENDAS REGISTRADAS</span>
              <strong>{products.reduce((sum, product) => sum + product.sales, 0)}</strong>
              <small>Integradas ao Financeiro</small>
            </article>
          </section>
          <section className="product-toolbar">
            <label className="client-search">
              <span className="search-glyph" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar produtos..."
              />
            </label>
            <div className="finance-tabs">
              {(
                ["all", "package", "album", "photo", "course", "pdf", "preset"] as Array<
                  "all" | ProductKind
                >
              ).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={kind === item ? "active" : ""}
                  onClick={() => setKind(item)}
                >
                  {item === "all" ? "Todos" : catalogKindLabels[item]}
                </button>
              ))}
            </div>
            <select
              className="product-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | ProductStatus)}
              aria-label="Filtrar por situação"
            >
              <option value="all">Todas as situações</option>
              <option value="active">Ativos</option>
              <option value="draft">Rascunhos</option>
              <option value="hidden">Ocultos</option>
              <option value="archived">Arquivados</option>
              <option value="deleted">Lixeira</option>
            </select>
          </section>
          <section className="product-grid">
            {visible.map((product) => {
              const promo = productDiscountActive(product);
              const unavailable =
                product.availability !== "unlimited" && (product.availableQuantity || 0) <= 0;
              const availabilityText =
                product.availabilityLabel ||
                (product.availability === "stock" ? "em estoque" : "vagas");
              return (
                <article
                  className={`card product-card ${product.status !== "active" ? "inactive" : ""}`}
                  key={product.id}
                >
                  {product.coverFile && (
                    <button
                      type="button"
                      className="product-cover"
                      onClick={() => setPreviewFile(product.coverFile || null)}
                    >
                      <img src={fileDownloadUrl(product.coverFile)} alt="" />
                    </button>
                  )}
                  {!!product.badges?.length && (
                    <div className="product-badges">
                      {product.badges.map((badge) => (
                        <span key={badge}>{badge}</span>
                      ))}
                    </div>
                  )}
                  <div className="product-card-top">
                    <span className={`product-kind kind-${product.kind}`}>
                      {catalogKindLabels[product.kind]}
                    </span>
                    <span className={`document-status status-${product.status}`}>
                      {statusLabel[product.status]}
                    </span>
                  </div>
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>
                  <div className="product-price">
                    <small>{productPriceLabels[product.priceType].toUpperCase()}</small>
                    {product.priceType === "consult" ? (
                      <strong>Sob consulta</strong>
                    ) : (
                      <>
                        <strong>
                          {product.priceType === "from" && "a partir de "}
                          {formatMoney(discountedProductPrice(product), product.currency)}
                        </strong>
                        {promo && <del>{formatMoney(product.basePrice, product.currency)}</del>}
                      </>
                    )}
                  </div>
                  <div className="product-facts">
                    <span>
                      {product.options.length
                        ? `${product.options.length} grupo${product.options.length > 1 ? "s" : ""} de opções`
                        : "Sem variações"}
                    </span>
                    <span>
                      {product.availability === "unlimited"
                        ? "Disponibilidade ilimitada"
                        : `${product.availableQuantity || 0} ${availabilityText}`}
                    </span>
                    <span>
                      {product.deliveryType === "file"
                        ? `Arquivo · ${deliveryFileName(product.deliveryFile) || "não anexado"}`
                        : product.deliveryType === "link"
                          ? "Entrega por link"
                          : "Entrega manual"}
                    </span>
                    <span>
                      {product.publicReady ? "Visível na loja pública" : "Somente uso interno"}
                    </span>
                    {unavailable && <span>Esgotado</span>}
                  </div>
                  <div className="product-card-actions">
                    <button type="button" onClick={() => openEdit(product)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => onCreateQuote(product)}>
                      Usar em orçamento
                    </button>
                    <button
                      className="primary-mini"
                      type="button"
                      disabled={unavailable || product.status !== "active"}
                      onClick={() => openSale(product)}
                    >
                      {product.priceType === "consult"
                        ? "Criar orçamento"
                        : unavailable
                          ? "Indisponível"
                          : "Vender"}
                    </button>
                    {product.status === "deleted" ? (
                      <button type="button" onClick={() => updateProductStatus(product, "draft")}>
                        Restaurar
                      </button>
                    ) : (
                      <details className="product-more-actions">
                        <summary aria-label="Mais ações">•••</summary>
                        <div>
                          <button
                            type="button"
                            onClick={() => updateProductStatus(product, "hidden")}
                          >
                            Ocultar
                          </button>
                          <button
                            type="button"
                            onClick={() => updateProductStatus(product, "archived")}
                          >
                            Arquivar
                          </button>
                          <button
                            type="button"
                            className="danger-action"
                            onClick={() => updateProductStatus(product, "deleted")}
                          >
                            Mover à lixeira
                          </button>
                        </div>
                      </details>
                    )}
                  </div>
                </article>
              );
            })}
            {visible.length === 0 && (
              <div className="card empty-state product-empty">
                <span>□</span>
                <h2>Nenhum produto encontrado</h2>
                <p>Ajuste os filtros ou crie um novo produto.</p>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="store-orders">
          {orders.map((order) => (
            <article className="card store-order-card" key={order.id}>
              <div className="store-order-heading">
                <div>
                  <span className={`document-status status-${order.status}`}>
                    {orderStatusLabel[order.status]}
                  </span>
                  <h2>{order.customerName}</h2>
                  <p>
                    {order.customerWhatsapp} · {new Date(order.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <strong>
                  {Object.entries(order.totals).map(([orderCurrency, total]) => (
                    <span key={orderCurrency}>
                      {formatMoney(total || 0, orderCurrency as Currency)}
                    </span>
                  ))}
                </strong>
              </div>
              <ul>
                {order.items.map((item, index) => (
                  <li key={`${item.productId}-${index}`}>
                    <span>
                      {item.quantity}× {item.name}
                    </span>
                    <small>{item.options.join(" · ") || "Sem variação"}</small>
                    <b>{formatMoney(item.unitPrice * item.quantity, item.currency)}</b>
                  </li>
                ))}
              </ul>
              {order.note && <p className="store-order-note">“{order.note}”</p>}
              <div className="store-order-actions">
                {order.status === "new" && (
                  <button type="button" onClick={() => void updateOrder(order, "confirmed")}>
                    Confirmar e baixar estoque
                  </button>
                )}
                {order.status === "confirmed" && (
                  <button type="button" onClick={() => void updateOrder(order, "completed")}>
                    Marcar concluído
                  </button>
                )}
                {!(["completed", "cancelled"] as StoreOrder["status"][]).includes(order.status) && (
                  <button
                    type="button"
                    className="danger-action"
                    onClick={() => void updateOrder(order, "cancelled")}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </article>
          ))}
          {!orders.length && (
            <div className="card empty-state product-empty">
              <span>◇</span>
              <h2>Nenhum pedido ainda</h2>
              <p>Os pedidos concluídos pelo carrinho aparecerão aqui antes do WhatsApp abrir.</p>
            </div>
          )}
        </section>
      )}

      {editorOpen && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={() => setEditorOpen(false)}
        >
          <aside
            className="client-drawer product-drawer"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p>{editingId ? "EDITAR PRODUTO" : "NOVO PRODUTO"}</p>
                <h2>{editingId ? draft.name : "Adicionar ao catálogo"}</h2>
                <span>Preço, variações, promoção, entrega e disponibilidade.</span>
              </div>
              <button type="button" onClick={() => setEditorOpen(false)}>
                ×
              </button>
            </div>
            <form onSubmit={saveProduct}>
              <div className="drawer-body">
                <div className="field-grid">
                  <label className="field full">
                    <span>Nome *</span>
                    <input
                      required
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      placeholder="Ex.: Pacote Casamento Essencial"
                    />
                  </label>
                  <label className="field">
                    <span>Tipo</span>
                    <select
                      value={draft.kind}
                      onChange={(event) =>
                        setDraft({ ...draft, kind: event.target.value as ProductKind })
                      }
                    >
                      {(Object.keys(catalogKindLabels) as ProductKind[]).map((item) => (
                        <option value={item} key={item}>
                          {catalogKindLabels[item]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        setDraft({ ...draft, status: event.target.value as Product["status"] })
                      }
                    >
                      <option value="active">Ativo</option>
                      <option value="draft">Rascunho</option>
                      <option value="hidden">Oculto</option>
                      <option value="archived">Arquivado</option>
                    </select>
                  </label>
                  <label className="field full">
                    <span>Descrição</span>
                    <textarea
                      rows={3}
                      value={draft.description}
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                      placeholder="Explique o que está incluído e para quem é o produto."
                    />
                  </label>
                  <label className="field">
                    <span>SKU / código interno</span>
                    <input
                      value={draft.sku || ""}
                      onChange={(event) => setDraft({ ...draft, sku: event.target.value })}
                      placeholder="Ex.: ALBUM-3030"
                    />
                  </label>
                  <label className="field file-field">
                    <span>Imagem de capa</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => void uploadCoverFile(event.target.files?.[0])}
                    />
                    {draft.coverFile && (
                      <span className="product-file-actions">
                        <button
                          type="button"
                          onClick={() => setPreviewFile(draft.coverFile || null)}
                        >
                          Visualizar
                        </button>
                        <button
                          type="button"
                          className="danger-action"
                          onClick={() => {
                            if (!draft.coverFile) return;
                            void deleteAppFile(draft.coverFile).catch(() => undefined);
                            setDraft({ ...draft, coverFile: undefined });
                          }}
                        >
                          Excluir
                        </button>
                      </span>
                    )}
                  </label>
                  <fieldset className="product-badge-picker field full">
                    <legend>Selos da loja</legend>
                    {(["Novo", "Promoção", "Últimas unidades", "Destaque"] as ProductBadge[]).map(
                      (badge) => (
                        <label key={badge}>
                          <input
                            type="checkbox"
                            checked={draft.badges?.includes(badge) || false}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                badges: event.target.checked
                                  ? [...(draft.badges || []), badge]
                                  : (draft.badges || []).filter((item) => item !== badge),
                              })
                            }
                          />
                          <span>{badge}</span>
                        </label>
                      ),
                    )}
                  </fieldset>
                  <label className="field">
                    <span>Tipo de preço</span>
                    <select
                      value={draft.priceType}
                      onChange={(event) =>
                        setDraft({ ...draft, priceType: event.target.value as ProductPriceType })
                      }
                    >
                      <option value="fixed">Preço fixo</option>
                      <option value="from">A partir de</option>
                      <option value="consult">Sob consulta</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Moeda</span>
                    <select
                      value={draft.currency}
                      onChange={(event) =>
                        setDraft({ ...draft, currency: event.target.value as Currency })
                      }
                    >
                      <option value="BRL">Real · R$</option>
                      <option value="EUR">Euro · €</option>
                    </select>
                  </label>
                  {draft.priceType !== "consult" && (
                    <label className="field full">
                      <span>Preço base *</span>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.basePrice || ""}
                        onChange={(event) =>
                          setDraft({ ...draft, basePrice: Number(event.target.value) })
                        }
                      />
                    </label>
                  )}
                </div>
                <section className="product-builder-section">
                  <div className="builder-heading">
                    <div>
                      <strong>Variações e acréscimos</strong>
                      <small>Ex.: Tamanho → 20×20 + R$ 0, 30×30 + R$ 250.</small>
                    </div>
                    <button type="button" onClick={addOption}>
                      ＋ Grupo de opções
                    </button>
                  </div>
                  {draft.options.map((option) => (
                    <article className="option-editor" key={option.id}>
                      <div>
                        <input
                          value={option.name}
                          onChange={(event) =>
                            updateOption(option.id, { name: event.target.value })
                          }
                          aria-label="Nome do grupo de opções"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              options: draft.options.filter((item) => item.id !== option.id),
                            })
                          }
                        >
                          Remover grupo
                        </button>
                      </div>
                      {option.values.map((value) => (
                        <div className="option-value-row" key={value.id}>
                          <input
                            value={value.label}
                            onChange={(event) =>
                              updateOptionValue(option.id, value.id, { label: event.target.value })
                            }
                            placeholder="Nome da opção"
                          />
                          <label>
                            <span>＋</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={value.priceDelta || ""}
                              onChange={(event) =>
                                updateOptionValue(option.id, value.id, {
                                  priceDelta: Number(event.target.value),
                                })
                              }
                              aria-label="Acréscimo"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              updateOption(option.id, {
                                values: option.values.filter((item) => item.id !== value.id),
                              })
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        className="add-option-value"
                        type="button"
                        onClick={() => addOptionValue(option.id)}
                      >
                        ＋ Adicionar escolha
                      </button>
                    </article>
                  ))}
                </section>
                <div className="field-grid">
                  <label className="field">
                    <span>Disponibilidade</span>
                    <select
                      value={draft.availability}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          availability: event.target.value as ProductAvailability,
                          availableQuantity:
                            event.target.value === "unlimited"
                              ? undefined
                              : draft.availableQuantity || 1,
                        })
                      }
                    >
                      <option value="unlimited">Ilimitada</option>
                      <option value="stock">Estoque físico</option>
                      <option value="capacity">Vagas / agenda</option>
                    </select>
                  </label>
                  {draft.availability !== "unlimited" && (
                    <>
                      <label className="field">
                        <span>Quantidade disponível</span>
                        <input
                          type="number"
                          min="0"
                          value={draft.availableQuantity || 0}
                          onChange={(event) =>
                            setDraft({ ...draft, availableQuantity: Number(event.target.value) })
                          }
                        />
                      </label>
                      <label className="field full">
                        <span>Descrição do limite</span>
                        <input
                          value={draft.availabilityLabel || ""}
                          onChange={(event) =>
                            setDraft({ ...draft, availabilityLabel: event.target.value })
                          }
                          placeholder="Ex.: vagas neste mês ou unidades em estoque"
                        />
                      </label>
                    </>
                  )}
                  <label className="field">
                    <span>Entrega</span>
                    <select
                      value={draft.deliveryType}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          deliveryType: event.target.value as Product["deliveryType"],
                        })
                      }
                    >
                      <option value="manual">Manual / serviço</option>
                      <option value="file">Arquivo anexado</option>
                      <option value="link">Link de entrega</option>
                    </select>
                  </label>
                  {draft.deliveryType === "file" && (
                    <label className="field file-field">
                      <span>Arquivo</span>
                      <input
                        type="file"
                        onChange={(event) => void uploadDeliveryFile(event.target.files?.[0])}
                      />
                      <small>
                        {deliveryFileName(draft.deliveryFile) || "Nenhum arquivo selecionado"}
                      </small>
                      {isAppFileRef(draft.deliveryFile) && (
                        <span className="product-file-actions">
                          <button
                            type="button"
                            onClick={() => setPreviewFile(draft.deliveryFile as AppFileRef)}
                          >
                            Visualizar
                          </button>
                          <a
                            href={fileDownloadUrl(draft.deliveryFile)}
                            download={draft.deliveryFile.name}
                          >
                            Baixar
                          </a>
                          <button
                            type="button"
                            className="danger-action"
                            onClick={() => {
                              if (!isAppFileRef(draft.deliveryFile)) return;
                              void deleteAppFile(draft.deliveryFile).catch(() => undefined);
                              setDraft({ ...draft, deliveryFile: undefined });
                            }}
                          >
                            Excluir
                          </button>
                        </span>
                      )}
                    </label>
                  )}
                  {draft.deliveryType === "link" && (
                    <label className="field">
                      <span>Link de entrega</span>
                      <input
                        type="url"
                        value={draft.deliveryLink || ""}
                        onChange={(event) =>
                          setDraft({ ...draft, deliveryLink: event.target.value })
                        }
                        placeholder="https://..."
                      />
                    </label>
                  )}
                  <label className="field">
                    <span>Desconto</span>
                    <select
                      value={draft.discountType}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          discountType: event.target.value as ProductDiscountType,
                        })
                      }
                    >
                      <option value="none">Sem desconto</option>
                      <option value="fixed">Valor fixo</option>
                      <option value="percent">Porcentagem</option>
                    </select>
                  </label>
                  {draft.discountType !== "none" && (
                    <>
                      <label className="field">
                        <span>
                          {draft.discountType === "percent"
                            ? "Porcentagem (%)"
                            : `Valor (${draft.currency})`}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.discountValue || ""}
                          onChange={(event) =>
                            setDraft({ ...draft, discountValue: Number(event.target.value) })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Início da promoção</span>
                        <input
                          type="date"
                          value={draft.discountStart || ""}
                          onChange={(event) =>
                            setDraft({ ...draft, discountStart: event.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Fim da promoção</span>
                        <input
                          type="date"
                          value={draft.discountEnd || ""}
                          onChange={(event) =>
                            setDraft({ ...draft, discountEnd: event.target.value })
                          }
                        />
                      </label>
                    </>
                  )}
                  <label className="checkbox-field full">
                    <input
                      type="checkbox"
                      checked={draft.publicReady}
                      onChange={(event) =>
                        setDraft({ ...draft, publicReady: event.target.checked })
                      }
                    />
                    <span>
                      <strong>Exibir na loja pública</strong>
                      <small>Só produtos ativos e marcados aqui aparecem para clientes.</small>
                    </span>
                  </label>
                  {draft.availability !== "unlimited" && (
                    <>
                      <label className="checkbox-field full">
                        <input
                          type="checkbox"
                          checked={draft.hideWhenSoldOut ?? true}
                          onChange={(event) =>
                            setDraft({ ...draft, hideWhenSoldOut: event.target.checked })
                          }
                        />
                        <span>
                          <strong>Ocultar automaticamente quando esgotar</strong>
                          <small>O produto volta à loja assim que o estoque for reposto.</small>
                        </span>
                      </label>
                      <label className="checkbox-field full">
                        <input
                          type="checkbox"
                          checked={draft.allowBackorder || false}
                          onChange={(event) =>
                            setDraft({ ...draft, allowBackorder: event.target.checked })
                          }
                        />
                        <span>
                          <strong>Aceitar encomenda sem estoque</strong>
                          <small>Permite finalizar o pedido mesmo com quantidade zerada.</small>
                        </span>
                      </label>
                    </>
                  )}
                </div>
              </div>
              <div className="drawer-footer">
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => setEditorOpen(false)}
                >
                  Cancelar
                </button>
                <button className="primary-button" type="submit">
                  Salvar produto
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {saleProduct && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={() => setSaleProductId(null)}
        >
          <aside
            className="client-drawer sale-drawer"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p>VENDA DIRETA</p>
                <h2>{saleProduct.name}</h2>
                <span>O recebimento será criado automaticamente no Financeiro.</span>
              </div>
              <button type="button" onClick={() => setSaleProductId(null)}>
                ×
              </button>
            </div>
            <form onSubmit={confirmSale}>
              <div className="drawer-body">
                <div className="field-grid">
                  <label className="field full">
                    <span>Cliente</span>
                    <select
                      value={saleClientId || ""}
                      onChange={(event) => setSaleClientId(Number(event.target.value) || undefined)}
                    >
                      <option value="">Venda sem cliente vinculado</option>
                      {clients.map((client) => (
                        <option value={client.id} key={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {saleProduct.options.map((option) => (
                    <label className="field" key={option.id}>
                      <span>{option.name}</span>
                      <select
                        value={saleOptions[option.id] || ""}
                        onChange={(event) =>
                          setSaleOptions({ ...saleOptions, [option.id]: event.target.value })
                        }
                      >
                        {option.values.map((value) => (
                          <option value={value.id} key={value.id}>
                            {value.label}
                            {value.priceDelta
                              ? ` (+${formatMoney(value.priceDelta, saleProduct.currency)})`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label className="field">
                    <span>Quantidade</span>
                    <input
                      type="number"
                      min="1"
                      max={
                        saleProduct.availability === "unlimited"
                          ? undefined
                          : saleProduct.availableQuantity
                      }
                      value={saleQuantity}
                      onChange={(event) =>
                        setSaleQuantity(Math.max(1, Number(event.target.value) || 1))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Situação</span>
                    <select disabled>
                      <option>Recebido</option>
                    </select>
                  </label>
                </div>
                <div className="sale-summary">
                  <span>
                    <small>VALOR UNITÁRIO</small>
                    <strong>{formatMoney(saleUnitPrice, saleProduct.currency)}</strong>
                  </span>
                  <b>× {saleQuantity}</b>
                  <span>
                    <small>TOTAL DA VENDA</small>
                    <strong>{formatMoney(saleTotal, saleProduct.currency)}</strong>
                  </span>
                </div>
                {productDiscountActive(saleProduct) && (
                  <div className="promotion-note">Promoção ativa aplicada automaticamente.</div>
                )}
                {saleProduct.deliveryType !== "manual" && (
                  <div className="delivery-note">
                    <strong>Entrega vinculada</strong>
                    <span>
                      {saleProduct.deliveryType === "file"
                        ? deliveryFileName(saleProduct.deliveryFile) || "Arquivo ainda não anexado"
                        : saleProduct.deliveryLink || "Link ainda não informado"}
                    </span>
                  </div>
                )}
              </div>
              <div className="drawer-footer">
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => setSaleProductId(null)}
                >
                  Cancelar
                </button>
                <button className="primary-button" type="submit">
                  Confirmar venda
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
      {previewFile && <FileViewer file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
}
