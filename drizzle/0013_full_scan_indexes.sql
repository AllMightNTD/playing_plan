CREATE INDEX `idx_places_city_status_area` ON `places` (`city`,`status`,`area`);--> statement-breakpoint
CREATE INDEX `idx_saved_places_place_id` ON `saved_places` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_memories_plan_id` ON `memories` (`plan_id`);--> statement-breakpoint
CREATE INDEX `idx_reminders_plan_id` ON `reminders` (`plan_id`);--> statement-breakpoint
CREATE INDEX `idx_date_plans_room_status_date` ON `date_plans` (`room_id`,`status`,`plan_date`);--> statement-breakpoint
CREATE INDEX `idx_plan_stops_place_id` ON `plan_stops` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_rooms_status_last_active` ON `rooms` (`status`,`last_active_at`);--> statement-breakpoint
CREATE INDEX `idx_rooms_pending_deleted` ON `rooms` (`pending_deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_place_videos_video_id` ON `place_videos` (`video_id`);--> statement-breakpoint
CREATE INDEX `idx_room_uploads_memory` ON `room_uploads` (`memory_id`);
