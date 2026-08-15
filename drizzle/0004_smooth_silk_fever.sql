CREATE TABLE `gallery_photo_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`photo_id` text NOT NULL,
	`author_role` text NOT NULL,
	`author_name` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`photo_id`) REFERENCES `gallery_photos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gallery_photo_comments_photo_idx` ON `gallery_photo_comments` (`photo_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `gallery_photo_comments_gallery_idx` ON `gallery_photo_comments` (`gallery_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `gallery_photos` ADD `deleted_at` text;