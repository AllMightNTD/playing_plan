ALTER TABLE `pipeline_runs` MODIFY COLUMN `run_type` enum('osm_ingest','youtube_scrape','video_match','shadow_eval','auto_promote','maintenance','video_import','ai_video_hotspots') NOT NULL;--> statement-breakpoint
ALTER TABLE `pipeline_sample_grades` MODIFY COLUMN `item_type` enum('place','video','hotspot') NOT NULL;--> statement-breakpoint
ALTER TABLE `video_hotspots` MODIFY COLUMN `source` enum('chapter','admin','ai') NOT NULL;--> statement-breakpoint
ALTER TABLE `video_catalog` ADD `duration_sec` int;--> statement-breakpoint
ALTER TABLE `video_catalog` ADD `ai_analyzed_at` datetime;--> statement-breakpoint
ALTER TABLE `video_catalog` ADD `ai_analysis_model` varchar(64);--> statement-breakpoint
ALTER TABLE `video_catalog` ADD `ai_analysis_error` text;--> statement-breakpoint
ALTER TABLE `video_hotspots` ADD `confidence` decimal(3,2);--> statement-breakpoint
ALTER TABLE `video_hotspots` ADD `evidence` varchar(300);--> statement-breakpoint
CREATE INDEX `idx_video_catalog_ai_analyzed` ON `video_catalog` (`ai_analyzed_at`);