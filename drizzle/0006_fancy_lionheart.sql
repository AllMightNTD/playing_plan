CREATE TABLE `room_notices` (
	`id` varchar(21) NOT NULL,
	`room_id` varchar(21) NOT NULL,
	`member_id` varchar(21),
	`notice_type` enum('room_delete_pending','new_match','plan_rsvp','time_change_request','secret_note_unlocked') NOT NULL,
	`title` varchar(150) NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`read_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `room_notices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `room_uploads` (
	`id` varchar(32) NOT NULL,
	`room_id` varchar(21) NOT NULL,
	`member_id` varchar(21) NOT NULL,
	`memory_id` varchar(21),
	`file_name` varchar(255) NOT NULL,
	`mime_type` varchar(50) NOT NULL,
	`size_bytes` int NOT NULL,
	`width` int,
	`height` int,
	`relative_path` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`deleted_at` datetime,
	CONSTRAINT `room_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_room_notices_room_read` ON `room_notices` (`room_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `idx_room_uploads_room` ON `room_uploads` (`room_id`,`deleted_at`);