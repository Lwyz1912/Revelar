PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_galleries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`work_id` integer,
	`name` text DEFAULT 'Álbum sem nome' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`album_date` text,
	`work_title` text NOT NULL,
	`client_name` text NOT NULL,
	`slug` text NOT NULL,
	`pin_salt` text,
	`pin_hash` text,
	`expires_at` text,
	`phase` text DEFAULT 'selection' NOT NULL,
	`selection_limit` integer DEFAULT 0 NOT NULL,
	`extra_price_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`selection_locked` integer DEFAULT false NOT NULL,
	`revision_limit` integer DEFAULT 2 NOT NULL,
	`revision_round` integer DEFAULT 1 NOT NULL,
	`watermark_label` text DEFAULT 'Revelar.' NOT NULL,
	`watermark_key` text,
	`storage_mode` text DEFAULT 'smart' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_galleries`("id", "owner_email", "work_id", "name", "description", "album_date", "work_title", "client_name", "slug", "pin_salt", "pin_hash", "expires_at", "phase", "selection_limit", "extra_price_cents", "currency", "selection_locked", "revision_limit", "revision_round", "watermark_label", "watermark_key", "storage_mode", "created_at", "updated_at") SELECT "id", "owner_email", "work_id", "work_title", '', NULL, "work_title", "client_name", "slug", "pin_salt", "pin_hash", "expires_at", "phase", "selection_limit", "extra_price_cents", "currency", "selection_locked", "revision_limit", "revision_round", "watermark_label", "watermark_key", "storage_mode", "created_at", "updated_at" FROM `galleries`;--> statement-breakpoint
DROP TABLE `galleries`;--> statement-breakpoint
ALTER TABLE `__new_galleries` RENAME TO `galleries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `galleries_slug_unique` ON `galleries` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `galleries_owner_work_unique` ON `galleries` (`owner_email`,`work_id`);--> statement-breakpoint
CREATE INDEX `galleries_owner_idx` ON `galleries` (`owner_email`);--> statement-breakpoint
ALTER TABLE `gallery_photos` ADD `internal_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `gallery_photos` ADD `caption` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `gallery_photos` ADD `tags_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `gallery_photos` ADD `rating` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `gallery_photos` ADD `editing_photo_id` text;
