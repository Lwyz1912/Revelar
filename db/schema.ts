import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const galleries = sqliteTable(
  "galleries",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    workId: integer("work_id").notNull(),
    workTitle: text("work_title").notNull(),
    clientName: text("client_name").notNull(),
    slug: text("slug").notNull(),
    pinSalt: text("pin_salt"),
    pinHash: text("pin_hash"),
    expiresAt: text("expires_at"),
    phase: text("phase").notNull().default("selection"),
    selectionLimit: integer("selection_limit").notNull().default(0),
    extraPriceCents: integer("extra_price_cents").notNull().default(0),
    currency: text("currency").notNull().default("BRL"),
    selectionLocked: integer("selection_locked", { mode: "boolean" }).notNull().default(false),
    revisionLimit: integer("revision_limit").notNull().default(2),
    revisionRound: integer("revision_round").notNull().default(1),
    watermarkLabel: text("watermark_label").notNull().default("Revelar."),
    watermarkKey: text("watermark_key"),
    storageMode: text("storage_mode").notNull().default("smart"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("galleries_slug_unique").on(table.slug),
    uniqueIndex("galleries_owner_work_unique").on(table.ownerEmail, table.workId),
    index("galleries_owner_idx").on(table.ownerEmail),
  ],
);

export const galleryPhotos = sqliteTable(
  "gallery_photos",
  {
    id: text("id").primaryKey(),
    galleryId: text("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    folder: text("folder").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    previewKey: text("preview_key"),
    originalKey: text("original_key"),
    highKey: text("high_key"),
    socialKey: text("social_key"),
    selected: integer("selected", { mode: "boolean" }).notNull().default(false),
    approved: integer("approved", { mode: "boolean" }).notNull().default(false),
    comment: text("comment").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("gallery_photos_gallery_idx").on(table.galleryId),
    index("gallery_photos_folder_idx").on(table.galleryId, table.folder),
  ],
);

export const galleryAssets = sqliteTable(
  "gallery_assets",
  {
    id: text("id").primaryKey(),
    galleryId: text("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    filename: text("filename").notNull(),
    objectKey: text("object_key").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("gallery_assets_gallery_idx").on(table.galleryId)],
);

export const gallerySessions = sqliteTable(
  "gallery_sessions",
  {
    id: text("id").primaryKey(),
    galleryId: text("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("gallery_sessions_token_unique").on(table.tokenHash),
    index("gallery_sessions_gallery_idx").on(table.galleryId),
  ],
);

export const galleryEvents = sqliteTable(
  "gallery_events",
  {
    id: text("id").primaryKey(),
    galleryId: text("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    photoId: text("photo_id"),
    detail: text("detail").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("gallery_events_gallery_idx").on(table.galleryId, table.createdAt)],
);
