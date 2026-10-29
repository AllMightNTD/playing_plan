CREATE TABLE `blind_date_tickets` (
	`id` varchar(32) NOT NULL,
	`room_id` varchar(21) NOT NULL,
	`budget_tier` enum('budget','medium','luxury') NOT NULL DEFAULT 'medium',
	`current_step` int NOT NULL DEFAULT 1,
	`total_steps` int NOT NULL DEFAULT 3,
	`status` enum('in_progress','completed','cancelled') NOT NULL DEFAULT 'in_progress',
	`steps_data` json NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `blind_date_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `place_checkins` (
	`id` varchar(32) NOT NULL,
	`room_id` varchar(21) NOT NULL,
	`member_id` varchar(21) NOT NULL,
	`place_id` varchar(32) NOT NULL,
	`place_name` varchar(255) NOT NULL,
	`district` varchar(50) NOT NULL,
	`method` enum('gps_auto','manual_confirm') NOT NULL,
	`checked_in_at` datetime NOT NULL,
	CONSTRAINT `place_checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `secret_notes` (
	`id` varchar(32) NOT NULL,
	`room_id` varchar(21) NOT NULL,
	`author_member_id` varchar(21) NOT NULL,
	`place_id` varchar(32) NOT NULL,
	`place_name` varchar(255) NOT NULL,
	`district` varchar(50) NOT NULL,
	`hint` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`is_unlocked` boolean NOT NULL DEFAULT false,
	`unlocked_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `secret_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_blind_date_room_status` ON `blind_date_tickets` (`room_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_place_checkins_room` ON `place_checkins` (`room_id`,`place_id`);--> statement-breakpoint
CREATE INDEX `idx_place_checkins_district` ON `place_checkins` (`room_id`,`district`);--> statement-breakpoint
CREATE INDEX `idx_secret_notes_room_place` ON `secret_notes` (`room_id`,`place_id`);--> statement-breakpoint
CREATE INDEX `idx_secret_notes_room_unlocked` ON `secret_notes` (`room_id`,`is_unlocked`);