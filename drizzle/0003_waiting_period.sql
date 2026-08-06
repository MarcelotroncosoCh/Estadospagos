ALTER TABLE `submissions` ADD COLUMN `waiting_for_period` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX `submissions_waiting_idx` ON `submissions` (`waiting_for_period`);
