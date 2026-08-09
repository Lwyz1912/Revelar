CREATE TABLE `app_files` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`scope` text NOT NULL,
	`related_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_files_object_key_unique` ON `app_files` (`object_key`);--> statement-breakpoint
CREATE INDEX `app_files_owner_idx` ON `app_files` (`owner_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `app_files_related_idx` ON `app_files` (`owner_email`,`scope`,`related_id`);--> statement-breakpoint
CREATE TABLE `professional_settings` (
	`owner_email` text PRIMARY KEY NOT NULL,
	`data_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `professional_settings_updated_idx` ON `professional_settings` (`updated_at`);