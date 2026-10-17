// Discovery only: the server revalidates the seat and balance on confirmed join.
export function findOpenTable(tables, {variant, stake, rules, wallet}) {
  return tables.filter(t => t.variant === variant && t.stake === stake &&
    (variant !== 'neon' || t.rules === rules) && t.phase === 'lobby' &&
    t.players > 0 && t.players < t.capacity && wallet >= t.bankRequired &&
    (t.funds === 'tournament' || wallet >= t.min))
    .sort((a,b) => b.players-a.players || a.code.localeCompare(b.code))[0] || null;
}
