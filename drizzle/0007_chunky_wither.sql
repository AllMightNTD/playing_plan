CREATE TABLE `plan_rsvps` (
	`id` varchar(21) NOT NULL,
	`plan_id` varchar(21) NOT NULL,
	`room_id` varchar(21) NOT NULL,
	`responder_name` varchar(60) NOT NULL,
	`status` enum('confirmed','change_requested') NOT NULL,
	`change_note` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `plan_rsvps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_plan_rsvps_plan` ON `plan_rsvps` (`plan_id`);