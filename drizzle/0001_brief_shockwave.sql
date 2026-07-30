CREATE TABLE `payment_processes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`deadline` text NOT NULL,
	`is_open` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
