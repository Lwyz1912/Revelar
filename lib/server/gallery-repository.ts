import type { Currency, GalleryFolder, GalleryPhase, WorkGallery } from "@/types/revelar";
import { hashPin, isExpired, secureToken, sha256 } from "@/lib/server/gallery-security";
import { getRuntimeBindings } from "@/lib/server/runtime-bindings";

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
  work_id: number;
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
}: {
  ownerEmail: string;
  workId: number;
  workTitle: string;
  clientName: string;
  currency: Currency;
}) {
  const current = await galleryForOwner(ownerEmail, workId);
  if (current) return current;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const slug = secureToken(22);
  await database()
    .prepare(
      `INSERT INTO galleries (
        id, owner_email, work_id, work_title, client_name, slug, phase,
        selection_limit, extra_price_cents, currency, selection_locked,
        revision_limit, revision_round, watermark_label, storage_mode, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'selection', 0, 0, ?, 0, 2, 1, 'Revelar.', 'smart', ?, ?)`,
    )
    .bind(id, ownerEmail, workId, workTitle, clientName, slug, currency, now, now)
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
        watermark_label = ?, watermark_key = ?, storage_mode = ?, updated_at = ?
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
}) {
  const id = crypto.randomUUID();
  await database()
    .prepare(
      `INSERT INTO gallery_photos (
        id, gallery_id, folder, filename, mime_type, size, preview_key, original_key,
        high_key, social_key, selected, approved, comment, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, '', ?)`,
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
  const serializedPhotos = photos.map((photo) => ({
    id: String(photo.id),
    folder: String(photo.folder) as GalleryFolder,
    filename: String(photo.filename),
    mimeType: String(photo.mime_type),
    size: number(photo.size),
    selected: boolean(photo.selected),
    approved: boolean(photo.approved),
    comment: String(photo.comment || ""),
    hasPreview: Boolean(photo.preview_key),
    hasOriginal: Boolean(photo.original_key),
    hasHigh: Boolean(photo.high_key),
    hasSocial: Boolean(photo.social_key),
  }));
  const selected = serializedPhotos.filter((photo) => photo.selected).length;
  const edited = serializedPhotos.filter(
    (photo) => photo.folder === "edited" || photo.hasHigh || photo.hasSocial,
  ).length;
  const delivered = serializedPhotos.filter((photo) => photo.folder === "delivered").length;
  const extraCount = Math.max(0, selected - number(gallery.selection_limit));
  return {
    id: gallery.id,
    workId: number(gallery.work_id),
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
      captured: serializedPhotos.filter(
        (photo) =>
          photo.folder === "preview" || (photo.folder === "originals" && !photo.hasPreview),
      ).length,
      selected,
      edited,
      delivered,
      totalBytes:
        serializedPhotos.reduce((sum, photo) => sum + photo.size, 0) +
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
