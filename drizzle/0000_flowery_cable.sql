CREATE TABLE `catalog_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`project_type` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_kind_name_type_uq` ON `catalog_entries` (`kind`,`name`,`project_type`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`object_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_object_key_unique` ON `documents` (`object_key`);--> statement-breakpoint
CREATE INDEX `documents_submission_idx` ON `documents` (`submission_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`process_id` text DEFAULT '2026-07-2' NOT NULL,
	`requester` text NOT NULL,
	`requester_email` text,
	`department` text NOT NULL,
	`provider` text NOT NULL,
	`project_type` text NOT NULL,
	`project` text NOT NULL,
	`motive` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Recibida' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `submissions_department_idx` ON `submissions` (`department`);--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`);--> statement-breakpoint
CREATE INDEX `submissions_process_idx` ON `submissions` (`process_id`);