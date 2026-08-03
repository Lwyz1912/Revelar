import type {
  Currency,
  Product,
  ProductKind,
  ProductOptionValue,
  QuoteItem,
} from "@/types/revelar";

export function emptyProduct(currency: Currency): Omit<Product, "id" | "sales"> {
  return {
    name: "",
    kind: "package",
    description: "",
    currency,
    priceType: "fixed",
    basePrice: 0,
    options: [],
    availability: "unlimited",
    deliveryType: "manual",
    discountType: "none",
    discountValue: 0,
    status: "active",
    publicReady: false,
  };
}

export function productDiscountActive(
  product: Pick<Product, "discountType" | "discountValue" | "discountStart" | "discountEnd">,
  today = new Date().toISOString().slice(0, 10),
) {
  return (
    product.discountType !== "none" &&
    product.discountValue > 0 &&
    (!product.discountStart || product.discountStart <= today) &&
    (!product.discountEnd || product.discountEnd >= today)
  );
}

export function discountedProductPrice(
  product: Product,
  price = product.basePrice,
  today?: string,
) {
  if (!productDiscountActive(product, today)) return price;
  return Math.max(
    0,
    product.discountType === "percent"
      ? price * (1 - product.discountValue / 100)
      : price - product.discountValue,
  );
}

export function calculateProductSaleTotal(
  product: Product,
  selectedOptions: ProductOptionValue[],
  quantity: number,
  today?: string,
) {
  const optionsTotal = selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);
  const unitPrice = discountedProductPrice(product, product.basePrice + optionsTotal, today);
  return {
    unitPrice,
    total: unitPrice * Math.max(0, quantity),
  };
}

export function productToQuoteKind(kind: ProductKind): QuoteItem["kind"] {
  if (kind === "package") return "service";
  if (kind === "album") return "extra";
  return kind;
}
