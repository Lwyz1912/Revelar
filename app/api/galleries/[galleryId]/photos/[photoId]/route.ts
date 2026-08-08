import { getChatGPTUser } from "@/app/chatgpt-auth";
import { galleryById, galleryPhoto } from "@/lib/server/gallery-repository";
import { privateObjectResponse } from "@/lib/server/gallery-storage";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ galleryId: string; photoId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Entre para continuar", { status: 401 });
  const { galleryId, photoId } = await context.params;
  const gallery = await galleryById(galleryId);
  if (!gallery || gallery.owner_email !== user.email)
    return new Response("Não encontrado", { status: 404 });
  const photo = await galleryPhoto(photoId);
  if (!photo || photo.gallery_id !== gallery.id)
    return new Response("Não encontrado", { status: 404 });
  const variant = new URL(request.url).searchParams.get("variant");
  const key =
    variant === "original"
      ? String(photo.original_key || photo.high_key || "")
      : variant === "social"
        ? String(photo.social_key || "")
        : String(photo.preview_key || "");
  return key ? privateObjectResponse(key) : new Response("Versão indisponível", { status: 404 });
}
