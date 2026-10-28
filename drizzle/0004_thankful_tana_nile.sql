CREATE TABLE `memory_notes` (
	`id` varchar(21) NOT NULL,
	`room_id` varchar(21) NOT NULL,
	`member_id` varchar(21) NOT NULL,
	`content` varchar(280) NOT NULL,
	`color` enum('peach','yellow','olive') NOT NULL DEFAULT 'peach',
	`created_at` datetime NOT NULL,
	CONSTRAINT `memory_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_memory_notes_room_created` ON `memory_notes` (`room_id`,`created_at`);