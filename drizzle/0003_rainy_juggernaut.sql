CREATE TABLE `refill_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`kind` text NOT NULL,
	`product` text,
	`created` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `refill_intents_profile_created` ON `refill_intents` (`profile_id`,`created`);--> statement-breakpoint
CREATE TABLE `refill_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`intent_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`provider` text NOT NULL,
	`product` text NOT NULL,
	`amount` integer NOT NULL,
	`mutation` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refill_ledger_intent_id_unique` ON `refill_ledger` (`intent_id`);--> statement-breakpoint
CREATE INDEX `refill_ledger_profile_created` ON `refill_ledger` (`profile_id`,`created`);