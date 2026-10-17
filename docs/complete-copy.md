# NEON BLUFF complete source copy

The ZIP includes game source, card/room art, audio, backend routes, poker engines,
database schema and migrations, dependency lockfile, checks and setup documents.
It excludes installed dependencies, compiled caches, Git history, runtime secrets
and live player/database records. It is a source backup, not an account-data export.

The browser game requires a hosted backend and Cloudflare D1 database, including
computer play and bank persistence. Opening game.html as a local file is not a
complete installation. Use Node 22.13 or newer and the pnpm version in package.json,
install the locked dependencies, configure a fresh Worker/D1 deployment, apply the
drizzle migrations in order and build with the project scripts. Read README.md and
the hosting/build configuration before deploying. Configure your own database and
site identity; the ZIP's hosting manifest omits the original project identity.
Historical courtesy-credit migrations affect only their original profile IDs.

For the existing hosted game, use its normal website link. Do not share browser
player tokens or clone the live database to transfer a game account. All players
connect to the same site's API and D1 database; no server address selector is needed.
Independent deployments have independent accounts and rooms, not federated servers.

Live invite flow: Play live → Create table → Copy invite link. The recipient opens
the link → Join table → confirms their buy-in → enters the lobby. At least two
human players are required. A host starts the first hand; subsequent hands start
automatically. A recipient must also satisfy the site's visitor access policy.

Payment and ad integrations are not live. See browser-ads-setup.md and
monetization-launch.md for completed code and remaining account/release requirements.
Keep music attribution/license notices with any redistributed copy.
