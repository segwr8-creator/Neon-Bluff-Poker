# Vercel deployment

The project supports two build targets. Sites uses Vinext/Cloudflare (`pnpm build`); Vercel uses actual Next.js (`pnpm build:vercel`). Vinext produces `dist`, which does not contain Next.js's `.next/routes-manifest.json`. Do not use the Sites build command for a Next.js deployment on Vercel.

1. Import this complete source project. Set Root Directory to the folder containing package.json, framework to Next.js, Node.js to 22.x, build command to `pnpm run build:vercel`, and Output Directory to `.next` (or restore the Next.js default). The included vercel.json sets the build/output values. Do not select static export or `public` as the output folder. API routes remain active.
2. Create a remote libSQL database (for example Turso). Add server-only `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the Vercel environment for each desired deployment environment. Never prefix these with NEXT_PUBLIC_. No credentials are included in this project.
3. With those same variables available in a trusted local/CI environment, run `pnpm db:migrate:vercel` once before serving traffic. The Drizzle migrator records applied migrations. Back up an existing database before migration. Do not run migrations on every player request.
4. Redeploy. Missing database configuration returns an unavailable response; it never falls back to a transient serverless file or in-memory wallet.

Existing Sites player balances are in its separate D1 database. They are NOT automatically copied to Turso. Moving existing players requires an authorized database export/import and retained browser identity; a different website origin also has separate browser storage. Do not run both deployments against independent balances and assume they synchronize.

## API contract

`app/page.tsx` redirects into the existing game UI at `public/index.html`, preserving room invite codes. Its action buttons already POST to `/api/table`; polling GETs the same route. No Socket.IO server or placeholder onrender.com URL is required.

- `POST {op:"profile",name}` creates/restores a profile and returns its bearer token. Persist the token privately in the player's browser and send `Authorization: Bearer <token>` for authenticated operations.
- GET `?op=list` / `?op=inspect&code=...`: public lobby metadata only.
- GET `?op=profile` / `?op=poll&code=...`: authenticated profile or redacted room state.
- POST `create`, `join`, `start`, `next`, `action`, `leave`: authenticated mutations. Existing clients supply the room code, version, and actionStamp returned by the server.
- An action body includes `op:"action",code,version,actionStamp,requestId,action,amount`. requestId is a fresh UUID per choice, reused on retry. Numeric values are integer hundredths of a Stack Dollar. Raise amount follows the existing engine's increment contract; use its returned legal limits, not an independently guessed total.

The server owns the shuffle, private cards, action order, deficit-to-call, legal raises, side pots, winners and payouts. It never trusts client balances or result claims. Schema-backed buy-in debits and return credits are committed in the same atomic write batch as the guarded room change. Table stacks live in the room payload; the bank is debited on seating and credited only on exit/expiry. This avoids double-crediting winnings that remain on the table.

Bot deadlines are randomly 1–3 seconds and persisted in the room. Polling advances due decisions; no background setTimeout is required after a serverless response. With the current 1-second polling interval, display latency may add up to roughly one second. If nobody polls, due actions resume on the next request.

Bearer profiles are browser identities, not a full recoverable account/login system. Keep real purchases disabled until account recovery and the existing monetization release requirements are satisfied.
