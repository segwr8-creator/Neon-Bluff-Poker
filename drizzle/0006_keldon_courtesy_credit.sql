-- One-time SD 500 courtesy credit requested by the owner on 2026-10-09.
-- The profile matches Keldon and the SD 0.70 screenshot balance.
-- A temporary insert trigger makes the credit and audit entry one atomic statement.
CREATE TRIGGER IF NOT EXISTS courtesy_credit_20261009
AFTER INSERT ON refill_ledger
WHEN NEW.id = 'courtesy:keldon:20261009:500'
 AND NEW.profile_id = 'b6b20e2e6548e66a1e374e05cca9434905797fcce3ec8ae9456d4dbd0c0b4dd8'
 AND NEW.amount = 50000
BEGIN
 UPDATE profiles SET cash_balance=cash_balance+NEW.amount, updated=NEW.created
 WHERE id=NEW.profile_id;
END;
--> statement-breakpoint
INSERT OR IGNORE INTO refill_ledger
 (id,intent_id,profile_id,provider,product,amount,mutation,created)
SELECT 'courtesy:keldon:20261009:500','courtesy:keldon:20261009:500',id,
 'courtesy','free_stack_dollars_500',50000,'courtesy:keldon:20261009:500',unixepoch()*1000
FROM profiles WHERE id='b6b20e2e6548e66a1e374e05cca9434905797fcce3ec8ae9456d4dbd0c0b4dd8';
--> statement-breakpoint
DROP TRIGGER IF EXISTS courtesy_credit_20261009;
