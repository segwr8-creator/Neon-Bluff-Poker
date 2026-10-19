// Amounts are integer hundredths of a Stack Dollar. Limits apply per account,
// across all friends. A tax is not charged. These limits do not prove fair play.
export const GIFT_MAX = 10000;
export const GIFT_DAILY_MAX = 30000;
export const giftDayStart = now => Math.floor(now / 86400000) * 86400000;
export const GIFT_POLICY_TEXT = 'Gifts: up to SD 100 each; SD 300 sent and SD 300 received per UTC day across all friends. No transfer fee. Friends must accept. Stack Dollars cannot be sold or redeemed.';// A single guarded UPDATE makes the daily quota check part of the write, not
// a separate read/check. D1 batch is transactional, including both wallet writes.
export const GIFT_ACCEPT_SQL = `UPDATE gifts SET status='accepted',mutation=?,accepted_at=?
WHERE id=? AND recipient=? AND status='pending' AND created>?
AND amount BETWEEN 5 AND ${GIFT_MAX} AND amount % 5=0
AND EXISTS (SELECT 1 FROM profiles WHERE id=? AND cash_balance>=? AND gift_locked=0)
AND EXISTS (SELECT 1 FROM friendships WHERE pair=? AND status='accepted')
AND (SELECT COALESCE(SUM(amount),0) FROM gifts WHERE sender=? AND status='accepted' AND accepted_at>=?)+amount<=${GIFT_DAILY_MAX}
AND (SELECT COALESCE(SUM(amount),0) FROM gifts WHERE recipient=? AND status='accepted' AND accepted_at>=?)+amount<=${GIFT_DAILY_MAX}`;
