import { publicGalleryAccess } from "@/lib/server/gallery-public";
import { galleryAsset, recordGalleryEvent } from "@/lib/server/gallery-repository";
import { privateObjectResponse } from "@/lib/server/gallery-storage";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string; assetId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug, assetId } = await context.params;
  const access = await publicGalleryAccess(request, slug);
  if (access.response) return access.response;
  if (!access.authorized) return new Response("PIN necessário", { status: 401 });
  const gallery = access.gallery!;
  if (gallery.phase !== "delivery")
    return new Response("Entrega ainda não liberada", { status: 403 });
  const asset = await galleryAsset(assetId);
  if (
    !asset ||
    asset.gallery_id !== gallery.id ||
    !["high_zip", "social_zip"].includes(String(asset.kind))
  ) {
    return new Response("Arquivo não encontrado", { status: 404 });
  }
  await recordGalleryEvent(gallery.id, "delivery_downloaded", `${asset.filename} baixado`);
  return privateObjectResponse(String(asset.object_key), String(asset.filename));
}
