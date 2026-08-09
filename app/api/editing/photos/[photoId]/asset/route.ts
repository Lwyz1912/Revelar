import { getChatGPTUser } from "@/app/chatgpt-auth";
import { privateObjectResponse } from "@/lib/server/gallery-storage";
import { editingPhoto, photoBelongsToOwner } from "@/lib/server/editing-repository";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ photoId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Entre para continuar", { status: 401 });
  const { photoId } = await context.params;
  const photo = await editingPhoto(photoId);
  if (!photo || !(await photoBelongsToOwner(photo, user.email))) {
    return new Response("Foto não encontrada", { status: 404 });
  }
  const variant = new URL(request.url).searchParams.get("variant");
  const key =
    variant === "original"
      ? photo.original_key
      : variant === "edited"
        ? photo.edited_key
        : photo.preview_key;
  if (!key) return new Response("Versão não encontrada", { status: 404 });
  return privateObjectResponse(key, variant === "original" ? photo.filename : undefined);
}
