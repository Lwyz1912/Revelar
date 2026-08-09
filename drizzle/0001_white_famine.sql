CREATE TABLE `editing_albums` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `editing_albums_owner_idx` ON `editing_albums` (`owner_email`,`updated_at`);--> statement-breakpoint
CREATE TABLE `editing_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`album_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer DEFAULT 0 NOT NULL,
	`height` integer DEFAULT 0 NOT NULL,
	`original_key` text NOT NULL,
	`preview_key` text NOT NULL,
	`edited_key` text,
	`preset_id` text,
	`adjustments_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`album_id`) REFERENCES `editing_albums`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `editing_photos_album_idx` ON `editing_photos` (`album_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `editing_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`name` text NOT NULL,
	`camera` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'custom' NOT NULL,
	`adjustments_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `editing_presets_owner_idx` ON `editing_presets` (`owner_email`,`updated_at`);