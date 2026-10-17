# Mode implementation notes

Original Neon Bluff remains the default. Server-owned cards, stacks, turn order,
legal action validation, timeouts, integer-cent balances and side-pot settlement
apply across betting modes. Requests use optimistic room versions and action IDs.
This is baseline anti-tampering, not a guarantee against collusion, multi-account
abuse or all cheating. Account recovery and stronger identity are still needed
before paid credits can launch.

Hold'em: two private, five community, no limit. Omaha: four private, exactly two
plus three, pot limit. Draw: five private and one draw, fixed limit. Double-Deuce:
twos wild, one draw, five of a kind above straight flush; table-poker variant,
not Pogo's proprietary video-poker paytable. Triple Draw: three draws, 2–7 low,
aces high and flushes/straights penalized. Reshuffles exclude a player's just-
discarded cards from that replacement draw.

Stud/Razz: seven seats maximum, two down / four up / one down, antes and bring-in,
five fixed-limit rounds. Razz has ace-to-five low, ignoring straights/flushes.
Stud uses small bets on third/fourth street and large bets thereafter; the
optional fourth-street open-pair double-bet rule is not offered. This is stated
as the table's fixed-limit convention rather than claiming every casino rule.

H.O.R.S.E.: rotates every five hands, all fixed limit. Hold'em, Omaha Hi-Lo,
Razz, Stud, Stud Eight-or-Better. Eight-or-better lows use five distinct ranks;
qualifying high/low pots split with the odd denomination awarded to high.
Dealer is frozen through Stud-family rounds. Tournaments start T25/T50 and
blinds double each 10 hands, capped at level 8. No timed blind-level schedule.

Pineapple house timing: discard one after flop betting. Crazy Pineapple house
timing: discard one after turn betting. Labels explicitly distinguish the
owner-requested timing from other published versions.

Chinese: 2–4 players, front3/middle5/back5, no betting, no royalties, no fantasyland.
Back must be at least as strong as middle, and middle at least as strong as front.
One point per row, three-point scoop bonus, foul loses six against a valid hand;
both foul = tie. Point totals last for the room; they are not bank money.

Fast-fold: solo versus computers. A fold settles the old computer hand without
refunding committed chips, then immediately starts another if funded. No live
fast-fold pool or multi-table matchmaking has been implemented.

Jackpot: exactly three players, T10,000 start, Hold'em elimination. One random
score multiplier per room: 2x 70%, 3x 20%, 5x 8%, 10x 1.9%, 1000x 0.1%.
Prize is 10,000 times multiplier in display score only, no bank redemption.

Other next hands start three seconds after settlement when at least two funded
players remain. Progress is driven by active clients polling; an abandoned room
advances when next contacted. A busted solo player is not dealt into a bot-only
continuation. Live games never auto-fill human seats with bots.

Win guide: samples random unseen hands in a worker, never reads hidden cards or
controls the actual shuffle. For split games it labels high-half chances only.
Draw estimates appear after the final draw and assume stand-pat holdings; early
Stud / pending Pineapple discard does not pretend to supply a precise estimate.

Cards/stakes static checks, TypeScript and production build are the verification
scope requested. No game was launched, gameplay simulated or payment/ad made.
The legacy offline engine remains present but unused; removing it is a proposed
cleanup, not performed without showing it to the owner first.
