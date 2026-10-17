# Connecting rewarded ads

Status: prepared code only. The live Watch ad button remains disabled. No ad
account, approved inventory, consent platform, or production ad unit is connected.

## Browser: Google Ad Manager

1. Obtain a Google Ad Manager publisher account and approval for this game and
   its actual reward economy. Create a rewarded web ad unit and traffic demand
   to it. Supply the ad unit path `/NETWORK_ID/AD_UNIT_NAME`, not a Google Ads
   advertiser campaign ID or a native AdMob unit ID.
2. Implement the required privacy/consent flow for the launch regions. Only call
   the adapter after this flow and an explicit player Watch ad click, outside
   any table. Never require ads to leave a screen or resume ordinary navigation.
3. `public/rewarded-web.mjs` implements the official GPT ready/granted/closed
   events, no-fill, unsupported-device, duplicate-request and loading-timeout
   handling. It loads no third-party script until explicitly invoked.
4. Resolve the reward design before connecting this adapter to the live wallet.
   Google requires non-transferable rewards. Existing Stack Dollars can move
   between players through pots, even if friend gifting is locked. Use a separate
   non-transferable solo reward balance or obtain an appropriate provider-approved
   design. This update does not silently change the multiplayer economy.
5. Google explicitly states that server-side verification is unavailable for web
   rewarded ads. `completed: true, verified: false` from the adapter is unsigned
   browser state. Do NOT send it to an endpoint that grants multiplayer currency.
   A provider with signed server callbacks or a separately secured solo reward
   design is needed before enabling the live reward flow.

The adapter is intentionally not imported by game.html yet. There is no fake
ad, local balance grant, test inventory, or arbitrary client credit endpoint.

## Android: AdMob

The existing `/api/rewards/admob` endpoint verifies Google's signed callbacks and
credits exactly 50 Stack Dollars once per valid intent/transaction. The native
SDK/consent/bridge implementation and provider review are still required. Configure
the callback URL to the deployed game's `/api/rewards/admob` route, configure reward
amount 50 and internal reward item `fictional_dollars`, and pass the authenticated
server account and intent as SSV userId/customData. See monetization-launch.md.
The callback must be accessible by Google without interactive site sign-in;
changing the live site's audience is a separate owner decision. Do not give Google
an owner cookie, guest token or site-access credential.

## References checked October 9, 2026

- https://developers.google.com/publisher-tag/samples/display-rewarded-ad
- https://support.google.com/admanager/answer/9116812?hl=en
- https://support.google.com/admanager/answer/7496282?hl=en
- https://developers.google.com/admob/android/ssv
