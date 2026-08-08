import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  addGalleryAsset,
  addGalleryPhoto,
  attachGalleryPhotoVariant,
  galleryById,
  ownerKey,
  recordGalleryEvent,
  serializeGallery,
  updateGallerySettings,
} from "@/lib/server/gallery-repository";
import { objectKey, storeObject } from "@/lib/server/gallery-storage";
import type { GalleryFolder } from "@/types/revelar";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ galleryId: string }> };
const photoFolders = new Set<GalleryFolder>(["originals", "preview", "edited", "delivered"]);

export async function POST(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para enviar arquivos." }, { status: 401 });
  const { galleryId } = await context.params;
  const gallery = await galleryById(galleryId);
  if (!gallery || gallery.owner_email !== user.email) {
    return Response.json({ error: "Galeria não encontrada." }, { status: 404 });
  }
  const form = await request.formData();
  const file = form.get("file");
  const preview = form.get("preview");
  const folder = String(form.get("folder") || "preview") as GalleryFolder;
  const assetKind = String(form.get("assetKind") || "");
  const variant = String(form.get("variant") || "high");
  if (!(file instanceof File) && !(preview instanceof File)) {
    return Response.json({ error: "Selecione um arquivo." }, { status: 400 });
  }
  if (file instanceof File && file.size > 250 * 1024 * 1024) {
    return Response.json({ error: "O arquivo individual excede 250 MB." }, { status: 413 });
  }
  const keyOwner = await ownerKey(user.email);
  if (["high_zip", "social_zip", "watermark"].includes(assetKind) && file instanceof File) {
    const key = objectKey({
      ownerKey: keyOwner,
      workId: gallery.work_id,
      galleryId,
      folder: assetKind === "watermark" ? "marca-dagua" : "entregues",
      filename: file.name,
    });
    await storeObject(key, file, assetKind === "watermark" ? "inline" : "attachment");
    await addGalleryAsset({
      galleryId,
      kind: assetKind as "high_zip" | "social_zip" | "watermark",
      filename: file.name,
      objectKey: key,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });
    if (assetKind === "watermark") await updateGallerySettings(gallery, { watermarkKey: key });
    await recordGalleryEvent(
      galleryId,
      assetKind === "watermark" ? "watermark_updated" : "delivery_uploaded",
      assetKind === "watermark"
        ? "Marca-d’água personalizada atualizada"
        : `${file.name} pronto para entrega`,
    );
    return Response.json({ gallery: await serializeGallery((await galleryById(galleryId))!) });
  }
  if (!photoFolders.has(folder)) {
    return Response.json({ error: "Pasta de destino inválida." }, { status: 400 });
  }
  let previewKey: string | null = null;
  let originalKey: string | null = null;
  let highKey: string | null = null;
  let socialKey: string | null = null;
  if (preview instanceof File) {
    previewKey = objectKey({
      ownerKey: keyOwner,
      workId: gallery.work_id,
      galleryId,
      folder: folder === "edited" ? "editadas-preview" : "previa-protegida",
      filename: preview.name,
    });
    await storeObject(previewKey, preview);
  }
  if (file instanceof File) {
    const fileKey = objectKey({
      ownerKey: keyOwner,
      workId: gallery.work_id,
      galleryId,
      folder,
      filename: file.name,
    });
    await storeObject(fileKey, file, folder === "delivered" ? "attachment" : "inline");
    if (folder === "edited" || folder === "delivered") {
      if (variant === "social") socialKey = fileKey;
      else highKey = fileKey;
    } else {
      originalKey = fileKey;
    }
  }
  const source = file instanceof File ? file : (preview as File);
  if (
    file instanceof File &&
    folder === "delivered" &&
    (variant === "high" || variant === "social")
  ) {
    const attachedPhotoId = await attachGalleryPhotoVariant({
      galleryId,
      folder,
      filename: file.name,
      variant,
      objectKey: variant === "social" ? socialKey! : highKey!,
      size: file.size,
    });
    if (attachedPhotoId) {
      await recordGalleryEvent(
        galleryId,
        "delivery_uploaded",
        `${file.name} recebeu a versão ${variant === "social" ? "para redes" : "em alta"}`,
        attachedPhotoId,
      );
      return Response.json({ gallery: await serializeGallery(gallery) });
    }
  }
  await addGalleryPhoto({
    galleryId,
    folder,
    filename: source.name,
    mimeType: source.type || "application/octet-stream",
    size: (file instanceof File ? file.size : 0) + (preview instanceof File ? preview.size : 0),
    previewKey,
    originalKey,
    highKey,
    socialKey,
  });
  await recordGalleryEvent(galleryId, "files_uploaded", `${source.name} enviado para ${folder}`);
  return Response.json({ gallery: await serializeGallery(gallery) });
}
