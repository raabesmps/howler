# ADR-004: Hosting

[English](ADR-004-hosting.md) · [Português](../pt-BR/decisions/ADR-004-hosting.md)

Status: accepted as a direction (2026-11-23). The VM size, region, domain and prices are checked and fixed at CP10.
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

## Alternatives considered

- **Netlify for the frontend and the VM or Cloud Run for the backend:** works, but adds a second platform, CORS and two deploys for a small gain (deploy previews per pull request).
- **Everything on Netlify, with the backend rewritten as TypeScript functions and Neon Postgres:** no server to run, but it drops Laravel (replaces ADR-001), is squeezed by the 10 second synchronous limit, and depends on a database product that is changing.
- **Cloud Run with a managed Postgres:** less server upkeep, scales to zero, but needs a managed database and its cost depends on current prices. A possible later move if running the VM becomes a burden.

## Consequences

- **The owner runs the server:** OS security updates (unattended upgrades), a firewall that only opens 80 and 443 plus SSH with keys, and an uptime check. It is a single point of failure, which is acceptable here.
- No automatic deploy preview per pull request. Staging is the same Compose set-up on the VM (or a second project on it) and the local environment.
- The online preview pending in issue #6 becomes the staging deploy of CP10, with the real voice and the real backend, instead of a static host.
- Prices and free-tier limits of the VM are checked at CP10, not assumed here.
