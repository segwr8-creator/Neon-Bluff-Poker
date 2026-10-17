# Chip refills: prepared, not activated

The live browser game does not collect payments or serve ads. `RELEASE_READY` in
`lib/monetization.ts` is deliberately false. Configuring credentials alone cannot
turn on this unvalidated integration. No Android application or native SDK bridge
has been built, and no Google Play / AdMob accounts were created or connected.

## Proposed catalog

| Product | Stack dollars | Planned USD price |
| --- | ---: | ---: |
| neon_refill_500 | 500 | 0.99 |
| neon_refill_2000 | 2,000 | 2.99 |
| neon_refill_5000 | 5,000 | 4.99 |

These are suggested prices, not active Play products. The release client must
show the localized price returned by Google Play. No subscriptions or automatic
renewals. Multi-quantity purchases are not enabled. Chips cannot be redeemed,
sold or withdrawn. Tournament/jackpot points never credit the cash-table bank.

Ad reward: 50 stack dollars. Eligible only outside a table with bank below the
$5 minimum cash-table buy-in. Ads must be voluntary. A skipped/unavailable ad
cannot grant chips. Only a verified Google SSV callback credits the bank.
Accounts receiving ad rewards become gift-locked. Before release, obtain the ad
provider's approval for the multiplayer chip economy; the gift restriction alone
does not establish compliance with non-transferability requirements.

## What the owner must provide

- Google Play Console app/package and merchant setup, product IDs and chosen prices.
- AdMob app and rewarded unit, plus account verification/review.
- The future browser checkout site/provider, if browser purchases are desired.
  Merely supplying a URL is insufficient: server-signed payment confirmation is
  needed. Browser checkout is a separate integration from Play Billing.
- Public support contact, privacy policy, terms, age/content rating, ad/privacy
  consent choices and regional availability appropriate to the actual launch.
- Recoverable user accounts. Current guest identity is a bearer credential kept
  on the device; clearing browser storage loses access. Do not sell chips until
  account recovery and purchase restoration are implemented.

Never paste service-account private keys in chat or store them in public assets.
Use hosted secrets for PLAY_SERVICE_ACCOUNT_JSON; package and ad unit IDs are
configuration, not secrets. Runtime names: MONETIZATION_ENABLED,
PLAY_PACKAGE_NAME, PLAY_SERVICE_ACCOUNT_JSON, ADMOB_REWARDED_UNIT_ID.
ADMOB_REWARDED_UNIT_ID must match the exact `ad_unit` callback parameter.

## Server interfaces already written

- GET /api/refill: authenticated status/catalog, not a payment session.
- POST /api/refill {op:"intent",kind:"purchase"|"ad",product?}: server issues a
  one-hour session after eligibility validation. Disabled before release.
- POST /api/refill {op:"verify-purchase",intent,purchaseToken}: Google API receipt
  verification, account/session/product matching, durable once-only ledger,
  credit-before-consume and consumption retry support.
- GET /api/rewards/admob: ECDSA verification of original query bytes using Google's
  rotating keys; exact ad unit/reward matching, account/session matching and
  transaction/intent replay protection. Reward amount 50, item fictional_dollars
  (internal provider identifier, not player-facing language).

## Native bridge still to implement

The web UI expects a trusted, origin-restricted asynchronous `window.NeonRefills`:
version=1; getProducts(ids) -> [{id,formattedPrice}];
purchase({productId,accountId,intentId}) -> {purchaseToken}|{pending:true}|{cancelled:true};
showRewardedAd({userId,customData}) -> {completed:boolean}.

Use Google Play Billing's obfuscated account ID and obfuscated profile ID for the
server account and intent. The native app must save the intent/token securely,
resume pending purchases after app restart, query existing unconsumed purchases,
and retry verification/consumption without charging again. No WebView-wide
unrestricted Javascript interface; restrict messages to the exact game origin
and main frame. Implement the current Google Mobile Ads SDK and consent flow,
and pass the server account/intent into AdMob SSV options. Client ad completion
only controls pending UI; it must never mint chips.

Before changing RELEASE_READY: complete native integration, recoverable accounts,
refund/voided-purchase reconciliation, durable consumption retries, consent and
provider review. Use Play license testers and Google's test ad units. Verify
pending/canceled/refunded purchases, duplicate callbacks, replay/cross-account
attempts, interruption/restart and insufficient funds. No such runtime tests were
performed in this update because the owner requested code checks only.

## Official references consulted

- https://developer.android.com/google/play/billing/security
- https://developer.android.com/google/play/billing/integrate
- https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products
- https://developers.google.com/admob/android/ssv
- https://support.google.com/admob/answer/7313578

## October 9 polish
The UI uses Stack Dollars (SD), separate Tournament chips (T), and USD only for proposed purchase prices. Packs now include 10,000 / $9.99, 20,000 / $19.99, 30,000 / $29.99 and 50,000 / $49.99. All remain disabled. No payment account, bank-transfer checkout, live ad inventory, native bridge, recovery flow or refund reconciliation has been connected. A bank transfer is a real-money purchase, not a free refill. Do not collect raw card or bank credentials in this game.

Rewarded ads remain optional, off-table, and intended as a Micro-stakes safety net. Ad duration must come from the provider; do not promise 30 seconds. No paid “Remove Ads” product is offered because there are no forced ads to remove. No new house-rule modifiers (7–2 bonuses, straddle, rabbit hunting) are enabled.

The server now stores idempotent large-loss evidence for human ring-game players (loss >= 20 BB and >= 40% of starting stack). Three such losses to the same winning opponent within 30 days create a private review flag. This is a heuristic, not proof of collusion, a ban system, or comprehensive fraud protection. It records shared-hand losses and gains, not an exact attribution of money between opponents. Flags persist in fair_play_flags; no public exposure or automated penalty. An operator review workflow remains necessary before paid launch.

## Current compiler catalog — October 15, 2026

`public/store-catalog.mjs` is authoritative and supersedes the older catalog above.
The dropdown values are total Stack Dollars INCLUDING bonuses. Product IDs and
verified server rewards are: chips_500 → 500; chips_2000 → 2,500; chips_5000 → 6,000;
chips_10000 → 15,000; chips_20000 → 35,000; chips_30000 → 60,000;
high_roller_pack → 120,000. Planned USD prices remain 0.99, 2.99, 4.99, 9.99,
19.99, 29.99 and 49.99 respectively. Server amounts are these totals × 100.

The purchase button is `buyRefillBtn`, the dropdown is `chipDropdown` and the price
is `plannedPrice`. Selection updates `data-iap-buy` to the exact product ID.
“Checkout ready” refers to the compiler mapping, not an activated payment service;
the adjacent status and disabled button explicitly disclose this. RELEASE_READY
remains false. No SDK, compiler or account has been connected by adding an HTML
attribute. At live release, the native localized product price replaces the
planned price and only verified receipts grant balances. Do not grant a second
reward from a compiler's client success event. The high roller reward is fixed,
not random despite the requested marketing label. Confirm the compiler's bridge
contract before release; this project still expects window.NeonRefills version 1.
