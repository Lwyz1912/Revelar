import {
  galleryBySlug,
  validGallerySession,
  type GalleryRow,
} from "@/lib/server/gallery-repository";
import { gallerySessionCookieName, isExpired, parseCookie } from "@/lib/server/gallery-security";

export async function publicGalleryAccess(request: Request, slug: string) {
  const gallery = await galleryBySlug(slug);
  if (!gallery) return { response: new Response("Galeria não encontrada", { status: 404 }) };
  if (isExpired(gallery.expires_at)) {
    return { response: new Response("Este link de galeria expirou", { status: 410 }) };
  }
  if (!gallery.pin_hash) return { gallery, authorized: true };
  const token = parseCookie(request, gallerySessionCookieName(gallery.id));
  return { gallery, authorized: await validGallerySession(gallery.id, token) };
}

export function publicPhotoWhere(gallery: GalleryRow) {
  if (gallery.phase === "delivery")
    return "(preview_key IS NOT NULL OR high_key IS NOT NULL OR social_key IS NOT NULL)";
  if (gallery.phase === "approval") return "(folder = 'edited' AND preview_key IS NOT NULL)";
  return "(folder IN ('preview', 'originals') AND preview_key IS NOT NULL)";
}
