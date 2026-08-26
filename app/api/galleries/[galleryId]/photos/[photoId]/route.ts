import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  addGalleryPhotoComment,
  galleryById,
  galleryPhoto,
  recordGalleryEvent,
  serializeGallery,
  updateGalleryPhotoMetadata,
} from "@/lib/server/gallery-repository";
import { privateObjectResponse } from "@/lib/server/gallery-storage";
import { professionalDisplayName } from "@/lib/server/professional-settings-repository";

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

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para continuar" }, { status: 401 });
  const { galleryId, photoId } = await context.params;
  const gallery = await galleryById(galleryId);
  if (!gallery || gallery.owner_email !== user.email)
    return Response.json({ error: "Não encontrado" }, { status: 404 });
  const photo = await galleryPhoto(photoId);
  if (!photo || photo.gallery_id !== gallery.id || photo.deleted_at)
    return Response.json({ error: "Foto indisponível" }, { status: 404 });
  const input = (await request.json().catch(() => ({}))) as {
    message?: string;
    internalNote?: string;
    caption?: string;
    tags?: string[];
    rating?: number;
  };
  if (
    input.internalNote !== undefined ||
    input.caption !== undefined ||
    input.tags !== undefined ||
    input.rating !== undefined
  ) {
    await updateGalleryPhotoMetadata(galleryId, photoId, input);
    await recordGalleryEvent(
      galleryId,
      "photo_metadata_updated",
      "Ficha interna da foto atualizada",
      photoId,
    );
    return Response.json({ gallery: await serializeGallery(gallery) });
  }
  if (!input.message?.trim())
    return Response.json({ error: "Escreva uma resposta" }, { status: 400 });
  const responderName = await professionalDisplayName(user.email, user.displayName);
  await addGalleryPhotoComment({
    galleryId,
    photoId,
    authorRole: "photographer",
    authorName: responderName,
    message: input.message,
  });
  await recordGalleryEvent(
    galleryId,
    "photographer_reply",
    `${responderName} respondeu um comentário`,
    photoId,
  );
  return Response.json({ gallery: await serializeGallery(gallery), responderName });
}
