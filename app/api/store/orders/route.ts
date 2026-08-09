import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createStoreOrder, listStoreOrders } from "@/lib/server/store-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para ver os pedidos." }, { status: 401 });
  return Response.json({ orders: await listStoreOrders(user.email) });
}

export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as {
    customerName?: string;
    customerWhatsapp?: string;
    note?: string;
    items?: Array<{ productId: number; quantity: number; optionValueIds: string[] }>;
  } | null;
  if (!input?.customerName?.trim() || !input.customerWhatsapp?.trim() || !input.items?.length)
    return Response.json(
      { error: "Preencha nome, WhatsApp e adicione produtos ao carrinho." },
      { status: 400 },
    );
  try {
    return Response.json(
      await createStoreOrder({
        customerName: input.customerName,
        customerWhatsapp: input.customerWhatsapp,
        note: input.note,
        items: input.items,
      }),
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Não foi possível criar o pedido." },
      { status: 400 },
    );
  }
}
