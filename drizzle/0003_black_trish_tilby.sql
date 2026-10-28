CREATE TABLE `pipeline_runs` (
	`id` varchar(36) NOT NULL,
	`run_type` enum('osm_ingest','youtube_scrape','video_match','shadow_eval','auto_promote','maintenance') NOT NULL,
	`started_at` datetime NOT NULL,
	`finished_at` datetime,
	`status` enum('running','success','failed','paused') NOT NULL DEFAULT 'running',
	`quota_used` int NOT NULL DEFAULT 0,
	`promoted_count` int NOT NULL DEFAULT 0,
	`summary_json` json,
	CONSTRAINT `pipeline_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `place_reports` (
	`id` varchar(36) NOT NULL,
	`place_id` varchar(36) NOT NULL,
	`reason` enum('closed','wrong_hours','wrong_price','wrong_location','inappropriate') NOT NULL,
	`details` text,
	`client_hash` varchar(64) NOT NULL,
	`status` enum('pending','verified','dismissed') NOT NULL DEFAULT 'pending',
	`created_at` datetime NOT NULL,
	CONSTRAINT `place_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `candidate_places` ADD `evaluated_tier` enum('A','B','C');--> statement-breakpoint
ALTER TABLE `candidate_places` ADD `evaluated_date_fit` enum('romantic','chill','casual','fun');--> statement-breakpoint
ALTER TABLE `candidate_places` ADD `batch_id` varchar(64);--> statement-breakpoint
ALTER TABLE `places` ADD `display_name` varchar(255);--> statement-breakpoint
ALTER TABLE `places` ADD `tier` enum('A','B','C') DEFAULT 'C' NOT NULL;--> statement-breakpoint
ALTER TABLE `places` ADD `batch_id` varchar(64);--> statement-breakpoint
ALTER TABLE `places` ADD `publish_state` enum('draft','shadow','published','downgraded') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `places` ADD `date_fit` enum('romantic','chill','casual','fun') DEFAULT 'chill' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_pipeline_runs_type` ON `pipeline_runs` (`run_type`);--> statement-breakpoint
CREATE INDEX `idx_pipeline_runs_status` ON `pipeline_runs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_pipeline_runs_started` ON `pipeline_runs` (`started_at`);--> statement-breakpoint
CREATE INDEX `idx_place_reports_place` ON `place_reports` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_place_reports_status` ON `place_reports` (`status`);--> statement-breakpoint
CREATE INDEX `idx_place_reports_client` ON `place_reports` (`client_hash`);--> statement-breakpoint
CREATE INDEX `idx_candidates_batch_id` ON `candidate_places` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_places_tier` ON `places` (`tier`);--> statement-breakpoint
CREATE INDEX `idx_places_publish_state` ON `places` (`publish_state`);--> statement-breakpoint
CREATE INDEX `idx_places_batch_id` ON `places` (`batch_id`);