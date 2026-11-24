# ADR-004: Hosting

[English](ADR-004-hosting.md) · [Português](../pt-BR/decisions/ADR-004-hosting.md)

Status: accepted (2026-11-23). Built in CP10 (below). The region, VM size and domain are the owner's choice at deploy time and are recorded in the runbook.
Date: 2026-11-23

## Context

The product owner planned to deploy on Netlify. The stack of ADR-001 is a Vue frontend and a Laravel API with PostgreSQL, plus a scheduled purge of opened or expired howlers and, from CP8, the voice generation on the server (ADR-002).

Netlify does not run PHP, so the Laravel backend cannot live there. A Netlify community answer states Laravel is not supported, and the only workaround is to export a static copy, which does not fit an API with a database ([Laracasts thread](https://laracasts.com/discuss/channels/servers/deploying-a-dynamic-laravel-site-to-static-hosting-eg-nownetlify)). Netlify does host static sites well. Its functions are JavaScript, TypeScript or Go only, with a 10 second limit for synchronous ones and 15 minutes for background ones ([docs](https://docs.netlify.com/build/functions/api)). Its Postgres, Netlify DB (built on Neon), stopped accepting new databases in the beta on 2026-04-13 ([Neon](https://neon.com/blog/netlify-db-powered-by-neon)).

## Decision

**One Google Cloud Compute Engine VM runs everything, with Docker Compose:**
- **Caddy** terminates https (automatic certificates), serves the built frontend and reverse proxies `/api` to Laravel. One origin: no CORS between the site and the API.
- **Laravel** (PHP-FPM) with the single-use open endpoint, the voice generation and the scheduler. `OPENAI_API_KEY` and the other secrets are environment variables on the server, never in the repository.
- **PostgreSQL** in a container with a volume.
- **Scheduler:** the Laravel scheduler runs the purge of opened and expired howlers (ADR-003).
- **Deploy:** a GitHub Actions workflow builds the images and updates the VM over SSH. Rollback is the previous image tag (CP10).

Region, VM size, domain (a subdomain of the portfolio is the plan's option), budget alerts and a daily Postgres dump are decided at CP10.

## Why

- Laravel and PostgreSQL are the chosen stack (ADR-001) and need a real server; Netlify cannot run them.
- A single host and a single origin remove a whole class of problems (CORS, cross-site cookies, two deploys to keep in step).
- The Docker Compose set-up is already in the plan (CP10) and is the same one used locally.
- **The data is ephemeral by design:** a howler expires in 7 days and is deleted once opened. The usual worst case of a single VM (losing data) costs at most a few unopened howlers, so backups are low stakes.

## How it is built (CP10)

| Piece | What it is |
|-------|-----------|
| `web` | Caddy. Gets and renews the https certificate, serves the built frontend, sends `/api` and `/up` to the app by FastCGI. Only it publishes ports (80 and 443). Sets the security headers and the Content-Security-Policy |
| `app` | The Laravel API on PHP-FPM, no development tools. Settings come from the `.env` file on the server, so nothing secret is in the image |
| `scheduler` | The same image running `schedule:work`: the hourly purge of ADR-003 |
| `db` | PostgreSQL 17 with a volume. Not published to the host |

Decisions inside that:

- **One origin, so no CORS.** The site and the API are served from the same address. CORS stays closed (no foreign origin is allowed unless `CORS_ALLOWED_ORIGINS` says so).
- **The client address comes from FastCGI.** Caddy gives PHP the real address of the visitor as the connection address, so the per-IP limits work and no proxy list (`TRUSTED_PROXIES`) is needed. FPM is never published, so nobody can pretend to be Caddy.
- **FPM has 8 workers on today's VM (an e2-micro, 1 GB), about 20 on a 4 GB one.** Creating a howler holds a worker while the voice is made (seconds). The per-IP limits bound how many can be slow at once, and the pool leaves room for the cheap requests (state, open) to keep flowing. The number is in `docker/php-fpm.prod.conf`.
- **Images are built once and promoted:** `howler-app` and `howler-web`, tagged with the commit, in GitHub's container registry. The server never builds anything. What runs in production is exactly what was built and tested.
- **Deploy is one script** (`deploy/deploy.sh <tag>`): pull, migrate, start, check `/up`. If the new version is not healthy within about a minute it puts the previous tag back by itself. `deploy/rollback.sh` does the same by hand.
- **Migrations are not undone by a rollback.** They must be written so the previous version still works on the new schema: add first, stop using the old thing in a later release, remove it in a later one again.
- **A daily dump** (`deploy/backup.sh`, kept 7 days) is for a bad migration or a mistake, not for archival: the data is short-lived by design.
- **Environment-specific values** (domain, region, VM size, spend alerts) are the owner's and live in the runbook, not in the code.

Image size is not tuned yet (the app image carries the build tools for its extensions). It is a candidate for later, after the phases are done.

## Alternatives considered

- **Netlify for the frontend and the VM or Cloud Run for the backend:** works, but adds a second platform, CORS and two deploys for a small gain (deploy previews per pull request).
- **Everything on Netlify, with the backend rewritten as TypeScript functions and Neon Postgres:** no server to run, but it drops Laravel (replaces ADR-001), is squeezed by the 10 second synchronous limit, and depends on a database product that is changing.
- **Cloud Run with a managed Postgres:** less server upkeep, scales to zero, but needs a managed database and its cost depends on current prices. A possible later move if running the VM becomes a burden.

## Consequences

- **The owner runs the server:** OS security updates (unattended upgrades), a firewall that only opens 80 and 443 plus SSH with keys, and an uptime check. It is a single point of failure, which is acceptable here.
- No automatic deploy preview per pull request. The rehearsal before a release is the local production stack (the same images, with `deploy/smoke.sh` run against it) and the end-to-end job in CI.
- The online preview pending in issue #6 became the first deploy of CP10 on the real VM, with the real voice and the real backend, instead of a static host.
- Prices and free-tier limits of the VM are checked at CP10, not assumed here.

## Update (CP11): production on the same VM, and releases by approval

- **There is no online staging.** Production runs on the VM that CP10 prepared, at the domain that served the first deploy. A second online environment would need a second VM, and a 1 GB machine cannot hold two stacks. The cost of the choice is that the first sight of a change on the real server is the release itself, which is why the release has so many guards below.
- **A release is manual and needs an approval.** Merging to `main` only builds and tests. The `Deploy production` workflow is started by hand, runs only from `main`, waits for the owner to approve the `production` environment, and requires a green CI for the commit it builds.
- **Guards around the deploy:** a database dump before anything changes; the health check with automatic rollback; and the smoke test (`deploy/smoke.sh`), which lives a howler's whole life against the real site, including an expiry and the purge, and puts the previous version back if it fails.
- **Rolling back** is the same workflow with an older tag (no build), or `rollback.sh` on the server.
- **Size.** The e2-micro is enough to run, with swap, and thin for a launch. The runbook says when and how to move to a bigger machine (stop, change the machine type, start; the address and the disk stay).
