import { normalizeAdjustments } from "@/lib/editing";
import { getRuntimeBindings } from "@/lib/server/runtime-bindings";
import type { EditingAdjustments, EditingPreset } from "@/types/revelar";

type DbValue = string | number | null;
type Row = Record<string, DbValue>;

function database() {
  return getRuntimeBindings().DB;
}

async function first<T extends Row>(sql: string, ...values: unknown[]) {
  return (
    (await database()
      .prepare(sql)
      .bind(...values)
      .first<T>()) || null
  );
}

async function all<T extends Row>(sql: string, ...values: unknown[]) {
  return (
    await database()
      .prepare(sql)
      .bind(...values)
      .all<T>()
  ).results;
}

function safeJson(value: string | null): EditingAdjustments {
  try {
    return normalizeAdjustments(JSON.parse(value || "{}"));
  } catch {
    return normalizeAdjustments();
  }
}

type AlbumRow = Row & {
  id: string;
  owner_email: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type PhotoRow = Row & {
  id: string;
  album_id: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  original_key: string;
  preview_key: string;
  edited_key: string | null;
  preset_id: string | null;
  adjustments_json: string;
  created_at: string;
  updated_at: string;
};

type PresetRow = Row & {
  id: string;
  owner_email: string;
  name: string;
  camera: string;
  description: string;
  source: "xmp" | "dng" | "custom";
  adjustments_json: string;
  created_at: string;
  updated_at: string;
};

export async function editingLibrary(ownerEmail: string) {
  const albums = await all<AlbumRow>(
    "SELECT * FROM editing_albums WHERE owner_email = ? ORDER BY updated_at DESC",
    ownerEmail,
  );
  const photos = await all<PhotoRow>(
    `SELECT p.* FROM editing_photos p
     INNER JOIN editing_albums a ON a.id = p.album_id
     WHERE a.owner_email = ? ORDER BY p.updated_at DESC`,
    ownerEmail,
  );
  const presets = await all<PresetRow>(
    "SELECT * FROM editing_presets WHERE owner_email = ? ORDER BY updated_at DESC",
    ownerEmail,
  );
  return {
    albums: albums.map((album) => ({
      id: album.id,
      name: album.name,
      createdAt: album.created_at,
      updatedAt: album.updated_at,
    })),
    photos: photos.map((photo) => ({
      id: photo.id,
      albumId: photo.album_id,
      filename: photo.filename,
      mimeType: photo.mime_type,
      size: Number(photo.size),
      width: Number(photo.width),
      height: Number(photo.height),
      previewUrl: `/api/editing/photos/${photo.id}/asset?variant=preview`,
      originalUrl: `/api/editing/photos/${photo.id}/asset?variant=original`,
      editedUrl: photo.edited_key
        ? `/api/editing/photos/${photo.id}/asset?variant=edited`
        : undefined,
      presetId: photo.preset_id || undefined,
      adjustments: safeJson(photo.adjustments_json),
      createdAt: photo.created_at,
      updatedAt: photo.updated_at,
    })),
    presets: presets.map((preset) => serializePreset(preset)),
  };
}

export async function editingAlbum(id: string) {
  return first<AlbumRow>("SELECT * FROM editing_albums WHERE id = ? LIMIT 1", id);
}

export async function editingPhoto(id: string) {
  return first<PhotoRow>(
    `SELECT p.* FROM editing_photos p
     INNER JOIN editing_albums a ON a.id = p.album_id
     WHERE p.id = ? LIMIT 1`,
    id,
  );
}

export async function createEditingAlbum(ownerEmail: string, name: string) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await database()
    .prepare(
      "INSERT INTO editing_albums (id, owner_email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(id, ownerEmail, name.trim().slice(0, 90), now, now)
    .run();
  return { id, name: name.trim().slice(0, 90), createdAt: now, updatedAt: now };
}

export async function addEditingPhoto(input: {
  albumId: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  originalKey: string;
  previewKey: string;
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await database()
    .prepare(
      `INSERT INTO editing_photos (
        id, album_id, filename, mime_type, size, width, height, original_key, preview_key,
        adjustments_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)`,
    )
    .bind(
      id,
      input.albumId,
      input.filename.slice(0, 240),
      input.mimeType,
      input.size,
      input.width,
      input.height,
      input.originalKey,
      input.previewKey,
      now,
      now,
    )
    .run();
  await database()
    .prepare("UPDATE editing_albums SET updated_at = ? WHERE id = ?")
    .bind(now, input.albumId)
    .run();
  return id;
}

export async function saveEditingRecipe(
  photoId: string,
  presetId: string | null,
  adjustments: EditingAdjustments,
) {
  await database()
    .prepare(
      "UPDATE editing_photos SET preset_id = ?, adjustments_json = ?, updated_at = ? WHERE id = ?",
    )
    .bind(
      presetId,
      JSON.stringify(normalizeAdjustments(adjustments)),
      new Date().toISOString(),
      photoId,
    )
    .run();
}

export async function saveEditedKey(photoId: string, key: string) {
  await database()
    .prepare("UPDATE editing_photos SET edited_key = ?, updated_at = ? WHERE id = ?")
    .bind(key, new Date().toISOString(), photoId)
    .run();
}

function serializePreset(row: PresetRow): EditingPreset {
  return {
    id: row.id,
    name: row.name,
    camera: row.camera,
    description: row.description,
    source: row.source,
    adjustments: safeJson(row.adjustments_json),
    builtIn: false,
  };
}

export async function savePrivatePreset(ownerEmail: string, preset: EditingPreset) {
  const now = new Date().toISOString();
  const id = preset.id.startsWith("imported-") ? preset.id : crypto.randomUUID();
  const values = [
    id,
    ownerEmail,
    preset.name.trim().slice(0, 80),
    preset.camera.trim().slice(0, 80),
    preset.description.trim().slice(0, 240),
    preset.source || "custom",
    JSON.stringify(normalizeAdjustments(preset.adjustments)),
    now,
    now,
  ];
  await database()
    .prepare(
      `INSERT INTO editing_presets (
        id, owner_email, name, camera, description, source, adjustments_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(...values)
    .run();
  return {
    ...preset,
    id,
    name: String(values[2]),
    camera: String(values[3]),
    description: String(values[4]),
    adjustments: normalizeAdjustments(preset.adjustments),
    builtIn: false,
  };
}

export function photoBelongsToOwner(photo: PhotoRow, ownerEmail: string) {
  return editingAlbum(photo.album_id).then((album) => album?.owner_email === ownerEmail);
}
