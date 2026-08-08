import {
  createGallerySession,
  galleryBySlug,
  galleryValidUntil,
  recordGalleryEvent,
} from "@/lib/server/gallery-repository";
import { gallerySessionCookie, isExpired, verifyPin } from "@/lib/server/gallery-security";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const gallery = await galleryBySlug(slug);
  if (!gallery) return Response.json({ error: "Galeria não encontrada." }, { status: 404 });
  if (isExpired(gallery.expires_at)) {
    return Response.json({ error: "Este link expirou." }, { status: 410 });
  }
  const input = (await request.json()) as { pin?: string };
  if (gallery.pin_hash && gallery.pin_salt) {
    const valid = await verifyPin(input.pin || "", gallery.pin_salt, gallery.pin_hash);
    if (!valid) {
      await recordGalleryEvent(gallery.id, "pin_failed", "Tentativa de acesso com PIN incorreto");
      return Response.json({ error: "PIN incorreto." }, { status: 401 });
    }
  }
  const session = await createGallerySession(gallery.id, galleryValidUntil(gallery));
  await recordGalleryEvent(gallery.id, "gallery_unlocked", "Cliente acessou a galeria privada");
  return Response.json(
    { ok: true },
    {
      headers: { "set-cookie": gallerySessionCookie(gallery.id, session.token, session.expiresAt) },
    },
  );
}
