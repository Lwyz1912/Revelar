CREATE TABLE `galleries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`work_id` integer NOT NULL,
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
CREATE UNIQUE INDEX `galleries_slug_unique` ON `galleries` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `galleries_owner_work_unique` ON `galleries` (`owner_email`,`work_id`);--> statement-breakpoint
CREATE INDEX `galleries_owner_idx` ON `galleries` (`owner_email`);--> statement-breakpoint
CREATE TABLE `gallery_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`kind` text NOT NULL,
	`filename` text NOT NULL,
	`object_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gallery_assets_gallery_idx` ON `gallery_assets` (`gallery_id`);--> statement-breakpoint
CREATE TABLE `gallery_events` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`event_type` text NOT NULL,
	`photo_id` text,
	`detail` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gallery_events_gallery_idx` ON `gallery_events` (`gallery_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `gallery_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`folder` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`preview_key` text,
	`original_key` text,
	`high_key` text,
	`social_key` text,
	`selected` integer DEFAULT false NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gallery_photos_gallery_idx` ON `gallery_photos` (`gallery_id`);--> statement-breakpoint
CREATE INDEX `gallery_photos_folder_idx` ON `gallery_photos` (`gallery_id`,`folder`);--> statement-breakpoint
CREATE TABLE `gallery_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gallery_sessions_token_unique` ON `gallery_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `gallery_sessions_gallery_idx` ON `gallery_sessions` (`gallery_id`);