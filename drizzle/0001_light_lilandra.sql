ALTER TABLE `place_media` MODIFY COLUMN `platform` enum('upload','tiktok','youtube','instagram','unsplash','pexels','wikimedia') NOT NULL;--> statement-breakpoint
ALTER TABLE `place_media` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `place_media` ADD `license_note` varchar(300);