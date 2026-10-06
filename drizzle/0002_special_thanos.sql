CREATE TABLE `email_verification_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `email_verification_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_verification_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `products` RENAME COLUMN `nombre` TO `name`;--> statement-breakpoint
ALTER TABLE `products` RENAME COLUMN `precio` TO `price`;--> statement-breakpoint
ALTER TABLE `products` RENAME COLUMN `descripcion` TO `description`;--> statement-breakpoint
ALTER TABLE `products` RENAME COLUMN `cantidad` TO `quantity`;--> statement-breakpoint
ALTER TABLE `roles` RENAME COLUMN `nombre` TO `name`;--> statement-breakpoint
ALTER TABLE `roles` RENAME COLUMN `descripcion` TO `description`;--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN `nombre` TO `name`;--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN `correo` TO `email`;--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN `direccion` TO `address`;--> statement-breakpoint
ALTER TABLE `roles` DROP INDEX `roles_nombre_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_correo_unique`;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified_at` timestamp;--> statement-breakpoint
ALTER TABLE `roles` ADD CONSTRAINT `roles_name_unique` UNIQUE(`name`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `email_verification_tokens` ADD CONSTRAINT `email_verification_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;