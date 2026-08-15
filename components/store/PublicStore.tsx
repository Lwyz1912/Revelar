"use client";

import { useEffect, useMemo, useState } from "react";

import { catalogKindLabels } from "@/config/labels";
import {
  calculateProductSaleTotal,
  discountedProductPrice,
  productDiscountActive,
} from "@/lib/products";
import type { Currency, Product, ProductKind, StoreSettings } from "@/types/revelar";
import { useUrlStringState } from "@/hooks/use-url-state";

const storeCategories = ["all", "package", "album", "photo", "course", "pdf", "preset"] as const;

type CartItem = {
  key: string;
  productId: number;
  name: string;
  quantity: number;
  optionValueIds: string[];
  optionLabels: string[];
  unitPrice: number;
  currency: Currency;
};

const fallbackCover: Record<ProductKind, string> = {
  package: "/demo/gallery/casamento.webp",
  album: "/demo/gallery/familia.webp",
  photo: "/demo/gallery/ensaio-pessoal.webp",
  course: "/demo/gallery/editorial.webp",
  pdf: "/demo/gallery/familia.webp",
  preset: "/demo/gallery/editorial.webp",
};

function money(value: number, currency: Currency) {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

function cover(product: Product) {
  return product.coverFile
    ? `/api/store/assets/${product.coverFile.id}`
    : fallbackCover[product.kind];
}

export function PublicStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useUrlStringState<"all" | ProductKind>(
    "category",
    "all",
    storeCategories,
  );
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customer, setCustomer] = useState({ name: "", whatsapp: "", note: "" });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    void fetch("/api/store", { cache: "no-store" })
      .then(
        async (response): Promise<{ products?: Product[]; settings?: StoreSettings } | null> =>
          response.ok ? response.json() : null,
      )
      .then((data) => {
        setProducts(data?.products || []);
        setSettings(data?.settings || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const visible = products.filter((product) => category === "all" || product.kind === category);
  const totals = useMemo(
    () =>
      cart.reduce<Partial<Record<Currency, number>>>((current, item) => {
        current[item.currency] = (current[item.currency] || 0) + item.unitPrice * item.quantity;
        return current;
      }, {}),
    [cart],
  );

  const openProduct = (product: Product) => {
    setActiveProduct(product);
    setSelectedOptions(
      Object.fromEntries(product.options.map((option) => [option.id, option.values[0]?.id || ""])),
    );
  };

  const addToCart = (product: Product) => {
    const optionValues = product.options
      .map((option) => option.values.find((value) => value.id === selectedOptions[option.id]))
      .filter(Boolean) as Product["options"][number]["values"];
    const optionValueIds = optionValues.map((option) => option.id);
    const key = `${product.id}:${optionValueIds.join("-")}`;
    const unitPrice =
      product.priceType === "consult"
        ? 0
        : calculateProductSaleTotal(product, optionValues, 1).unitPrice;
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      return existing
        ? current.map((item) =>
            item.key === key ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [
            ...current,
            {
              key,
              productId: product.id,
              name: product.name,
              quantity: 1,
              optionValueIds,
              optionLabels: optionValues.map((option) => option.label),
              unitPrice,
              currency: product.currency,
            },
          ];
    });
    setActiveProduct(null);
    setCartOpen(true);
    setFeedback(`${product.name} foi adicionado ao carrinho`);
    window.setTimeout(() => setFeedback(""), 2200);
  };

  const finish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cart.length || !customer.name.trim() || !customer.whatsapp.trim()) return;
    setSending(true);
    const response = await fetch("/api/store/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerName: customer.name,
        customerWhatsapp: customer.whatsapp,
        note: customer.note,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          optionValueIds: item.optionValueIds,
        })),
      }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      whatsappUrl?: string | null;
    };
    setSending(false);
    if (!response.ok) {
      setFeedback(result.error || "Não foi possível criar o pedido.");
      return;
    }
    if (!result.whatsappUrl) {
      setFeedback("Pedido registrado. A fotógrafa ainda precisa configurar o WhatsApp da loja.");
      return;
    }
    window.location.assign(result.whatsappUrl);
  };

  if (loading) return <main className="store-loading">Preparando a loja…</main>;
  if (!settings?.enabled)
    return <main className="store-loading">A loja está temporariamente indisponível.</main>;

  return (
    <main className="public-store">
      <header className="store-header">
        <a href="/loja" aria-label="Início da loja">
          <img src="/brand/revelar-logo-horizontal.svg" alt="Revelar." />
        </a>
        <button type="button" onClick={() => setCartOpen(true)}>
          Carrinho <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b>
        </button>
      </header>
      <section className="store-hero">
        <span>MARY FOTOGRAFIA</span>
        <h1>{settings.title}</h1>
        <p>{settings.description}</p>
      </section>
      <nav className="store-categories" aria-label="Categorias de produtos">
        <button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>
          Todos
        </button>
        {(["package", "album", "photo", "course", "pdf", "preset"] as ProductKind[]).map((kind) =>
          products.some((product) => product.kind === kind) ? (
            <button
              className={category === kind ? "active" : ""}
              key={kind}
              onClick={() => setCategory(kind)}
            >
              {catalogKindLabels[kind]}
            </button>
          ) : null,
        )}
      </nav>
      <section className="store-product-grid">
        {visible.map((product) => {
          const soldOut =
            product.availability !== "unlimited" && (product.availableQuantity || 0) <= 0;
          return (
            <article key={product.id} className={soldOut ? "sold-out" : ""}>
              <button
                className="store-product-image"
                type="button"
                onClick={() => openProduct(product)}
              >
                <img src={cover(product)} alt={product.name} />
                <span className="store-badges">
                  {product.badges?.map((badge) => (
                    <b key={badge}>{badge}</b>
                  ))}
                  {soldOut && <b>Esgotado</b>}
                </span>
              </button>
              <div>
                <small>{catalogKindLabels[product.kind]}</small>
                <h2>{product.name}</h2>
                <p>{product.description}</p>
                <footer>
                  <span>
                    {product.priceType === "consult" ? (
                      <strong>Sob consulta</strong>
                    ) : (
                      <>
                        <strong>
                          {product.priceType === "from" ? "A partir de " : ""}
                          {money(discountedProductPrice(product), product.currency)}
                        </strong>
                        {productDiscountActive(product) && (
                          <del>{money(product.basePrice, product.currency)}</del>
                        )}
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={soldOut && !product.allowBackorder}
                    onClick={() => openProduct(product)}
                  >
                    {soldOut && !product.allowBackorder ? "Esgotado" : "Ver produto"}
                  </button>
                </footer>
              </div>
            </article>
          );
        })}
        {!visible.length && (
          <p className="store-empty">Nenhum produto disponível nesta categoria.</p>
        )}
      </section>

      {feedback && (
        <div className="store-feedback" role="status">
          {feedback}
        </div>
      )}

      {activeProduct && (
        <div className="store-modal-backdrop" onMouseDown={() => setActiveProduct(null)}>
          <section
            className="store-product-dialog"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="store-close" type="button" onClick={() => setActiveProduct(null)}>
              ×
            </button>
            <img src={cover(activeProduct)} alt={activeProduct.name} />
            <div>
              <span>{catalogKindLabels[activeProduct.kind]}</span>
              <h2>{activeProduct.name}</h2>
              <p>{activeProduct.description}</p>
              {activeProduct.options.map((option) => (
                <label key={option.id}>
                  {option.name}
                  <select
                    value={selectedOptions[option.id] || ""}
                    onChange={(event) =>
                      setSelectedOptions({ ...selectedOptions, [option.id]: event.target.value })
                    }
                  >
                    {option.values.map((value) => (
                      <option key={value.id} value={value.id}>
                        {value.label}
                        {value.priceDelta
                          ? ` (+${money(value.priceDelta, activeProduct.currency)})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <button className="store-add" type="button" onClick={() => addToCart(activeProduct)}>
                Adicionar ao carrinho
              </button>
            </div>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="store-cart-backdrop" onMouseDown={() => setCartOpen(false)}>
          <aside className="store-cart" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>SEU PEDIDO</span>
                <h2>Carrinho</h2>
              </div>
              <button type="button" onClick={() => setCartOpen(false)}>
                ×
              </button>
            </header>
            <div className="store-cart-items">
              {cart.map((item) => (
                <article key={item.key}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.optionLabels.join(" · ") || "Sem variações"}</small>
                  </div>
                  <span>
                    <button
                      type="button"
                      onClick={() =>
                        setCart((current) =>
                          current.map((row) =>
                            row.key === item.key
                              ? { ...row, quantity: Math.max(1, row.quantity - 1) }
                              : row,
                          ),
                        )
                      }
                    >
                      −
                    </button>
                    <b>{item.quantity}</b>
                    <button
                      type="button"
                      onClick={() =>
                        setCart((current) =>
                          current.map((row) =>
                            row.key === item.key ? { ...row, quantity: row.quantity + 1 } : row,
                          ),
                        )
                      }
                    >
                      ＋
                    </button>
                  </span>
                  <strong>
                    {item.unitPrice
                      ? money(item.unitPrice * item.quantity, item.currency)
                      : "Sob consulta"}
                  </strong>
                  <button
                    className="store-remove"
                    type="button"
                    onClick={() =>
                      setCart((current) => current.filter((row) => row.key !== item.key))
                    }
                  >
                    Remover
                  </button>
                </article>
              ))}
              {!cart.length && <p>Seu carrinho está vazio.</p>}
            </div>
            {cart.length > 0 && (
              <form onSubmit={finish}>
                <div className="store-totals">
                  {Object.entries(totals).map(([currency, total]) =>
                    total ? (
                      <span key={currency}>
                        <small>Total {currency}</small>
                        <strong>{money(total, currency as Currency)}</strong>
                      </span>
                    ) : null,
                  )}
                </div>
                <label>
                  Seu nome
                  <input
                    required
                    value={customer.name}
                    onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
                  />
                </label>
                <label>
                  Seu WhatsApp
                  <input
                    required
                    inputMode="tel"
                    value={customer.whatsapp}
                    onChange={(event) => setCustomer({ ...customer, whatsapp: event.target.value })}
                    placeholder="DDD + número"
                  />
                </label>
                <label>
                  Observações
                  <textarea
                    rows={3}
                    value={customer.note}
                    onChange={(event) => setCustomer({ ...customer, note: event.target.value })}
                    placeholder="Prazo, personalização ou dúvidas"
                  />
                </label>
                <button className="store-whatsapp-checkout" type="submit" disabled={sending}>
                  {sending ? "Preparando pedido…" : "Finalizar pelo WhatsApp"}
                </button>
                <small>
                  O pedido será registrado e a conversa abrirá com todos os itens e valores
                  preenchidos.
                </small>
              </form>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
