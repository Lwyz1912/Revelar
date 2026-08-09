import { appFileResponse } from "@/lib/server/app-file-repository";
import { publicStoreAssetOwner } from "@/lib/server/store-repository";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ fileId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { fileId } = await context.params;
  const ownerEmail = await publicStoreAssetOwner(fileId);
  if (!ownerEmail) return new Response("Imagem não encontrada", { status: 404 });
  return appFileResponse(ownerEmail, fileId);
}
