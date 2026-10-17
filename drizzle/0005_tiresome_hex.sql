CREATE TABLE `fair_play_flags` (
	`pair` text PRIMARY KEY NOT NULL,
	`loser` text NOT NULL,
	`winner` text NOT NULL,
	`hands` integer NOT NULL,
	`loss` integer NOT NULL,
	`status` text DEFAULT 'review' NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fair_play_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`hand` integer NOT NULL,
	`loser` text NOT NULL,
	`winner` text NOT NULL,
	`loss` integer NOT NULL,
	`gain` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fair_play_pair_time` ON `fair_play_signals` (`loser`,`winner`,`created`);