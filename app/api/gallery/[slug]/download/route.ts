import { publicGalleryAccess } from "@/lib/server/gallery-public";
import { recordGalleryEvent } from "@/lib/server/gallery-repository";
import { galleryBucket, safeFilename } from "@/lib/server/gallery-storage";
import { getRuntimeBindings } from "@/lib/server/runtime-bindings";
import { createStoredZipStream } from "@/lib/server/stored-zip";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const access = await publicGalleryAccess(request, slug);
  if (access.response) return access.response;
  if (!access.authorized) return new Response("PIN necessário", { status: 401 });
  const gallery = access.gallery!;
  if (gallery.phase !== "delivery") {
    return new Response("Entrega ainda não liberada", { status: 403 });
  }

  const { DB } = getRuntimeBindings();
  const photos = (
    await DB.prepare(
      `SELECT filename, high_key, social_key
       FROM gallery_photos
       WHERE gallery_id = ? AND folder = 'delivered' AND deleted_at IS NULL
         AND (high_key IS NOT NULL OR social_key IS NOT NULL)
       ORDER BY created_at ASC`,
    )
      .bind(gallery.id)
      .all<Record<string, string | null>>()
  ).results;
  const bucket = galleryBucket();
  const prepared = [] as Array<{ filename: string; key: string; size: number }>;
  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    const key = String(photo.high_key || photo.social_key || "");
    if (!key) continue;
    const object = await bucket.head(key);
    if (!object || object.size > 0xffffffff) continue;
    prepared.push({
      filename: `${String(index + 1).padStart(3, "0")}-${safeFilename(String(photo.filename))}`,
      key,
      size: object.size,
    });
  }
  if (!prepared.length) return new Response("Nenhuma foto disponível", { status: 404 });

  await recordGalleryEvent(
    gallery.id,
    "delivery_downloaded",
    `${prepared.length} fotos baixadas em um único pacote`,
  );
  const filename = safeFilename(`${gallery.work_title || "entrega"}-fotos.zip`);
  return new Response(
    createStoredZipStream(
      prepared.map((entry) => ({
        filename: entry.filename,
        size: entry.size,
        open: async () => (await bucket.get(entry.key))?.body ?? null,
      })),
    ),
    {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `attachment; filename="${filename}"`,
        "content-type": "application/zip",
        "x-robots-tag": "noindex, noarchive",
      },
    },
  );
}
