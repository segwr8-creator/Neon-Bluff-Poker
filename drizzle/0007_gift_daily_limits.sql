ALTER TABLE gifts ADD accepted_at INTEGER;
--> statement-breakpoint
-- Conservatively count existing accepted gifts on migration day. Their original
-- acceptance times were not recorded, so never invent them from request time.
UPDATE gifts SET accepted_at=unixepoch()*1000 WHERE status='accepted' AND accepted_at IS NULL;
--> statement-breakpoint
CREATE INDEX gifts_sender_accepted ON gifts(sender,accepted_at);
--> statement-breakpoint
CREATE INDEX gifts_recipient_accepted ON gifts(recipient,accepted_at);
