import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  addGalleryPhoto,
  attachGalleryPhotoOriginal,
  attachGalleryPhotoVariant,
  galleryById,
  ownerKey,
  recordGalleryEvent,
  serializeGallery,
} from "@/lib/server/gallery-repository";
import { galleryBucket, objectKey, safeFilename } from "@/lib/server/gallery-storage";
import type { GalleryFolder } from "@/types/revelar";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ galleryId: string }> };
type MultipartVariant = "original" | "high";
type MultipartPayload = {
  action?: "create" | "complete";
  uploadId?: string;
  objectKey?: string;
  parts?: Array<{ partNumber: number; etag: string }>;
  folder?: GalleryFolder;
  filename?: string;
  mimeType?: string;
  size?: number;
  photoId?: string;
  variant?: MultipartVariant;
};

const allowedFolders = new Set<GalleryFolder>(["originals", "preview", "edited", "delivered"]);
const maxFileSize = 90 * 1024 * 1024;
const maxPartSize = 6 * 1024 * 1024;

async function ownedGallery(context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user)
    return {
      response: Response.json({ error: "Entre novamente para enviar fotos." }, { status: 401 }),
    };
  const { galleryId } = await context.params;
  const gallery = await galleryById(galleryId);
  if (!gallery || gallery.owner_email !== user.email) {
    return { response: Response.json({ error: "Galeria não encontrada." }, { status: 404 }) };
  }
  const keyOwner = await ownerKey(user.email);
  const scope =
    gallery.work_id === null ? `albums/${galleryId}` : `works/${gallery.work_id}-${galleryId}`;
  return { user, galleryId, gallery, keyOwner, prefix: `owners/${keyOwner}/${scope}/` };
}

function validateFilePayload(payload: MultipartPayload) {
  const folder = payload.folder;
  const filename = payload.filename?.trim() || "";
  const mimeType = payload.mimeType?.trim() || "application/octet-stream";
  const size = Number(payload.size || 0);
  const variant = payload.variant;
  if (!folder || !allowedFolders.has(folder)) return "Pasta de destino inválida.";
  if (!filename || filename.length > 240) return "Nome de arquivo inválido.";
  if (size <= 0 || size > maxFileSize) return "O arquivo deve ter no máximo 90 MB.";
  if (!/^image\/(jpeg|png|webp)$/i.test(mimeType) && !/\.(jpe?g|png|webp)$/i.test(filename)) {
    return "Use uma imagem JPG, PNG ou WebP.";
  }
  if (variant === "original" && !payload.photoId) return "A prévia desta foto não foi encontrada.";
  if (variant === "high" && folder !== "delivered")
    return "A versão final deve ir para Entrega final.";
  if (variant !== "original" && variant !== "high") return "Tipo de envio inválido.";
  return null;
}

function validSessionKey(objectKeyValue: string | undefined, prefix: string) {
  return Boolean(
    objectKeyValue && objectKeyValue.startsWith(prefix) && !objectKeyValue.includes(".."),
  );
}

export async function POST(request: Request, context: RouteContext) {
  const owned = await ownedGallery(context);
  if ("response" in owned) return owned.response;
  try {
    const payload = (await request.json()) as MultipartPayload;
    const validationError = validateFilePayload(payload);
    if (validationError) return Response.json({ error: validationError }, { status: 400 });
    const filename = payload.filename!.trim();
    const mimeType = payload.mimeType?.trim() || "application/octet-stream";
    const folder = payload.folder!;
    const variant = payload.variant!;

    if (payload.action === "create") {
      const key = objectKey({
        ownerKey: owned.keyOwner,
        workId: owned.gallery.work_id,
        galleryId: owned.galleryId,
        folder: variant === "original" ? "originais" : "entrega-final",
        filename,
      });
      const upload = await galleryBucket().createMultipartUpload(key, {
        httpMetadata: {
          contentType: mimeType,
          contentDisposition: `${variant === "high" ? "attachment" : "inline"}; filename="${safeFilename(filename)}"`,
          cacheControl: "private, no-store",
        },
        customMetadata: { originalName: filename.slice(0, 240) },
      });
      return Response.json({ uploadId: upload.uploadId, objectKey: key }, { status: 201 });
    }

    if (payload.action !== "complete") {
      return Response.json({ error: "Ação de envio inválida." }, { status: 400 });
    }
    if (!payload.uploadId || !validSessionKey(payload.objectKey, owned.prefix)) {
      return Response.json({ error: "Sessão de envio inválida." }, { status: 400 });
    }
    const parts = (payload.parts || [])
      .filter(
        (part) =>
          Number.isInteger(part.partNumber) && part.partNumber > 0 && Boolean(part.etag?.trim()),
      )
      .sort((left, right) => left.partNumber - right.partNumber)
      .slice(0, 100);
    if (!parts.length || parts.some((part, index) => part.partNumber !== index + 1)) {
      return Response.json(
        { error: "O envio ficou incompleto. Tente novamente." },
        { status: 400 },
      );
    }
    const upload = galleryBucket().resumeMultipartUpload(payload.objectKey!, payload.uploadId);
    await upload.complete(parts);

    try {
      let photoId = payload.photoId;
      if (variant === "original") {
        const attached = await attachGalleryPhotoOriginal({
          galleryId: owned.galleryId,
          photoId: payload.photoId!,
          filename,
          mimeType,
          objectKey: payload.objectKey!,
          size: Number(payload.size),
        });
        if (!attached) throw new Error("A prévia desta foto não foi encontrada.");
        await recordGalleryEvent(
          owned.galleryId,
          "original_attached",
          `${filename} armazenado em alta`,
          payload.photoId,
        );
      } else {
        photoId =
          (await attachGalleryPhotoVariant({
            galleryId: owned.galleryId,
            folder,
            filename,
            variant: "high",
            objectKey: payload.objectKey!,
            size: Number(payload.size),
          })) || undefined;
        if (!photoId) {
          photoId = await addGalleryPhoto({
            galleryId: owned.galleryId,
            folder,
            filename,
            mimeType,
            size: Number(payload.size),
            previewKey: payload.objectKey!,
            highKey: payload.objectKey!,
          });
        }
        await recordGalleryEvent(
          owned.galleryId,
          "delivery_uploaded",
          `${filename} pronto para entrega final`,
          photoId,
        );
      }
      const refreshed = await galleryById(owned.galleryId);
      return Response.json({ gallery: await serializeGallery(refreshed!) });
    } catch (error) {
      await galleryBucket().delete(payload.objectKey!);
      throw error;
    }
  } catch (error) {
    console.error("multipart gallery upload failed", error);
    return Response.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "O armazenamento não concluiu o envio. Tente novamente.",
      },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const owned = await ownedGallery(context);
  if ("response" in owned) return owned.response;
  try {
    const url = new URL(request.url);
    const uploadId = url.searchParams.get("uploadId") || "";
    const objectKeyValue = url.searchParams.get("objectKey") || "";
    const partNumber = Number(url.searchParams.get("partNumber") || 0);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (
      !uploadId ||
      !validSessionKey(objectKeyValue, owned.prefix) ||
      !Number.isInteger(partNumber) ||
      partNumber < 1
    ) {
      return Response.json({ error: "Parte do envio inválida." }, { status: 400 });
    }
    if (contentLength > maxPartSize) {
      return Response.json(
        { error: "Esta parte do arquivo ultrapassou o limite." },
        { status: 413 },
      );
    }
    const body = await request.arrayBuffer();
    if (!body.byteLength || body.byteLength > maxPartSize) {
      return Response.json(
        { error: "Esta parte do arquivo está vazia ou é muito grande." },
        { status: 400 },
      );
    }
    const upload = galleryBucket().resumeMultipartUpload(objectKeyValue, uploadId);
    const part = await upload.uploadPart(partNumber, body);
    return Response.json({ part: { partNumber: part.partNumber, etag: part.etag } });
  } catch (error) {
    console.error("multipart gallery part failed", error);
    return Response.json(
      { error: "Uma parte da foto não chegou ao armazenamento. Tente novamente." },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const owned = await ownedGallery(context);
  if ("response" in owned) return owned.response;
  try {
    const payload = (await request.json()) as Pick<MultipartPayload, "uploadId" | "objectKey">;
    if (!payload.uploadId || !validSessionKey(payload.objectKey, owned.prefix)) {
      return Response.json({ error: "Sessão de envio inválida." }, { status: 400 });
    }
    await galleryBucket().resumeMultipartUpload(payload.objectKey!, payload.uploadId).abort();
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
