import { getRuntimeBindings } from "@/lib/server/runtime-bindings";

export function galleryBucket() {
  return getRuntimeBindings().BUCKET;
}

export function safeFilename(filename: string) {
  const extension = filename.includes(".") ? `.${filename.split(".").pop()}` : "";
  const base = filename
    .replace(extension, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "arquivo"}${extension.toLowerCase()}`;
}

export function objectKey({
  ownerKey,
  workId,
  galleryId,
  folder,
  filename,
}: {
  ownerKey: string;
  workId: number;
  galleryId: string;
  folder: string;
  filename: string;
}) {
  return `owners/${ownerKey}/works/${workId}-${galleryId}/${folder}/${crypto.randomUUID()}-${safeFilename(filename)}`;
}

export async function storeObject(key: string, file: File, disposition = "inline") {
  await galleryBucket().put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
      contentDisposition: `${disposition}; filename="${safeFilename(file.name)}"`,
      cacheControl: "private, no-store",
    },
    customMetadata: {
      originalName: file.name.slice(0, 240),
    },
  });
}

export async function privateObjectResponse(key: string, downloadName?: string) {
  const object = await galleryBucket().get(key);
  if (!object) return new Response("Arquivo não encontrado", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store, max-age=0");
  headers.set("x-robots-tag", "noindex, noarchive, noimageindex");
  if (downloadName) {
    headers.set("content-disposition", `attachment; filename="${safeFilename(downloadName)}"`);
  }
  return new Response(object.body, { headers });
}
