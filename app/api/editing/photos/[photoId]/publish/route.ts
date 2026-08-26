import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  galleryPhotoForEditing,
  publishEditedGalleryPhoto,
  recordGalleryEvent,
} from "@/lib/server/gallery-repository";
import { editingPhoto, photoBelongsToOwner } from "@/lib/server/editing-repository";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ photoId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para publicar a versão." }, { status: 401 });
  const { photoId } = await context.params;
  const photo = await editingPhoto(photoId);
  if (!photo || !(await photoBelongsToOwner(photo, user.email))) {
    return Response.json({ error: "Foto não encontrada." }, { status: 404 });
  }
  if (!photo.edited_key) {
    return Response.json(
      { error: "Salve uma versão editada antes de enviar ao trabalho." },
      { status: 400 },
    );
  }
  const source = await galleryPhotoForEditing(user.email, photoId);
  if (!source || source.work_id === null) {
    return Response.json(
      { error: "Esta foto pertence a um álbum independente e não está vinculada a um trabalho." },
      { status: 400 },
    );
  }
  await publishEditedGalleryPhoto({
    galleryId: source.gallery_id,
    editingPhotoId: photoId,
    filename: photo.filename,
    mimeType: photo.mime_type,
    size: Number(photo.size || 0),
    objectKey: photo.edited_key,
  });
  await recordGalleryEvent(
    source.gallery_id,
    "edited_version_published",
    `${photo.filename} adicionada a Fotos editadas`,
    source.id,
  );
  return Response.json({ ok: true, workId: source.work_id, galleryId: source.gallery_id });
}
