CREATE TABLE `candidate_places` (
	`id` varchar(21) NOT NULL,
	`osm_id` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`search_name` varchar(200) NOT NULL DEFAULT '',
	`lat` decimal(9,6) NOT NULL,
	`lng` decimal(9,6) NOT NULL,
	`address` varchar(300) NOT NULL,
	`city` varchar(50) NOT NULL DEFAULT 'hanoi',
	`category` varchar(50) NOT NULL DEFAULT 'cafe',
	`raw_tags` json NOT NULL,
	`dating_score` int NOT NULL DEFAULT 0,
	`status` enum('pending','promoted','rejected') NOT NULL DEFAULT 'pending',
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `candidate_places_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidate_places_osm_id_unique` UNIQUE(`osm_id`)
);
--> statement-breakpoint
CREATE TABLE `field_provenance` (
	`id` varchar(21) NOT NULL,
	`place_id` varchar(21) NOT NULL,
	`field_name` varchar(80) NOT NULL,
	`source` enum('editor','merchant','user','osm','youtube','ai') NOT NULL,
	`confidence` decimal(4,2) NOT NULL DEFAULT '0.50',
	`verified` boolean NOT NULL DEFAULT false,
	`evidence_url` text,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `field_provenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `place_blocklist` (
	`id` varchar(21) NOT NULL,
	`osm_id` varchar(50),
	`name_pattern` varchar(255),
	`lat_min` decimal(9,6),
	`lat_max` decimal(9,6),
	`lng_min` decimal(9,6),
	`lng_max` decimal(9,6),
	`reason` enum('railway_safety','permanently_closed','inappropriate','scam') NOT NULL,
	`note` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `place_blocklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `place_videos` (
	`place_id` varchar(21) NOT NULL,
	`video_id` varchar(50) NOT NULL,
	`channel_id` varchar(50),
	`channel_title` varchar(200),
	`has_paid_placement` boolean NOT NULL DEFAULT false,
	`confidence_score` decimal(5,2) NOT NULL DEFAULT '0.00',
	`status` enum('auto_linked','pending_review','rejected','verified') NOT NULL DEFAULT 'pending_review',
	`published_at` datetime,
	`last_checked_at` datetime NOT NULL,
	CONSTRAINT `place_videos_place_id_video_id_pk` PRIMARY KEY(`place_id`,`video_id`)
);
--> statement-breakpoint
CREATE TABLE `youtube_quota_ledger` (
	`quota_date` varchar(10) NOT NULL,
	`units_used` int NOT NULL DEFAULT 0,
	`last_call_at` datetime NOT NULL,
	`is_halted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `youtube_quota_ledger_quota_date` PRIMARY KEY(`quota_date`)
);
--> statement-breakpoint
CREATE INDEX `idx_candidates_status` ON `candidate_places` (`status`);--> statement-breakpoint
CREATE INDEX `idx_candidates_dating_score` ON `candidate_places` (`dating_score`);--> statement-breakpoint
CREATE INDEX `idx_provenance_place_field` ON `field_provenance` (`place_id`,`field_name`);--> statement-breakpoint
CREATE INDEX `idx_provenance_source` ON `field_provenance` (`source`);--> statement-breakpoint
CREATE INDEX `idx_blocklist_osm_id` ON `place_blocklist` (`osm_id`);--> statement-breakpoint
CREATE INDEX `idx_blocklist_reason` ON `place_blocklist` (`reason`);--> statement-breakpoint
CREATE INDEX `idx_place_videos_status` ON `place_videos` (`status`);--> statement-breakpoint
CREATE INDEX `idx_place_videos_last_checked` ON `place_videos` (`last_checked_at`);