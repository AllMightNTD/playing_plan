CREATE TABLE `pipeline_controls` (
	`key` varchar(50) NOT NULL,
	`is_enabled` boolean NOT NULL DEFAULT false,
	`reason` text,
	`updated_by` varchar(255) NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `pipeline_controls_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_sample_grades` (
	`id` varchar(21) NOT NULL,
	`item_id` varchar(100) NOT NULL,
	`item_type` enum('place','video') NOT NULL,
	`is_correct` boolean NOT NULL,
	`feedback` text,
	`graded_by` varchar(255) NOT NULL,
	`graded_at` datetime NOT NULL,
	CONSTRAINT `pipeline_sample_grades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_catalog` (
	`video_id` varchar(50) NOT NULL,
	`title` varchar(300) NOT NULL,
	`description` text,
	`channel_id` varchar(50) NOT NULL,
	`channel_title` varchar(200) NOT NULL,
	`view_count` int NOT NULL DEFAULT 0,
	`like_count` int,
	`comment_count` int,
	`published_at` datetime,
	`is_embeddable` boolean NOT NULL DEFAULT true,
	`search_category` varchar(50),
	`search_location` varchar(100),
	`search_focus` varchar(100),
	`imported_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `video_catalog_video_id` PRIMARY KEY(`video_id`)
);
--> statement-breakpoint
CREATE TABLE `video_hotspots` (
	`id` varchar(21) NOT NULL,
	`video_id` varchar(50) NOT NULL,
	`place_id` varchar(21) NOT NULL,
	`timestamp_sec` int NOT NULL,
	`label` varchar(200),
	`source` enum('chapter','admin') NOT NULL,
	`status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`created_by` varchar(255) NOT NULL,
	`verified_by` varchar(255),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `video_hotspots_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_video_hotspots_video_place_ts` UNIQUE(`video_id`,`place_id`,`timestamp_sec`)
);
--> statement-breakpoint
CREATE INDEX `idx_sample_grades_graded_at` ON `pipeline_sample_grades` (`graded_at`);--> statement-breakpoint
CREATE INDEX `idx_sample_grades_item` ON `pipeline_sample_grades` (`item_type`,`item_id`);--> statement-breakpoint
CREATE INDEX `idx_video_catalog_channel` ON `video_catalog` (`channel_id`);--> statement-breakpoint
CREATE INDEX `idx_video_catalog_published` ON `video_catalog` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_video_hotspots_video_status` ON `video_hotspots` (`video_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_video_hotspots_place` ON `video_hotspots` (`place_id`);