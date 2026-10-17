# Runtime and mobile API configuration

`db/context.ts` exports `getDatabaseContext(env?)`. It has no import of `cloudflare:workers`.

- Cloudflare server with a D1 `DB` binding: uses `drizzle-orm/d1` and the existing Drizzle schema.
- Vercel/local server with `DATABASE_URL` and `DATABASE_AUTH_TOKEN`: uses libSQL and the same SQLite schema. The existing `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` pair is also supported. Set one complete pair; the generic pair takes precedence.
- Browser/WebView: returns `{kind:'client', db:null, binding:null, apiUrl}`. It never creates a database connection, even if a DB-shaped object is passed. `NEXT_PUBLIC_API_URL` can be supplied in the context settings. Missing configuration returns a null API URL rather than selecting localhost.

The platform entry modules remain separate: Cloudflare imports its platform binding in `db/runtime.ts`; Next.js resolves that module to `db/runtime-vercel.ts`. A mobile frontend must package the public frontend assets, not `app/api`, `db/runtime.ts`, or server modules. A runtime try/catch cannot fix a bundler trying to resolve a Cloudflare-only import.

## Mobile wrapper

In `public/runtime-config.js`, set `globalThis.NEON_API_BASE_URL` to your hosted game's HTTPS origin (for example `https://your-game.example`). No path or trailing query parameters. The HTML game loads this file before its module scripts. Alternatively, inject that global before loading the game.

The public HTML is served as an asset, so a server's NEXT_PUBLIC_API_URL environment variable is not automatically substituted into it. Set runtime-config.js explicitly for the wrapper. Do not put DATABASE_URL, DATABASE_AUTH_TOKEN, TURSO_AUTH_TOKEN or MOBILE_APP_API_SECRET there. Do not use NEXT_PUBLIC_DATABASE_URL.

On the API server, set `MOBILE_ALLOWED_ORIGINS` to a comma-separated exact list of your actual wrapper origins, e.g. `capacitor://localhost,https://localhost` only if those are your wrapper's configured origins. Table, social and refill routes support OPTIONS preflight and allow Authorization and Content-Type for those exact origins. Wildcard and opaque `null` origins are rejected. Use a stable wrapper origin; arbitrary file:// loading is not supported. Google AdMob callbacks and trusted-server reward relays do not use this mobile CORS mechanism.

Hosted browser play still defaults to same-origin. Bearer authentication, reward verification and server-side chip validation remain required. CORS does not replace authentication.

## Explicit local development

A local HTTP libSQL server is allowed only when DATABASE_URL is explicitly an HTTP loopback URL and NODE_ENV=development. No localhost URL is assumed. Deployed HTTPS/libsql databases require their server-only token. Local database files are not supported by the portable HTTP driver. Missing/invalid bindings or credentials produce controlled database errors rather than silently starting a second, empty balance database.

The public API URL can use HTTP loopback for a deliberate local development wrapper setup. On a phone, 127.0.0.1 means the phone, not your desktop computer. Use your HTTPS hosted service for normal mobile play.
