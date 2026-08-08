import { publicGalleryAccess, publicPhotoWhere } from "@/lib/server/gallery-public";
import { recordGalleryEvent } from "@/lib/server/gallery-repository";
import { getRuntimeBindings } from "@/lib/server/runtime-bindings";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const access = await publicGalleryAccess(request, slug);
  if (access.response) return access.response;
  const gallery = access.gallery!;
  if (!access.authorized) {
    return Response.json({
      locked: true,
      gallery: {
        workTitle: gallery.work_title,
        clientName: gallery.client_name,
        expiresAt: gallery.expires_at,
      },
    });
  }
  const { DB } = getRuntimeBindings();
  const photos = (
    await DB.prepare(
      `SELECT id, filename, folder, selected, approved, comment, preview_key, high_key, social_key
       FROM gallery_photos WHERE gallery_id = ? AND ${publicPhotoWhere(gallery)}
       ORDER BY created_at ASC`,
    )
      .bind(gallery.id)
      .all<Record<string, string | number | null>>()
  ).results;
  const assets = (
    await DB.prepare(
      "SELECT id, kind, filename, size FROM gallery_assets WHERE gallery_id = ? AND kind IN ('high_zip', 'social_zip') ORDER BY created_at DESC",
    )
      .bind(gallery.id)
      .all<Record<string, string | number | null>>()
  ).results;
  await recordGalleryEvent(gallery.id, "gallery_viewed", "Cliente visualizou a galeria");
  const selected = photos.filter((photo) => Number(photo.selected) === 1).length;
  const extraCount = Math.max(0, selected - Number(gallery.selection_limit || 0));
  return Response.json(
    {
      locked: false,
      gallery: {
        workTitle: gallery.work_title,
        clientName: gallery.client_name,
        phase: gallery.phase,
        expiresAt: gallery.expires_at,
        selectionLimit: Number(gallery.selection_limit || 0),
        selectionLocked: Number(gallery.selection_locked) === 1,
        revisionLimit: Number(gallery.revision_limit || 0),
        revisionRound: Number(gallery.revision_round || 1),
        currency: gallery.currency,
        extraPrice: Number(gallery.extra_price_cents || 0) / 100,
        watermarkLabel: gallery.watermark_label,
        selected,
        extraCount,
        extraAmount: (extraCount * Number(gallery.extra_price_cents || 0)) / 100,
        photos: photos.map((photo) => ({
          id: String(photo.id),
          filename: String(photo.filename),
          selected: Number(photo.selected) === 1,
          approved: Number(photo.approved) === 1,
          comment: String(photo.comment || ""),
          imageUrl: `/api/gallery/${slug}/photo/${photo.id}`,
          canDownloadHigh: gallery.phase === "delivery" && Boolean(photo.high_key),
          canDownloadSocial: gallery.phase === "delivery" && Boolean(photo.social_key),
        })),
        assets: assets.map((asset) => ({
          id: String(asset.id),
          kind: String(asset.kind),
          filename: String(asset.filename),
          size: Number(asset.size || 0),
          downloadUrl: `/api/gallery/${slug}/asset/${asset.id}`,
        })),
      },
    },
    {
      headers: {
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex, noarchive, noimageindex",
      },
    },
  );
}
