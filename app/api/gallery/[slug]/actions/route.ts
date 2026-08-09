import { publicGalleryAccess } from "@/lib/server/gallery-public";
import {
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
  if (gallery.selection_locked) {
    return Response.json(
      { error: "A seleção está fechada. A fotógrafa pode reabri-la." },
      { status: 409 },
    );
  }
  if (!input.photoId) return Response.json({ error: "Foto inválida." }, { status: 400 });
  const photo = await galleryPhoto(input.photoId);
  if (!photo || photo.gallery_id !== gallery.id) {
    return Response.json({ error: "Foto não encontrada." }, { status: 404 });
  }
  if (gallery.phase === "approval") {
    const nextComment = input.comment?.trim()
      ? [String(photo.comment || "").trim(), input.comment.trim()].filter(Boolean).join("\n")
      : input.comment;
    await setPhotoApproval(gallery.id, input.photoId, Boolean(input.value), nextComment);
    await recordGalleryEvent(
      gallery.id,
      input.comment?.trim() ? "edit_comment" : "edit_approval",
      input.comment?.trim()
        ? `Cliente comentou em ${photo.filename}`
        : `${photo.filename} ${input.value ? "aprovada" : "marcada para ajuste"}`,
      input.photoId,
    );
  } else if (gallery.phase === "selection") {
    const nextComment = input.comment?.trim()
      ? [String(photo.comment || "").trim(), input.comment.trim()].filter(Boolean).join("\n")
      : input.comment;
    await setPhotoSelection(gallery.id, input.photoId, Boolean(input.value), nextComment);
    await recordGalleryEvent(
      gallery.id,
      input.comment?.trim() ? "selection_comment" : "photo_selected",
      input.comment?.trim()
        ? `Cliente comentou em ${photo.filename}`
        : `${photo.filename} ${input.value ? "selecionada" : "removida da seleção"}`,
      input.photoId,
    );
  } else {
    return Response.json({ error: "A entrega não aceita novas seleções." }, { status: 409 });
  }
  const latest = await galleryPhoto(input.photoId);
  return Response.json({ ok: true, comment: String(latest?.comment || "") });
}
