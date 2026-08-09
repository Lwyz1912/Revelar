import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ownerKey } from "@/lib/server/gallery-repository";
import { privateObjectResponse, safeFilename, storeObject } from "@/lib/server/gallery-storage";

export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para continuar" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type)) {
    return Response.json({ error: "Envie uma imagem JPG, PNG ou WebP." }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: "A foto do cliente deve ter até 5 MB." }, { status: 413 });
  }
  const keyOwner = await ownerKey(user.email);
  const key = `owners/${keyOwner}/clients/${crypto.randomUUID()}-${safeFilename(file.name)}`;
  await storeObject(key, file);
  return Response.json({ url: `/api/client-avatar?key=${encodeURIComponent(key)}` });
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Entre para continuar", { status: 401 });
  const key = new URL(request.url).searchParams.get("key");
  const keyOwner = await ownerKey(user.email);
  if (!key || !key.startsWith(`owners/${keyOwner}/clients/`)) {
    return new Response("Não encontrado", { status: 404 });
  }
  return privateObjectResponse(key);
}
