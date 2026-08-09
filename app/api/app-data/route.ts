import { getChatGPTUser } from "@/app/chatgpt-auth";
import { readAppState, writeAppState } from "@/lib/server/app-state-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para sincronizar seus dados." }, { status: 401 });
  return Response.json(await readAppState(user.email));
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para sincronizar seus dados." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object")
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  try {
    return Response.json(await writeAppState(user.email, body));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar." },
      { status: 400 },
    );
  }
}
