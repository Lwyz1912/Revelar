import { publicGalleryAccess } from "@/lib/server/gallery-public";
import { galleryPhoto, recordGalleryEvent } from "@/lib/server/gallery-repository";
import { privateObjectResponse } from "@/lib/server/gallery-storage";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string; photoId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug, photoId } = await context.params;
  const access = await publicGalleryAccess(request, slug);
  if (access.response) return access.response;
  if (!access.authorized) return new Response("PIN necessário", { status: 401 });
  const gallery = access.gallery!;
  const photo = await galleryPhoto(photoId);
  if (!photo || photo.gallery_id !== gallery.id || photo.deleted_at)
    return new Response("Foto não encontrada", { status: 404 });
  const variant = new URL(request.url).searchParams.get("variant");
  if (variant && gallery.phase !== "delivery") {
    return new Response("Download ainda não liberado", { status: 403 });
  }
  const key =
    variant === "high"
      ? String(photo.high_key || "")
      : variant === "social"
        ? String(photo.social_key || "")
        : String(photo.preview_key || "");
  if (!key) return new Response("Versão indisponível", { status: 404 });
  if (variant)
    await recordGalleryEvent(gallery.id, "photo_downloaded", `${photo.filename} baixada`, photoId);
  return privateObjectResponse(key, variant ? String(photo.filename) : undefined);
}
