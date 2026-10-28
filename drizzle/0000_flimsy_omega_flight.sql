CREATE TABLE `audit_logs` (
	`id` varchar(21) NOT NULL,
	`admin_email` varchar(150) NOT NULL,
	`action` varchar(50) NOT NULL,
	`target_type` varchar(50) NOT NULL,
	`target_id` varchar(21) NOT NULL,
	`changes` json,
	`created_at` datetime NOT NULL,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `room_members` (
	`id` varchar(21) NOT NULL,
	`room_id` varchar(21) NOT NULL,
	`session_hash` char(64) NOT NULL,
	`recovery_hash` char(64),
	`nickname` varchar(40),
	`role` enum('creator','partner') NOT NULL DEFAULT 'creator',
	`push_subscription` json,
	`last_seen_at` datetime NOT NULL,
	`revoked_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `room_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `room_members_session_hash_unique` UNIQUE(`session_hash`),
	CONSTRAINT `room_members_recovery_hash_unique` UNIQUE(`recovery_hash`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` varchar(21) NOT NULL,
	`name` varchar(100),
	`member_count` tinyint NOT NULL DEFAULT 1,
	`invite_hash` char(64),
	`invite_code_hash` char(64),
	`invite_expires_at` datetime,
	`anniversary_date` date,
	`status` enum('solo','paired','deleted') NOT NULL DEFAULT 'solo',
	`last_active_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `place_guides` (
	`place_id` varchar(21) NOT NULL,
	`best_times` json,
	`best_weekdays` json,
	`avoid_weekdays` json,
	`best_seasons` json,
	`crowd_notes` text,
	`photo_spots` json,
	`poses` json,
	`outfit` json,
	`tips` json,
	`source_links` json,
	CONSTRAINT `place_guides_place_id` PRIMARY KEY(`place_id`)
);
--> statement-breakpoint
CREATE TABLE `place_media` (
	`id` varchar(21) NOT NULL,
	`place_id` varchar(21) NOT NULL,
	`type` enum('image','video') NOT NULL,
	`url` text NOT NULL,
	`platform` enum('upload','tiktok','youtube','instagram','unsplash','pexels') NOT NULL,
	`embed_id` varchar(100),
	`caption` varchar(200),
	`credit` varchar(200),
	`license` enum('own','cc0','licensed','permission','embed_only') NOT NULL DEFAULT 'permission',
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `place_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `places` (
	`id` varchar(21) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(200) NOT NULL,
	`search_name` varchar(200) NOT NULL DEFAULT '',
	`search_text` text,
	`city` varchar(50) NOT NULL DEFAULT 'hanoi',
	`area` varchar(80) NOT NULL,
	`address` varchar(300) NOT NULL,
	`lat` decimal(9,6) NOT NULL,
	`lng` decimal(9,6) NOT NULL,
	`category` enum('photo','cafe','food','walk','fun','indoor','nature') NOT NULL,
	`price_level` tinyint NOT NULL DEFAULT 1,
	`est_cost_min` int NOT NULL DEFAULT 0,
	`est_cost_max` int NOT NULL DEFAULT 0,
	`moods` json NOT NULL,
	`tags` json NOT NULL,
	`indoor` boolean NOT NULL DEFAULT false,
	`cover_url` text NOT NULL,
	`summary` varchar(300) NOT NULL,
	`opening_hours` json,
	`status` enum('draft','published','hidden') NOT NULL DEFAULT 'draft',
	`view_count` int NOT NULL DEFAULT 0,
	`last_verified_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `places_id` PRIMARY KEY(`id`),
	CONSTRAINT `places_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `saved_places` (
	`member_id` varchar(21) NOT NULL,
	`place_id` varchar(21) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `saved_places_member_id_place_id_pk` PRIMARY KEY(`member_id`,`place_id`)
);
--> statement-breakpoint
CREATE TABLE `checklist_items` (
	`id` varchar(21) NOT NULL,
	`plan_id` varchar(21) NOT NULL,
	`content` varchar(200) NOT NULL,
	`is_done` boolean NOT NULL DEFAULT false,
	`assigned_to` varchar(21),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `date_plans` (
	`id` varchar(21) NOT NULL,
	`room_id` varchar(21) NOT NULL,
	`created_by` varchar(21) NOT NULL,
	`title` varchar(150) NOT NULL,
	`plan_date` date NOT NULL,
	`start_time` varchar(10) NOT NULL,
	`status` enum('planned','done','cancelled') NOT NULL DEFAULT 'planned',
	`budget` int,
	`is_secret` boolean NOT NULL DEFAULT false,
	`reveal_at` datetime,
	`note` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	`updated_by` varchar(21),
	CONSTRAINT `date_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_stops` (
	`id` varchar(21) NOT NULL,
	`plan_id` varchar(21) NOT NULL,
	`place_id` varchar(21),
	`custom_name` varchar(150),
	`sort_order` int NOT NULL DEFAULT 0,
	`planned_time` varchar(10),
	`duration_min` int NOT NULL DEFAULT 60,
	`note` text,
	CONSTRAINT `plan_stops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` varchar(21) NOT NULL,
	`room_id` varchar(21) NOT NULL,
	`place_id` varchar(21) NOT NULL,
	`matched_at` datetime NOT NULL,
	`status` enum('open','planned','dismissed') NOT NULL DEFAULT 'open',
	CONSTRAINT `matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_matches_room_place` UNIQUE(`room_id`,`place_id`)
);
--> statement-breakpoint
CREATE TABLE `memories` (
	`id` varchar(21) NOT NULL,
	`plan_id` varchar(21) NOT NULL,
	`room_id` varchar(21) NOT NULL,
	`rating` tinyint NOT NULL DEFAULT 5,
	`journal` text,
	`visited_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `memories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memory_photos` (
	`id` varchar(21) NOT NULL,
	`memory_id` varchar(21) NOT NULL,
	`url` text NOT NULL,
	`caption` varchar(200),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `memory_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` varchar(21) NOT NULL,
	`plan_id` varchar(21) NOT NULL,
	`member_id` varchar(21) NOT NULL,
	`remind_at` datetime NOT NULL,
	`channel` enum('push','calendar') NOT NULL DEFAULT 'calendar',
	`sent_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `swipes` (
	`room_id` varchar(21) NOT NULL,
	`member_id` varchar(21) NOT NULL,
	`place_id` varchar(21) NOT NULL,
	`choice` enum('like','nope') NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `swipes_member_id_place_id_pk` PRIMARY KEY(`member_id`,`place_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_admin` ON `audit_logs` (`admin_email`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_target` ON `audit_logs` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_room_members_room_id` ON `room_members` (`room_id`);--> statement-breakpoint
CREATE INDEX `idx_rooms_invite_hash` ON `rooms` (`invite_hash`);--> statement-breakpoint
CREATE INDEX `idx_rooms_invite_code_hash` ON `rooms` (`invite_code_hash`);--> statement-breakpoint
CREATE INDEX `idx_place_media_place_id` ON `place_media` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_places_city_status` ON `places` (`city`,`status`);--> statement-breakpoint
CREATE INDEX `idx_places_category` ON `places` (`category`);--> statement-breakpoint
CREATE INDEX `idx_places_price_level` ON `places` (`price_level`);--> statement-breakpoint
CREATE INDEX `idx_places_search_name` ON `places` (`search_name`);--> statement-breakpoint
CREATE INDEX `idx_checklist_plan_sort` ON `checklist_items` (`plan_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_date_plans_room_date` ON `date_plans` (`room_id`,`plan_date`);--> statement-breakpoint
CREATE INDEX `idx_plan_stops_plan_sort` ON `plan_stops` (`plan_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_memories_room_id` ON `memories` (`room_id`);--> statement-breakpoint
CREATE INDEX `idx_memory_photos_memory_id` ON `memory_photos` (`memory_id`);--> statement-breakpoint
CREATE INDEX `idx_reminders_remind_sent` ON `reminders` (`remind_at`,`sent_at`);--> statement-breakpoint
CREATE INDEX `idx_swipes_room_place` ON `swipes` (`room_id`,`place_id`);