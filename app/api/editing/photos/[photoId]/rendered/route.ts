import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ownerKey } from "@/lib/server/gallery-repository";
import { safeFilename, storeObject } from "@/lib/server/gallery-storage";
import {
  editingLibrary,
  editingPhoto,
  photoBelongsToOwner,
  saveEditedKey,
} from "@/lib/server/editing-repository";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ photoId: string }> };
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para salvar a versão." }, { status: 401 });
  const { photoId } = await context.params;
  const photo = await editingPhoto(photoId);
  if (!photo || !(await photoBelongsToOwner(photo, user.email))) {
    return Response.json({ error: "Foto não encontrada." }, { status: 404 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type)) {
    return Response.json({ error: "Versão editada inválida." }, { status: 400 });
  }
  if (file.size > 250 * 1024 * 1024) {
    return Response.json({ error: "A versão editada excede 250 MB." }, { status: 413 });
  }
  const keyOwner = await ownerKey(user.email);
  const key = `owners/${keyOwner}/editing/${photo.album_id}/${photoId}/edited-${safeFilename(file.name)}`;
  await storeObject(key, file);
  await saveEditedKey(photoId, key);
  return Response.json(await editingLibrary(user.email));
}
