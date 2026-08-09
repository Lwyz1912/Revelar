import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createEditingAlbum } from "@/lib/server/editing-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para criar um álbum." }, { status: 401 });
  const input = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = input?.name?.trim();
  if (!name) return Response.json({ error: "Dê um nome ao álbum." }, { status: 400 });
  return Response.json({ album: await createEditingAlbum(user.email, name) });
}
