CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`wallet` integer DEFAULT 100000 NOT NULL,
	`stats` text DEFAULT '{"actions":0,"raises":0,"calls":0,"checks":0,"folds":0}' NOT NULL,
	`active_room` text,
	`escrow` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
