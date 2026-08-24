CREATE TABLE `client_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`grant_id` text,
	`expires_at` integer,
	`payload` text
);
--> statement-breakpoint
CREATE INDEX `client_credentials_grant_id_idx` ON `client_credentials` (`grant_id`);--> statement-breakpoint
CREATE INDEX `client_credentials_expires_at_idx` ON `client_credentials` (`expires_at`);