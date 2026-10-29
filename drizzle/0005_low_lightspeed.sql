CREATE TABLE `audit_rate_limits` (
	`id` varchar(64) NOT NULL,
	`attempt_count` int NOT NULL DEFAULT 1,
	`first_attempt_at` datetime NOT NULL,
	`blocked_until` datetime,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `audit_rate_limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `rooms` ADD `room_type` enum('couple','group') DEFAULT 'couple' NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `max_members` tinyint DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `storage_quota_bytes` int DEFAULT 26214400 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `storage_used_bytes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `photo_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `max_photos` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `consent_version` varchar(20);--> statement-breakpoint
ALTER TABLE `rooms` ADD `consent_at` datetime;--> statement-breakpoint
ALTER TABLE `rooms` ADD `pending_deleted_at` datetime;--> statement-breakpoint
ALTER TABLE `date_plans` ADD `share_token` varchar(64);--> statement-breakpoint
ALTER TABLE `date_plans` ADD `share_expires_at` datetime;--> statement-breakpoint
ALTER TABLE `date_plans` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `plan_stops` ADD `room_id` varchar(21) NOT NULL;--> statement-breakpoint
ALTER TABLE `plan_stops` ADD `day_offset` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `plan_stops` ADD `start_minute` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `plan_stops` ADD `travel_minutes` int DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE `plan_stops` ADD `is_pinned_time` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `is_seen` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `memories` ADD `dominant_color` varchar(7);--> statement-breakpoint
ALTER TABLE `memories` ADD `timeline_config` json;--> statement-breakpoint
ALTER TABLE `memories` ADD `music_track_id` varchar(50);--> statement-breakpoint
ALTER TABLE `memory_photos` ADD `room_id` varchar(21) NOT NULL;--> statement-breakpoint
ALTER TABLE `memory_photos` ADD `upload_id` varchar(32);--> statement-breakpoint
ALTER TABLE `date_plans` ADD CONSTRAINT `date_plans_share_token_unique` UNIQUE(`share_token`);--> statement-breakpoint
CREATE INDEX `idx_plan_stops_room_id` ON `plan_stops` (`room_id`);--> statement-breakpoint
CREATE INDEX `idx_memory_photos_room_id` ON `memory_photos` (`room_id`);