CREATE TABLE `app_state` (
	`owner_email` text PRIMARY KEY NOT NULL,
	`data_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `app_state_updated_idx` ON `app_state` (`updated_at`);