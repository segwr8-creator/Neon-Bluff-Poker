# AdMob reward verification

GET /api/rewards/admob remains the Google AdMob server-side verification callback. Configure its exact HTTPS URL in AdMob. It validates Google's ECDSA signature, ad unit, reward item/amount, profile and server-issued refill intent. The reward is always 50 Stack Dollars (5,000 internal cents). The ledger has unique transaction and intent identifiers; an atomic grant prevents repeated delivery or parallel callbacks from crediting twice.

The native SDK must set user_id to the account ID and custom_data to the server-created ad refill intent. A client reward-completed notification is not proof of an ad reward. Existing release readiness gates remain disabled until the Android integration and provider validation are complete.

## Optional trusted-server POST relay

Use only if a trusted backend needs to forward Google's original signed callback. Direct Google GET callbacks do not need this relay.

Set MOBILE_APP_API_SECRET as a secret binding in Cloudflare or as a server-only Vercel environment variable. Generate at least 32 random bytes (for example `openssl rand -hex 32`). There is no fallback secret. Never put it in the APK, JavaScript bundle, repository or NEXT_PUBLIC_ variables.

Send application/json containing:

- userId: account ID (64 lowercase hexadecimal characters).
- rewardAmount: the number 50 (Stack Dollars, not cents).
- timestamp: integer Unix epoch milliseconds when the relay sends the request.
- callbackQuery: Google's exact raw query string, without a leading question mark. Preserve its ordering and encoding, including Google's signature and key_id. Do not parse/re-serialize it.
- signature: hex HMAC-SHA256 using MOBILE_APP_API_SECRET over the UTF-8 string `userId:rewardAmount:timestamp:queryHash`, where queryHash is the lowercase hex SHA-256 of callbackQuery.

The POST timestamp must be within 30 seconds of server time. The HMAC binds the full callback and uses Web Crypto verification. The original Google signature is still checked after HMAC validation. Thus possession of a mobile/relay request alone cannot manufacture an ad reward. Do not append the secret to the signed message; it is the HMAC key.

A 30-second window does not prevent replay within that window: the database ledger supplies durable replay protection. Authenticated duplicate deliveries return success without another credit. A retry may refresh the relay timestamp and HMAC, but must retain the original Google transaction and intent. Delayed Google callbacks are accepted if their signed event time fits the original intent; they are not wrongly rejected merely because delivery took over 30 seconds.

Responses: 400 malformed event, 401 invalid signature, 403 expired relay or recipient/session mismatch, 409 conflicting reward claim, 413 oversized POST, 415 non-JSON POST, 503 disabled/unconfigured service or transient storage/verifier failure. No success is returned before a durable grant. No provider or database secrets are returned in errors.
