import { getChatGPTUser } from "@/app/chatgpt-auth";
import { normalizeAdjustments } from "@/lib/editing";
import { editingLibrary, savePrivatePreset } from "@/lib/server/editing-repository";
import type { EditingPreset } from "@/types/revelar";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para salvar presets." }, { status: 401 });
  const input = (await request.json().catch(() => null)) as EditingPreset | null;
  if (!input?.name?.trim() || !input.adjustments) {
    return Response.json({ error: "Preset inválido." }, { status: 400 });
  }
  await savePrivatePreset(user.email, {
    ...input,
    builtIn: false,
    adjustments: normalizeAdjustments(input.adjustments),
  });
  return Response.json(await editingLibrary(user.email));
}
