ALTER TABLE `submissions` ADD COLUMN `payment_period` text DEFAULT '2026-07-31T17:00:00-04:00' NOT NULL;
--> statement-breakpoint
UPDATE `submissions`
SET `payment_period` = COALESCE(
  (SELECT `deadline` FROM `payment_processes` WHERE `payment_processes`.`id` = `submissions`.`process_id`),
  `payment_period`
);
--> statement-breakpoint
CREATE INDEX `submissions_department_period_idx` ON `submissions` (`department`,`payment_period`);
