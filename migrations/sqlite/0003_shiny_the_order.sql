ALTER TABLE `device_codes` ADD `user_code` text;--> statement-breakpoint
CREATE INDEX `device_codes_user_code_idx` ON `device_codes` (`user_code`);