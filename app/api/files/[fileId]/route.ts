import { getChatGPTUser } from "@/app/chatgpt-auth";
import { appFileResponse, removeAppFile } from "@/lib/server/app-file-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ fileId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Entre para visualizar arquivos.", { status: 401 });
  const { fileId } = await context.params;
  const download = new URL(request.url).searchParams.get("download") === "1";
  return appFileResponse(user.email, fileId, download);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para excluir arquivos." }, { status: 401 });
  const { fileId } = await context.params;
  const removed = await removeAppFile(user.email, fileId);
  return removed
    ? Response.json({ ok: true })
    : Response.json({ error: "Arquivo não encontrado." }, { status: 404 });
}
