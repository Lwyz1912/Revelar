import { getChatGPTUser } from "@/app/chatgpt-auth";
import { updateStoreOrderStatus } from "@/lib/server/store-repository";
import type { StoreOrderStatus } from "@/types/revelar";

type RouteContext = { params: Promise<{ orderId: string }> };
const statuses = new Set<StoreOrderStatus>(["new", "confirmed", "completed", "cancelled"]);

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para alterar pedidos." }, { status: 401 });
  const { orderId } = await context.params;
  const input = (await request.json().catch(() => null)) as { status?: StoreOrderStatus } | null;
  if (!input?.status || !statuses.has(input.status))
    return Response.json({ error: "Status inválido." }, { status: 400 });
  await updateStoreOrderStatus(user.email, orderId, input.status);
  return Response.json({ ok: true });
}
