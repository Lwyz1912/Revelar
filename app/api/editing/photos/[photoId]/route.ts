import { getChatGPTUser } from "@/app/chatgpt-auth";
import { normalizeAdjustments } from "@/lib/editing";
import {
  editingLibrary,
  editingPhoto,
  photoBelongsToOwner,
  saveEditingRecipe,
} from "@/lib/server/editing-repository";
import type { EditingAdjustments } from "@/types/revelar";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ photoId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para salvar a edição." }, { status: 401 });
  const { photoId } = await context.params;
  const photo = await editingPhoto(photoId);
  if (!photo || !(await photoBelongsToOwner(photo, user.email))) {
    return Response.json({ error: "Foto não encontrada." }, { status: 404 });
  }
  const input = (await request.json().catch(() => null)) as {
    presetId?: string | null;
    adjustments?: Partial<EditingAdjustments>;
  } | null;
  if (!input?.adjustments) {
    return Response.json({ error: "Ajustes inválidos." }, { status: 400 });
  }
  await saveEditingRecipe(photoId, input.presetId || null, normalizeAdjustments(input.adjustments));
  return Response.json(await editingLibrary(user.email));
}
