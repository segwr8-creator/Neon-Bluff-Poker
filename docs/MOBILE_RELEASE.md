# Neon Bluff mobile build update

Prepared for Keldon • winspoker3@gmail.com • U.S. store launch planned.
Live API: https://neon-bluff-poker.segwr8.workers.dev
Proposed application identifier: com.keldon.neonbluff. Confirm it matches any existing Play/App Store app before the first store upload.

## What is included
- Capacitor 8.5.3 pinned packages and a complete npm dependency lockfile in mobile/.
- Locally bundled game assets; remote Cloudflare API; existing safe-area stylesheet retained.
- Landscape native settings (large-screen operating systems can override orientation constraints).
- Correct hosted invite links instead of localhost invites.
- Exact mobile origins declared in the Cloudflare build configuration.
- Release WebView debugging and Capacitor logging disabled; Android backup disabled for guest credentials.
- Push-to-main GitHub Actions: production web build, gift security tests, Android debug APK and unsigned release AAB, iOS source and unsigned simulator build.
- Server-enforced SD 25 per-gift cap and SD 50 sent / SD 50 received per UTC day across all friends; no tax. Accept-time accounting and atomic wallet writes prevent parallel acceptance and replay from bypassing the limits.
- Existing friendship approval, sender balance, gift-lock, expiration, and request-rate checks retained.

## Apply to the existing repository
Use the included apply-update.py from the extracted update directory. It must be invoked from the repository root (the folder containing package.json). It verifies old file hashes and stops rather than overwrite unexpected edits. It makes a backup outside the repository, copies only changed files, adds ignore rules, and updates the database ID/mobile origins in vite.config.ts. It never commits, pushes, deploys, or changes the live database.

1. Upload NEON_BLUFF_Mobile_Update.zip to Codespaces.
2. From the repository root terminal: `unzip -q NEON_BLUFF_Mobile_Update.zip`.
3. Run: `python3 NEON_BLUFF_Mobile_Update/apply-update.py`.
4. BEFORE pushing, execute drizzle/0007_gift_daily_limits.sql ONCE in the Cloudflare Console for neon-bluff-db. A ready-to-paste copy is included as DATABASE_UPDATE.sql. On a repeat run check `PRAGMA table_info(gifts);` first: do not add accepted_at twice. No balances are changed by this migration. Existing accepted gifts conservatively count against today's allowance because their original acceptance times were not stored.
5. Commit the files listed by `git status --short` and push to main. Ignore rules exclude the uploaded archive, temporary update folder, native output and dependencies. Cloudflare redeploys and GitHub Actions → Mobile build runs automatically. A fresh push is required; retrying an old build can use old code.
6. Download artifacts from the successful Mobile build run.

Do not reapply all earlier migrations to the manually initialized production database. Only 0007 is needed for this update. The SQL migration is intentionally not run against production from an uncredentialed CI job.

## What each artifact means
- app-debug.apk: debug-signed, for direct Android device installation; not a Play release. The debug key can change between CI runs.
- app-release.aab: unsigned; requires your existing upload key (or a newly registered upload key for a new app) before Google Play accepts it. Never generate a replacement key for an already published app casually.
- ios-project.zip: generated native project and assets. Run npm ci, then npx cap sync ios in its extracted directory before opening Xcode. Requires Xcode 26+, developer team and signing configuration for device/archive builds.
- ios-simulator.zip: .app for an iOS simulator, NOT an IPA and not installable on an iPhone or TestFlight.
GitHub artifacts expire after 14 days; keep release artifacts separately. CI never prints secrets or supplies signing keys. App icons/screenshots and store metadata remain launch work.

## Payments and advertising remain disabled
This stage does NOT install an IAP/AdMob SDK, add Apple receipt verification, or enable checkout. Existing RELEASE_READY=false remains unchanged. Native store confirmation alone is not enough: only a server-verified, account-bound, idempotent transaction may credit the server wallet. The UI must refresh the authoritative balance afterward. Never add Stack Dollars locally based on a client callback.

Before paid launch: recoverable user accounts, product setup with localized prices, sandbox purchase tests, secure pending-transaction persistence/recovery, Apple server verification, refunds/voided-purchase reconciliation, ad consent and verified AdMob callbacks must all be completed. Do not paste credentials into chat or client assets. Existing guest accounts are not a cross-device login or purchase recovery system. An installed app has separate local guest storage from the website.

Transfer limits reduce casual resale but do not prevent multi-account abuse, off-platform trading, or chip dumping through gameplay. Existing fair-play flags remain review signals, not proof or an automatic ban system.

## Validation actually completed
See docs/MOBILE_VALIDATION.md. Native binary compilation and real-device behavior must be checked by the CI runs/device testing; no APK, AAB, signed IPA, store submission, live rollout, or account configuration is claimed by this source update.
