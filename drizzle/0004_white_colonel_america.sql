CREATE TABLE `friendships` (
	`pair` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `friendships_sender` ON `friendships` (`sender`);--> statement-breakpoint
CREATE INDEX `friendships_recipient` ON `friendships` (`recipient`);--> statement-breakpoint
CREATE TABLE `gifts` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text NOT NULL,
	`mutation` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `gifts_recipient_created` ON `gifts` (`recipient`,`created`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`pair` text NOT NULL,
	`sender` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_pair_created` ON `messages` (`pair`,`created`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `gift_locked` integer DEFAULT 0 NOT NULL;