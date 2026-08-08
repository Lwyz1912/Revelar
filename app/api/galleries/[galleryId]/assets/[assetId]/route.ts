import { getChatGPTUser } from "@/app/chatgpt-auth";
import { galleryAsset, galleryById } from "@/lib/server/gallery-repository";
import { privateObjectResponse } from "@/lib/server/gallery-storage";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ galleryId: string; assetId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Entre para continuar", { status: 401 });
  const { galleryId, assetId } = await context.params;
  const gallery = await galleryById(galleryId);
  const asset = await galleryAsset(assetId);
  if (
    !gallery ||
    gallery.owner_email !== user.email ||
    !asset ||
    asset.gallery_id !== gallery.id ||
    asset.kind !== "watermark"
  ) {
    return new Response("Não encontrado", { status: 404 });
  }
  return privateObjectResponse(String(asset.object_key));
}
