import { getChatGPTUser } from "@/app/chatgpt-auth";
import { editingLibrary } from "@/lib/server/editing-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para abrir seus álbuns." }, { status: 401 });
  return Response.json(await editingLibrary(user.email));
}
