import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  galleryById,
  galleryPhoto,
  linkGalleryPhotoToEditor,
  recordGalleryEvent,
} from "@/lib/server/gallery-repository";
import { addEditingPhoto, createEditingAlbum, editingPhoto } from "@/lib/server/editing-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ galleryId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para editar fotos." }, { status: 401 });
  const { galleryId } = await context.params;
  const gallery = await galleryById(galleryId);
  if (!gallery || gallery.owner_email !== user.email) {
    return Response.json({ error: "Álbum não encontrado." }, { status: 404 });
  }
  const input = (await request.json().catch(() => ({}))) as { photoIds?: string[] };
  const ids = [...new Set(input.photoIds || [])].slice(0, 100);
  if (!ids.length) return Response.json({ error: "Selecione ao menos uma foto." }, { status: 400 });

  const imported: string[] = [];
  let albumId = "";
  for (const photoId of ids) {
    const photo = await galleryPhoto(photoId);
    if (!photo || photo.gallery_id !== galleryId || photo.deleted_at) continue;
    if (photo.editing_photo_id) {
      const current = await editingPhoto(String(photo.editing_photo_id));
      if (current) {
        albumId ||= current.album_id;
        imported.push(current.id);
        continue;
      }
    }
    const originalKey = String(photo.original_key || photo.high_key || photo.preview_key || "");
    const previewKey = String(photo.preview_key || photo.original_key || photo.high_key || "");
    if (!originalKey || !previewKey) continue;
    if (!albumId) {
      const album = await createEditingAlbum(
        user.email,
        `Edição · ${gallery.name || gallery.work_title}`,
      );
      albumId = album.id;
    }
    const editingPhotoId = await addEditingPhoto({
      albumId,
      filename: String(photo.filename),
      mimeType: String(photo.mime_type),
      size: Number(photo.size || 0),
      width: 0,
      height: 0,
      originalKey,
      previewKey,
    });
    await linkGalleryPhotoToEditor(galleryId, photoId, editingPhotoId);
    imported.push(editingPhotoId);
  }
  if (!imported.length) {
    return Response.json(
      { error: "As fotos selecionadas não possuem arquivo editável." },
      { status: 400 },
    );
  }
  await recordGalleryEvent(
    galleryId,
    "editing_queue_created",
    `${imported.length} foto(s) enviadas para o estúdio`,
  );
  return Response.json({ albumId, photoIds: imported });
}
