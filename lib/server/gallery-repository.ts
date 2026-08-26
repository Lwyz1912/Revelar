import type { Currency, GalleryFolder, GalleryPhase, WorkGallery } from "@/types/revelar";
import { hashPin, isExpired, secureToken, sha256 } from "@/lib/server/gallery-security";
import { getRuntimeBindings } from "@/lib/server/runtime-bindings";
import { galleryBucket } from "@/lib/server/gallery-storage";

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

function boolean(value: DbValue) {
  return value === 1 || value === "1";
}

function number(value: DbValue) {
  return Number(value || 0);
}

export type GalleryRow = Row & {
  id: string;
  owner_email: string;
  work_id: number | null;
  name: string;
  description: string;
  album_date: string | null;
  work_title: string;
  client_name: string;
  slug: string;
  pin_salt: string | null;
  pin_hash: string | null;
  expires_at: string | null;
  phase: GalleryPhase;
  selection_limit: number;
  extra_price_cents: number;
  currency: Currency;
  selection_locked: number;
  revision_limit: number;
  revision_round: number;
  watermark_label: string;
  watermark_key: string | null;
  storage_mode: "smart" | "backup";
  created_at: string;
  updated_at: string;
};

export async function galleryForOwner(ownerEmail: string, workId: number) {
  return first<GalleryRow>(
    "SELECT * FROM galleries WHERE owner_email = ? AND work_id = ? LIMIT 1",
    ownerEmail,
    workId,
  );
}

export async function galleriesForOwner(ownerEmail: string) {
  return all<GalleryRow>(
    "SELECT * FROM galleries WHERE owner_email = ? ORDER BY updated_at DESC",
    ownerEmail,
  );
}

export async function galleryById(id: string) {
  return first<GalleryRow>("SELECT * FROM galleries WHERE id = ? LIMIT 1", id);
}

export async function galleryBySlug(slug: string) {
  return first<GalleryRow>("SELECT * FROM galleries WHERE slug = ? LIMIT 1", slug);
}

export async function createGallery({
  ownerEmail,
  workId,
  workTitle,
  clientName,
  currency,
  name,
  description = "",
  albumDate,
}: {
  ownerEmail: string;
  workId?: number;
  workTitle: string;
  clientName: string;
  currency: Currency;
  name?: string;
  description?: string;
  albumDate?: string;
}) {
  const current = workId === undefined ? null : await galleryForOwner(ownerEmail, workId);
  if (current) return current;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const slug = secureToken(22);
  await database()
    .prepare(
      `INSERT INTO galleries (
        id, owner_email, work_id, name, description, album_date, work_title, client_name, slug, phase,
        selection_limit, extra_price_cents, currency, selection_locked,
        revision_limit, revision_round, watermark_label, storage_mode, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'selection', 0, 0, ?, 0, 2, 1, 'Revelar.', 'smart', ?, ?)`,
    )
    .bind(
      id,
      ownerEmail,
      workId ?? null,
      (name || workTitle).trim().slice(0, 120),
      description.trim().slice(0, 600),
      albumDate || null,
      workTitle,
      clientName,
      slug,
      currency,
      now,
      now,
    )
    .run();
  await recordGalleryEvent(id, "gallery_created", "Galeria privada criada");
  return (await galleryById(id))!;
}

export async function updateGallerySettings(
  gallery: GalleryRow,
  input: {
    phase?: GalleryPhase;
    selectionLimit?: number;
    extraPriceCents?: number;
    currency?: Currency;
    expiresAt?: string | null;
    pin?: string | null;
    revisionLimit?: number;
    revisionRound?: number;
    selectionLocked?: boolean;
    watermarkLabel?: string;
    watermarkKey?: string | null;
    storageMode?: "smart" | "backup";
    name?: string;
    description?: string;
    albumDate?: string | null;
  },
) {
  let pinSalt = gallery.pin_salt;
  let pinHash = gallery.pin_hash;
  if (input.pin !== undefined) {
    if (input.pin) {
      const hashed = await hashPin(input.pin);
      pinSalt = hashed.salt;
      pinHash = hashed.hash;
    } else {
      pinSalt = null;
      pinHash = null;
    }
  }
  const values = {
    phase: input.phase ?? gallery.phase,
    selectionLimit: Math.max(0, input.selectionLimit ?? number(gallery.selection_limit)),
    extraPriceCents: Math.max(0, input.extraPriceCents ?? number(gallery.extra_price_cents)),
    currency: input.currency ?? gallery.currency,
    expiresAt: input.expiresAt === undefined ? gallery.expires_at : input.expiresAt || null,
    revisionLimit: Math.max(0, input.revisionLimit ?? number(gallery.revision_limit)),
    revisionRound: Math.max(1, input.revisionRound ?? number(gallery.revision_round)),
    selectionLocked:
      input.selectionLocked === undefined
        ? boolean(gallery.selection_locked)
        : input.selectionLocked,
    watermarkLabel: (input.watermarkLabel ?? gallery.watermark_label).trim() || "Revelar.",
    watermarkKey:
      input.watermarkKey === undefined ? gallery.watermark_key : input.watermarkKey || null,
    storageMode: input.storageMode ?? gallery.storage_mode,
  };
  await database()
    .prepare(
      `UPDATE galleries SET
        phase = ?, selection_limit = ?, extra_price_cents = ?, currency = ?, expires_at = ?,
        pin_salt = ?, pin_hash = ?, revision_limit = ?, revision_round = ?, selection_locked = ?,
        watermark_label = ?, watermark_key = ?, storage_mode = ?, name = ?, description = ?, album_date = ?, updated_at = ?
      WHERE id = ?`,
    )
    .bind(
      values.phase,
      values.selectionLimit,
      values.extraPriceCents,
      values.currency,
      values.expiresAt,
      pinSalt,
      pinHash,
      values.revisionLimit,
      values.revisionRound,
      values.selectionLocked ? 1 : 0,
      values.watermarkLabel,
      values.watermarkKey,
      values.storageMode,
      input.name?.trim().slice(0, 120) || gallery.name,
      input.description === undefined
        ? gallery.description
        : input.description.trim().slice(0, 600),
      input.albumDate === undefined ? gallery.album_date : input.albumDate || null,
      new Date().toISOString(),
      gallery.id,
    )
    .run();
  return (await galleryById(gallery.id))!;
}

export async function addGalleryPhoto(input: {
  galleryId: string;
  folder: GalleryFolder;
  filename: string;
  mimeType: string;
  size: number;
  previewKey?: string | null;
  originalKey?: string | null;
  highKey?: string | null;
  socialKey?: string | null;
  editingPhotoId?: string | null;
}) {
  const id = crypto.randomUUID();
  await database()
    .prepare(
      `INSERT INTO gallery_photos (
        id, gallery_id, folder, filename, mime_type, size, preview_key, original_key,
        high_key, social_key, editing_photo_id, selected, approved, comment, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, '', ?)`,
    )
    .bind(
      id,
      input.galleryId,
      input.folder,
      input.filename,
      input.mimeType,
      input.size,
      input.previewKey || null,
      input.originalKey || null,
      input.highKey || null,
      input.socialKey || null,
      input.editingPhotoId || null,
      new Date().toISOString(),
    )
    .run();
  return id;
}

export async function attachGalleryPhotoVariant(input: {
  galleryId: string;
  folder: GalleryFolder;
  filename: string;
  variant: "high" | "social";
  objectKey: string;
  size: number;
}) {
  const photo = await first<Row & { id: string; size: number }>(
    `SELECT id, size FROM gallery_photos
     WHERE gallery_id = ? AND folder = ? AND lower(filename) = lower(?)
     ORDER BY created_at DESC LIMIT 1`,
    input.galleryId,
    input.folder,
    input.filename,
  );
  if (!photo) return null;
  const column = input.variant === "social" ? "social_key" : "high_key";
  await database()
    .prepare(`UPDATE gallery_photos SET ${column} = ?, size = ? WHERE id = ?`)
    .bind(input.objectKey, number(photo.size) + input.size, photo.id)
    .run();
  return photo.id;
}

export async function addGalleryAsset(input: {
  galleryId: string;
  kind: "high_zip" | "social_zip" | "watermark";
  filename: string;
  objectKey: string;
  mimeType: string;
  size: number;
}) {
  const id = crypto.randomUUID();
  await database()
    .prepare(
      `INSERT INTO gallery_assets (id, gallery_id, kind, filename, object_key, mime_type, size, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.galleryId,
      input.kind,
      input.filename,
      input.objectKey,
      input.mimeType,
      input.size,
      new Date().toISOString(),
    )
    .run();
  return id;
}

export async function galleryPhoto(id: string) {
  return first<Row & { id: string; gallery_id: string }>(
    "SELECT * FROM gallery_photos WHERE id = ? LIMIT 1",
    id,
  );
}

export async function updateGalleryPhotoMetadata(
  galleryId: string,
  photoId: string,
  input: { internalNote?: string; caption?: string; tags?: string[]; rating?: number },
) {
  const photo = await galleryPhoto(photoId);
  if (!photo || photo.gallery_id !== galleryId) return false;
  let tags: string[] = [];
  try {
    tags = JSON.parse(String(photo.tags_json || "[]"));
  } catch {}
  const nextTags = (input.tags ?? tags)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
  await database()
    .prepare(
      `UPDATE gallery_photos SET internal_note = ?, caption = ?, tags_json = ?, rating = ?
       WHERE id = ? AND gallery_id = ?`,
    )
    .bind(
      input.internalNote === undefined
        ? String(photo.internal_note || "")
        : input.internalNote.trim().slice(0, 1500),
      input.caption === undefined
        ? String(photo.caption || "")
        : input.caption.trim().slice(0, 300),
      JSON.stringify(nextTags),
      Math.max(0, Math.min(5, Math.round(input.rating ?? number(photo.rating)))),
      photoId,
      galleryId,
    )
    .run();
  return true;
}

export async function linkGalleryPhotoToEditor(
  galleryId: string,
  photoId: string,
  editingPhotoId: string,
) {
  await database()
    .prepare("UPDATE gallery_photos SET editing_photo_id = ? WHERE id = ? AND gallery_id = ?")
    .bind(editingPhotoId, photoId, galleryId)
    .run();
}

export async function galleryPhotoForEditing(ownerEmail: string, editingPhotoId: string) {
  return first<
    Row & {
      id: string;
      gallery_id: string;
      work_id: number | null;
      work_title: string;
      filename: string;
    }
  >(
    `SELECT p.*, g.work_id, g.work_title
     FROM gallery_photos p
     INNER JOIN galleries g ON g.id = p.gallery_id
     WHERE p.editing_photo_id = ? AND g.owner_email = ? AND p.folder <> 'edited'
     ORDER BY p.created_at DESC LIMIT 1`,
    editingPhotoId,
    ownerEmail,
  );
}

export async function publishEditedGalleryPhoto(input: {
  galleryId: string;
  editingPhotoId: string;
  filename: string;
  mimeType: string;
  size: number;
  objectKey: string;
}) {
  const existing = await first<Row & { id: string }>(
    "SELECT id FROM gallery_photos WHERE gallery_id = ? AND folder = 'edited' AND editing_photo_id = ? LIMIT 1",
    input.galleryId,
    input.editingPhotoId,
  );
  if (existing) {
    await database()
      .prepare(
        "UPDATE gallery_photos SET preview_key = ?, high_key = ?, size = ?, mime_type = ?, deleted_at = NULL WHERE id = ?",
      )
      .bind(input.objectKey, input.objectKey, input.size, input.mimeType, existing.id)
      .run();
    return existing.id;
  }
  return addGalleryPhoto({
    galleryId: input.galleryId,
    folder: "edited",
    filename: input.filename,
    mimeType: input.mimeType,
    size: input.size,
    previewKey: input.objectKey,
    highKey: input.objectKey,
    editingPhotoId: input.editingPhotoId,
  });
}

export async function galleryAsset(id: string) {
  return first<Row & { id: string; gallery_id: string }>(
    "SELECT * FROM gallery_assets WHERE id = ? LIMIT 1",
    id,
  );
}

export async function setPhotoSelection(
  galleryId: string,
  photoId: string,
  selected: boolean,
  comment?: string,
) {
  await database()
    .prepare(
      "UPDATE gallery_photos SET selected = ?, comment = COALESCE(?, comment) WHERE id = ? AND gallery_id = ?",
    )
    .bind(selected ? 1 : 0, comment === undefined ? null : comment.trim(), photoId, galleryId)
    .run();
}

export async function setPhotoApproval(
  galleryId: string,
  photoId: string,
  approved: boolean,
  comment?: string,
) {
  await database()
    .prepare(
      "UPDATE gallery_photos SET approved = ?, comment = COALESCE(?, comment) WHERE id = ? AND gallery_id = ?",
    )
    .bind(approved ? 1 : 0, comment === undefined ? null : comment.trim(), photoId, galleryId)
    .run();
}

export async function addGalleryPhotoComment(input: {
  galleryId: string;
  photoId: string;
  authorRole: "client" | "photographer";
  authorName: string;
  message: string;
}) {
  const message = input.message.trim().slice(0, 1500);
  if (!message) return;
  const now = new Date().toISOString();
  const [photo, structuredComment] = await Promise.all([
    first<Row & { comment: string; created_at: string; client_name: string }>(
      `SELECT p.comment, p.created_at, g.client_name
       FROM gallery_photos p
       JOIN galleries g ON g.id = p.gallery_id
       WHERE p.id = ? AND p.gallery_id = ? LIMIT 1`,
      input.photoId,
      input.galleryId,
    ),
    first<Row & { id: string }>(
      "SELECT id FROM gallery_photo_comments WHERE gallery_id = ? AND photo_id = ? LIMIT 1",
      input.galleryId,
      input.photoId,
    ),
  ]);
  const legacyMessages =
    !structuredComment && photo?.comment
      ? String(photo.comment)
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const shouldReuseIncomingClientMessage =
    input.authorRole === "client" && legacyMessages.length === 1 && legacyMessages[0] === message;
  const legacyStatements = shouldReuseIncomingClientMessage
    ? []
    : legacyMessages.map((legacyMessage, index) => {
        const baseTime = new Date(photo?.created_at || now).getTime();
        const createdAt = new Date(baseTime + index).toISOString();
        return database()
          .prepare(
            `INSERT OR IGNORE INTO gallery_photo_comments
              (id, gallery_id, photo_id, author_role, author_name, message, created_at)
             VALUES (?, ?, ?, 'client', ?, ?, ?)`,
          )
          .bind(
            `legacy:${input.photoId}:${index}`,
            input.galleryId,
            input.photoId,
            String(photo?.client_name || "Cliente").slice(0, 120),
            legacyMessage.slice(0, 1500),
            createdAt,
          );
      });
  await database().batch([
    ...legacyStatements,
    database()
      .prepare(
        `INSERT INTO gallery_photo_comments
          (id, gallery_id, photo_id, author_role, author_name, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.galleryId,
        input.photoId,
        input.authorRole,
        input.authorName.trim().slice(0, 120) ||
          (input.authorRole === "photographer" ? "Fotógrafa" : "Cliente"),
        message,
        now,
      ),
  ]);
}

export async function galleryPhotoComments(galleryId: string, photoId: string) {
  const comments = await all<Row>(
    `SELECT id, author_role, author_name, message, created_at
     FROM gallery_photo_comments WHERE gallery_id = ? AND photo_id = ? ORDER BY created_at ASC`,
    galleryId,
    photoId,
  );
  return comments.map((comment) => ({
    id: String(comment.id),
    authorRole: String(comment.author_role) as "client" | "photographer",
    authorName: String(comment.author_name),
    message: String(comment.message),
    createdAt: String(comment.created_at),
  }));
}

export async function trashGalleryPhotos(galleryId: string, photoIds: string[]) {
  const ids = [...new Set(photoIds)].slice(0, 200);
  if (!ids.length) return;
  const now = new Date().toISOString();
  await database().batch(
    ids.map((photoId) =>
      database()
        .prepare(
          "UPDATE gallery_photos SET deleted_at = ?, selected = 0, approved = 0 WHERE id = ? AND gallery_id = ?",
        )
        .bind(now, photoId, galleryId),
    ),
  );
}

export async function restoreGalleryPhotos(galleryId: string, photoIds: string[]) {
  const ids = [...new Set(photoIds)].slice(0, 200);
  if (!ids.length) return;
  await database().batch(
    ids.map((photoId) =>
      database()
        .prepare("UPDATE gallery_photos SET deleted_at = NULL WHERE id = ? AND gallery_id = ?")
        .bind(photoId, galleryId),
    ),
  );
}

export async function purgeExpiredGalleryPhotos(galleryId: string) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const expired = await all<Row>(
    `SELECT id, preview_key, original_key, high_key, social_key
     FROM gallery_photos
     WHERE gallery_id = ? AND deleted_at IS NOT NULL AND deleted_at <= ?`,
    galleryId,
    cutoff,
  );
  if (!expired.length) return;
  const keys = [
    ...new Set(
      expired.flatMap((photo) =>
        [photo.preview_key, photo.original_key, photo.high_key, photo.social_key]
          .filter(Boolean)
          .map(String),
      ),
    ),
  ];
  await Promise.all(keys.map((key) => galleryBucket().delete(key)));
  await database().batch(
    expired.map((photo) =>
      database()
        .prepare("DELETE FROM gallery_photos WHERE id = ? AND gallery_id = ?")
        .bind(String(photo.id), galleryId),
    ),
  );
}

export async function recordGalleryEvent(
  galleryId: string,
  eventType: string,
  detail: string,
  photoId?: string,
) {
  await database()
    .prepare(
      "INSERT INTO gallery_events (id, gallery_id, event_type, photo_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      crypto.randomUUID(),
      galleryId,
      eventType,
      photoId || null,
      detail.slice(0, 500),
      new Date().toISOString(),
    )
    .run();
}

export async function createGallerySession(galleryId: string, validUntil: string) {
  const token = secureToken(32);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(
    Math.min(new Date(validUntil).getTime(), Date.now() + 1000 * 60 * 60 * 24),
  ).toISOString();
  await database()
    .prepare(
      "INSERT INTO gallery_sessions (id, gallery_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(crypto.randomUUID(), galleryId, tokenHash, expiresAt, new Date().toISOString())
    .run();
  return { token, expiresAt };
}

export async function validGallerySession(galleryId: string, token?: string | null) {
  if (!token) return false;
  const tokenHash = await sha256(token);
  const row = await first<Row & { expires_at: string }>(
    "SELECT expires_at FROM gallery_sessions WHERE gallery_id = ? AND token_hash = ? LIMIT 1",
    galleryId,
    tokenHash,
  );
  return Boolean(row && !isExpired(row.expires_at));
}

export async function serializeGallery(gallery: GalleryRow): Promise<WorkGallery> {
  await purgeExpiredGalleryPhotos(gallery.id);
  const photos = await all<Row>(
    "SELECT * FROM gallery_photos WHERE gallery_id = ? ORDER BY created_at DESC",
    gallery.id,
  );
  const assets = await all<Row>(
    "SELECT * FROM gallery_assets WHERE gallery_id = ? ORDER BY created_at DESC",
    gallery.id,
  );
  const events = await all<Row>(
    "SELECT id, event_type, detail, created_at FROM gallery_events WHERE gallery_id = ? ORDER BY created_at DESC LIMIT 40",
    gallery.id,
  );
  const comments = await all<Row>(
    `SELECT id, photo_id, author_role, author_name, message, created_at
     FROM gallery_photo_comments WHERE gallery_id = ? ORDER BY created_at ASC`,
    gallery.id,
  );
  const commentsByPhoto = new Map<string, typeof comments>();
  comments.forEach((comment) => {
    const photoId = String(comment.photo_id);
    commentsByPhoto.set(photoId, [...(commentsByPhoto.get(photoId) || []), comment]);
  });
  const serializedPhotos = photos.map((photo) => ({
    id: String(photo.id),
    folder: String(photo.folder) as GalleryFolder,
    filename: String(photo.filename),
    mimeType: String(photo.mime_type),
    size: number(photo.size),
    selected: boolean(photo.selected),
    approved: boolean(photo.approved),
    comment: String(photo.comment || ""),
    internalNote: String(photo.internal_note || ""),
    caption: String(photo.caption || ""),
    tags: (() => {
      try {
        return JSON.parse(String(photo.tags_json || "[]")) as string[];
      } catch {
        return [];
      }
    })(),
    rating: Math.max(0, Math.min(5, number(photo.rating))),
    editingPhotoId: photo.editing_photo_id ? String(photo.editing_photo_id) : undefined,
    comments: (commentsByPhoto.get(String(photo.id)) || []).map((comment) => ({
      id: String(comment.id),
      authorRole: String(comment.author_role) as "client" | "photographer",
      authorName: String(comment.author_name),
      message: String(comment.message),
      createdAt: String(comment.created_at),
    })),
    deletedAt: photo.deleted_at ? String(photo.deleted_at) : undefined,
    hasPreview: Boolean(photo.preview_key),
    hasOriginal: Boolean(photo.original_key),
    hasHigh: Boolean(photo.high_key),
    hasSocial: Boolean(photo.social_key),
  }));
  const activePhotos = serializedPhotos.filter((photo) => !photo.deletedAt);
  const selected = activePhotos.filter((photo) => photo.selected).length;
  const edited = activePhotos.filter(
    (photo) => photo.folder === "edited" || photo.hasHigh || photo.hasSocial,
  ).length;
  const delivered = activePhotos.filter((photo) => photo.folder === "delivered").length;
  const extraCount = Math.max(0, selected - number(gallery.selection_limit));
  return {
    id: gallery.id,
    workId: gallery.work_id === null ? undefined : number(gallery.work_id),
    name: gallery.name || gallery.work_title,
    description: gallery.description || "",
    albumDate: gallery.album_date || undefined,
    workTitle: gallery.work_title,
    clientName: gallery.client_name,
    slug: gallery.slug,
    url: `/galeria/${gallery.slug}`,
    hasPin: Boolean(gallery.pin_hash),
    expiresAt: gallery.expires_at || undefined,
    phase: gallery.phase,
    selectionLimit: number(gallery.selection_limit),
    extraPriceCents: number(gallery.extra_price_cents),
    currency: gallery.currency,
    selectionLocked: boolean(gallery.selection_locked),
    revisionLimit: number(gallery.revision_limit),
    revisionRound: number(gallery.revision_round),
    watermarkLabel: gallery.watermark_label,
    storageMode: gallery.storage_mode,
    photos: serializedPhotos,
    assets: assets.map((asset) => ({
      id: String(asset.id),
      kind: String(asset.kind) as "high_zip" | "social_zip" | "watermark",
      filename: String(asset.filename),
      size: number(asset.size),
    })),
    events: events.map((event) => ({
      id: String(event.id),
      eventType: String(event.event_type),
      detail: String(event.detail),
      createdAt: String(event.created_at),
    })),
    stats: {
      captured: activePhotos.filter(
        (photo) =>
          photo.folder === "preview" || (photo.folder === "originals" && !photo.hasPreview),
      ).length,
      selected,
      edited,
      delivered,
      totalBytes:
        activePhotos.reduce((sum, photo) => sum + photo.size, 0) +
        assets.reduce((sum, asset) => sum + number(asset.size), 0),
      extraCount,
      extraAmount: (extraCount * number(gallery.extra_price_cents)) / 100,
    },
  };
}

export async function ownerKey(ownerEmail: string) {
  return (await sha256(ownerEmail.trim().toLowerCase())).slice(0, 20);
}

export function galleryValidUntil(gallery: GalleryRow) {
  return gallery.expires_at || new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
}
