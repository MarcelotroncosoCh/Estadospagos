ALTER TABLE `submissions` ADD COLUMN `paid_amount` integer;
--> statement-breakpoint
ALTER TABLE `submissions` ADD COLUMN `payment_date` text;
--> statement-breakpoint
ALTER TABLE `submissions` ADD COLUMN `notified_at` text;
--> statement-breakpoint
CREATE INDEX `submissions_notification_idx` ON `submissions` (`payment_period`,`status`,`notified_at`);
