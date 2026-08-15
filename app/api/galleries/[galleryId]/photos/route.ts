import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  galleryById,
  recordGalleryEvent,
  restoreGalleryPhotos,
  serializeGallery,
  trashGalleryPhotos,
} from "@/lib/server/gallery-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ galleryId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para continuar" }, { status: 401 });
  const { galleryId } = await context.params;
  const gallery = await galleryById(galleryId);
  if (!gallery || gallery.owner_email !== user.email)
    return Response.json({ error: "Galeria não encontrada" }, { status: 404 });
  const input = (await request.json().catch(() => ({}))) as {
    action?: "trash" | "restore";
    photoIds?: string[];
  };
  const photoIds = Array.isArray(input.photoIds)
    ? input.photoIds.filter((id): id is string => typeof id === "string")
    : [];
  if (!photoIds.length)
    return Response.json({ error: "Selecione pelo menos uma foto" }, { status: 400 });
  if (input.action === "restore") {
    await restoreGalleryPhotos(galleryId, photoIds);
    await recordGalleryEvent(
      galleryId,
      "photos_restored",
      `${photoIds.length} foto(s) restaurada(s) da lixeira`,
    );
  } else {
    await trashGalleryPhotos(galleryId, photoIds);
    await recordGalleryEvent(
      galleryId,
      "photos_trashed",
      `${photoIds.length} foto(s) movida(s) para a lixeira`,
    );
  }
  return Response.json({ gallery: await serializeGallery(gallery) });
}
