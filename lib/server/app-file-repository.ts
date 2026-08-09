import type { AppFileRef } from "@/types/revelar";
import { ownerKey } from "@/lib/server/gallery-repository";
import {
  galleryBucket,
  privateObjectResponse,
  safeFilename,
  storeObject,
} from "@/lib/server/gallery-storage";
import { getRuntimeBindings } from "@/lib/server/runtime-bindings";

type FileRow = {
  id: string;
  owner_email: string;
  object_key: string;
  filename: string;
  mime_type: string;
  size: number;
  scope: string;
  related_id: string | null;
  created_at: string;
};

async function ensureFilesTable() {
  const { DB } = getRuntimeBindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS app_files (
      id text PRIMARY KEY NOT NULL,
      owner_email text NOT NULL,
      object_key text NOT NULL,
      filename text NOT NULL,
      mime_type text NOT NULL,
      size integer NOT NULL,
      scope text NOT NULL,
      related_id text,
      created_at text NOT NULL
    )`),
    DB.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS app_files_object_key_unique ON app_files (object_key)",
    ),
    DB.prepare(
      "CREATE INDEX IF NOT EXISTS app_files_owner_idx ON app_files (owner_email, created_at)",
    ),
    DB.prepare(
      "CREATE INDEX IF NOT EXISTS app_files_related_idx ON app_files (owner_email, scope, related_id)",
    ),
  ]);
}

function publicRef(row: FileRow): AppFileRef {
  return {
    id: row.id,
    name: row.filename,
    type: row.mime_type,
    size: Number(row.size),
    uploadedAt: row.created_at,
    storage: "cloud",
  };
}

export async function saveAppFile({
  ownerEmail,
  file,
  scope,
  relatedId,
}: {
  ownerEmail: string;
  file: File;
  scope: string;
  relatedId?: string;
}) {
  await ensureFilesTable();
  const { DB } = getRuntimeBindings();
  const id = crypto.randomUUID();
  const keyOwner = await ownerKey(ownerEmail);
  const key = `owners/${keyOwner}/arquivos/${scope}/${id}-${safeFilename(file.name)}`;
  const createdAt = new Date().toISOString();
  await storeObject(key, file, "inline");
  try {
    await DB.prepare(
      `INSERT INTO app_files (
        id, owner_email, object_key, filename, mime_type, size, scope, related_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        ownerEmail,
        key,
        file.name.slice(0, 240),
        file.type || "application/octet-stream",
        file.size,
        scope,
        relatedId || null,
        createdAt,
      )
      .run();
  } catch (error) {
    await galleryBucket().delete(key);
    throw error;
  }
  return publicRef({
    id,
    owner_email: ownerEmail,
    object_key: key,
    filename: file.name.slice(0, 240),
    mime_type: file.type || "application/octet-stream",
    size: file.size,
    scope,
    related_id: relatedId || null,
    created_at: createdAt,
  });
}

export async function appFileForOwner(ownerEmail: string, id: string) {
  await ensureFilesTable();
  const { DB } = getRuntimeBindings();
  return (
    (await DB.prepare("SELECT * FROM app_files WHERE id = ? AND owner_email = ? LIMIT 1")
      .bind(id, ownerEmail)
      .first<FileRow>()) || null
  );
}

export async function appFileResponse(ownerEmail: string, id: string, download = false) {
  const row = await appFileForOwner(ownerEmail, id);
  if (!row) return new Response("Arquivo não encontrado", { status: 404 });
  return privateObjectResponse(row.object_key, download ? row.filename : undefined);
}

export async function removeAppFile(ownerEmail: string, id: string) {
  const row = await appFileForOwner(ownerEmail, id);
  if (!row) return false;
  const { DB } = getRuntimeBindings();
  await galleryBucket().delete(row.object_key);
  await DB.prepare("DELETE FROM app_files WHERE id = ? AND owner_email = ?")
    .bind(id, ownerEmail)
    .run();
  return true;
}
