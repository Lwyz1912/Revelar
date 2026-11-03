"use client";

import { readApiJson } from "@/lib/api-response.client";
import type { GalleryFolder, WorkGallery } from "@/types/revelar";

export const GALLERY_MULTIPART_THRESHOLD = 8 * 1024 * 1024;
export const GALLERY_MULTIPART_PART_SIZE = 5 * 1024 * 1024;

type UploadedPart = { partNumber: number; etag: string };

type MultipartSession = {
  uploadId: string;
  objectKey: string;
};

export function galleryUploadParts(size: number) {
  const ranges: Array<{ partNumber: number; start: number; end: number }> = [];
  for (let start = 0, partNumber = 1; start < size; start += GALLERY_MULTIPART_PART_SIZE) {
    ranges.push({
      partNumber,
      start,
      end: Math.min(size, start + GALLERY_MULTIPART_PART_SIZE),
    });
    partNumber += 1;
  }
  return ranges;
}

export async function uploadGalleryFileMultipart({
  galleryId,
  file,
  folder,
  photoId,
  variant,
  onProgress,
}: {
  galleryId: string;
  file: File;
  folder: GalleryFolder;
  photoId?: string;
  variant: "original" | "high";
  onProgress?: (progress: number) => void;
}) {
  const endpoint = `/api/galleries/${encodeURIComponent(galleryId)}/multipart-upload`;
  const createResponse = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "create",
      folder,
      filename: file.name,
      mimeType: file.type || "image/jpeg",
      size: file.size,
      photoId,
      variant,
    }),
  });
  const session = await readApiJson<MultipartSession & { error?: string }>(
    createResponse,
    `Não foi possível preparar ${file.name}.`,
  );
  if (!createResponse.ok || !session.uploadId || !session.objectKey) {
    throw new Error(session.error || `Não foi possível preparar ${file.name}.`);
  }

  const parts: UploadedPart[] = [];
  const ranges = galleryUploadParts(file.size);
  try {
    for (const range of ranges) {
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set("uploadId", session.uploadId);
      url.searchParams.set("objectKey", session.objectKey);
      url.searchParams.set("partNumber", String(range.partNumber));
      const partResponse = await fetch(url, {
        method: "PUT",
        headers: { "content-type": "application/octet-stream" },
        body: file.slice(range.start, range.end),
      });
      const part = await readApiJson<{ part?: UploadedPart; error?: string }>(
        partResponse,
        `A parte ${range.partNumber} de ${file.name} não foi enviada.`,
      );
      if (!partResponse.ok || !part.part) {
        throw new Error(part.error || `A parte ${range.partNumber} de ${file.name} falhou.`);
      }
      parts.push(part.part);
      onProgress?.(Math.round((range.end / file.size) * 92));
    }

    const completeResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        uploadId: session.uploadId,
        objectKey: session.objectKey,
        parts,
        folder,
        filename: file.name,
        mimeType: file.type || "image/jpeg",
        size: file.size,
        photoId,
        variant,
      }),
    });
    const completed = await readApiJson<{ gallery?: WorkGallery; error?: string }>(
      completeResponse,
      `O envio de ${file.name} terminou, mas não pôde ser confirmado.`,
    );
    if (!completeResponse.ok || !completed.gallery) {
      throw new Error(completed.error || `Não foi possível confirmar o envio de ${file.name}.`);
    }
    onProgress?.(100);
    return completed.gallery;
  } catch (error) {
    await fetch(endpoint, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uploadId: session.uploadId, objectKey: session.objectKey }),
    }).catch(() => undefined);
    throw error;
  }
}
