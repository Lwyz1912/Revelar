import { publicGalleryAccess } from "@/lib/server/gallery-public";
import {
  addGalleryPhotoComment,
  galleryPhotoComments,
  galleryPhoto,
  recordGalleryEvent,
  setPhotoApproval,
  setPhotoSelection,
  updateGallerySettings,
} from "@/lib/server/gallery-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const access = await publicGalleryAccess(request, slug);
  if (access.response) return access.response;
  if (!access.authorized) return Response.json({ error: "PIN necessário." }, { status: 401 });
  const gallery = access.gallery!;
  const input = (await request.json()) as {
    action?: "toggle" | "comment" | "confirm";
    photoId?: string;
    value?: boolean;
    comment?: string;
  };
  if (input.action === "confirm") {
    if (gallery.selection_locked) {
      return Response.json({ error: "Esta etapa já foi confirmada." }, { status: 409 });
    }
    await updateGallerySettings(gallery, { selectionLocked: true });
    await recordGalleryEvent(
      gallery.id,
      gallery.phase === "approval" ? "approval_confirmed" : "selection_confirmed",
      gallery.phase === "approval"
        ? "Cliente confirmou a aprovação das fotos editadas"
        : "Cliente confirmou a seleção de fotos",
    );
    return Response.json({ ok: true });
  }
  if (!input.photoId) return Response.json({ error: "Foto inválida." }, { status: 400 });
  const photo = await galleryPhoto(input.photoId);
  if (!photo || photo.gallery_id !== gallery.id) {
    return Response.json({ error: "Foto não encontrada." }, { status: 404 });
  }
  if (photo.deleted_at) return Response.json({ error: "Esta foto foi removida" }, { status: 410 });
  const message = input.comment?.trim();
  if (input.action === "comment") {
    if (!message)
      return Response.json({ error: "Escreva um comentário antes de enviar." }, { status: 400 });
    await addGalleryPhotoComment({
      galleryId: gallery.id,
      photoId: input.photoId,
      authorRole: "client",
      authorName: gallery.client_name,
      message,
    });
    await recordGalleryEvent(
      gallery.id,
      "client_comment",
      `Cliente comentou em ${photo.filename}`,
      input.photoId,
    );
    return Response.json({
      ok: true,
      comments: await galleryPhotoComments(gallery.id, input.photoId),
    });
  }
  if (gallery.selection_locked) {
    return Response.json(
      { error: "A seleção está fechada. A fotógrafa pode reabri-la." },
      { status: 409 },
    );
  }
  if (gallery.phase === "approval") {
    await setPhotoApproval(gallery.id, input.photoId, Boolean(input.value));
    await recordGalleryEvent(
      gallery.id,
      "edit_approval",
      `${photo.filename} ${input.value ? "aprovada" : "marcada para ajuste"}`,
      input.photoId,
    );
  } else if (gallery.phase === "selection") {
    await setPhotoSelection(gallery.id, input.photoId, Boolean(input.value));
    await recordGalleryEvent(
      gallery.id,
      "photo_selected",
      `${photo.filename} ${input.value ? "selecionada" : "removida da seleção"}`,
      input.photoId,
    );
  } else {
    return Response.json({ error: "A entrega não aceita novas seleções." }, { status: 409 });
  }
  return Response.json({
    ok: true,
    comments: await galleryPhotoComments(gallery.id, input.photoId),
  });
}
