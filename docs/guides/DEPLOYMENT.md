# Deploy and rollback runbook

[English](DEPLOYMENT.md) · [Português](../pt-BR/guides/DEPLOYMENT.md)

How Howler is put on a server, updated and rolled back. The design is in [ADR-004](../decisions/ADR-004-hosting.md) (one Google Cloud VM running Docker Compose) and [ADR-005](../decisions/ADR-005-error-monitoring.md) (error monitoring and privacy). This guide is the steps.

**Who does what.** The code, the images and the deploy script are in the repository and are tested. Creating the VM, DNS, the GitHub settings, Sentry and the spend alerts are the owner's, because they need the owner's accounts and money. Nothing in the repository touches Google Cloud, and nothing is deployed until the owner runs the production workflow and approves it.

## What runs where

```
 visitor ──https──▶ Caddy (web) ──/api, /up──▶ Laravel PHP-FPM (app) ──▶ PostgreSQL (db)
                       │                                   ▲
                       └── the built site (static)         └── scheduler (hourly purge)
```

All four are containers of `deploy/docker-compose.prod.yml`, started by `deploy/deploy.sh`. Only Caddy publishes ports (80, 443). The database and PHP-FPM are reachable only inside the Docker network. The settings are in `/opt/howler/.env` on the server, never in the repository.

## 1. Decide

| Decision | Suggestion | Why |
|----------|-----------|-----|
| Region | `southamerica-east1` (São Paulo) if most visitors are in Brazil | Latency. It costs a little more than US regions: check the current price |
| VM size | The VM that runs today is an e2-micro (1 GB): it works with the 2 GB swap the setup script adds, and PHP-FPM is sized for it (8 workers). Before a launch with real traffic, move to 2 vCPU and 2 to 4 GB of RAM (change the machine type: a few minutes of downtime) and raise `pm.max_children` to about 20 | Caddy, PHP-FPM, PostgreSQL and the scheduler fit. The voice is made by OpenAI, not on the VM |
| Domain | A subdomain, for example `howler.<your-domain>` | Caddy gets and renews the https certificate for it by itself |
| OpenAI limit | The monthly spend limit you already set, plus `HOWLER_VOICE_DAILY_LIMIT` | The cost per howler is about 1.5 US cents (ADR-002) |

Check the current Google Cloud prices and free-tier limits on the official pricing page before choosing: they are not assumed here.

## 2. Create and prepare the VM

Create the VM in the Google Cloud console (or with `gcloud`) with these properties:

- Debian 12 or Ubuntu 24.04 LTS (any release with Docker's own packages; very new releases may lack them).
- A **static external IP** (so the DNS record never has to change).
- Firewall rules: allow TCP 80, TCP and UDP 443 from anywhere, and TCP 22 only from your own address if you can.

**Shortcut:** `deploy/server-setup.sh` does everything in the list below except the firewall and the SSH settings: `sudo bash server-setup.sh "<the public half of the deploy key>"` (copy the file to the VM first; read it before running it, it is short). To do it by hand instead, as root or with sudo:

```
# Docker and the Compose plugin (follow docs.docker.com/engine/install for your distribution)
# a user that deploys, in the docker group, with its folder
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -o deploy -g deploy /opt/howler

# the OS updates its own security patches
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# keep container logs from filling the disk
cat > /etc/docker/daemon.json <<'JSON'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
JSON
systemctl restart docker

# SSH: keys only, no passwords, no root login (edit /etc/ssh/sshd_config, then restart ssh)
#   PasswordAuthentication no
#   PermitRootLogin no
```

On a 2 GB machine, add a 2 GB swap file so a spike does not kill a container.

Point the DNS record of your domain (an **A record**) at the VM's static IP.

**If the DNS is on Cloudflare, set the record to "DNS only" (the grey cloud), not "Proxied".** With the proxy on, the visitor's address that Laravel sees is Cloudflare's, so every visitor would share a few addresses and the per-IP rate limits (and their protection of the OpenAI bill) would stop working; it can also get in the way of the certificate. Keeping the proxy would need extra code to trust Cloudflare's address header: not done.

## 3. The server settings

On the VM, as the `deploy` user, in `/opt/howler`:

```
cp env.production.example .env      # the file is in the repository: deploy/env.production.example
chmod 600 .env
```

(The first time, the file is not on the server yet: copy it by hand, for example with `scp deploy/env.production.example deploy@<ip>:/opt/howler/.env`.) Fill it in:

| Setting | Value |
|---------|-------|
| `APP_URL`, `SITE_ADDRESS` | `https://howler.example.com`, `howler.example.com` |
| `APP_KEY` | `docker run --rm ghcr.io/<owner>/howler-app:<any tag> php artisan key:generate --show` once the first image exists, or any `base64:` 32-byte key (`echo "base64:$(openssl rand -base64 32)"`) |
| `DB_PASSWORD` | `openssl rand -base64 32 \| tr -d '/+='` |
| `OPENAI_API_KEY` | your key (server only). Without it howlers have no server voice and the browser reads them |
| `HOWLER_VOICE_DAILY_LIMIT` | the most server voices per day for everybody |

For a first test **without a domain**, `SITE_ADDRESS=203-0-113-10.sslip.io` (the IP with dashes) also gets a real certificate.

## 4. Connect GitHub

Create a dedicated deploy key (a key used for nothing else):

```
ssh-keygen -t ed25519 -f howler-deploy -C howler-deploy -N ""
# put howler-deploy.pub in /home/deploy/.ssh/authorized_keys on the VM
ssh-keyscan -t ed25519 <the VM address>        # the host key to pin
```

In the repository, **Settings → Secrets and variables → Actions**:

| Kind | Name | Value |
|------|------|-------|
| Secret | `PRODUCTION_SSH_KEY` | the content of the private file `howler-deploy` |
| Secret | `PRODUCTION_SSH_KNOWN_HOSTS` | the line printed by `ssh-keyscan` |
| Variable | `PRODUCTION_SSH_HOST` | the VM's IP or domain |
| Variable | `PRODUCTION_SSH_USER` | `deploy` |
| Variable | `PRODUCTION_DOMAIN` | `howler.example.com` |
| Environment | `production` | with you as the required reviewer and `main` as the only allowed branch (below) |
| Variable (optional) | `SENTRY_FRONTEND_DSN` | the page's Sentry DSN (section 7) |
| Variable (optional) | `PRODUCTION_GTM_ID` | the Google Tag Manager container id (`GTM-...`), loaded on the write screen only ([ADR-006](../decisions/ADR-006-analytics.md)) |

The workflow ([deploy-production.yml](../../.github/workflows/deploy-production.yml)) uses the `production` environment. Create it in **Settings → Environments → New environment → production**, add yourself under **Required reviewers**, and under **Deployment branches** allow only `main`. From then on every deploy waits for your approval and can only run from `main`. Merging to `main` deploys nothing.

## 5. Deploy

**To release:** Actions → **Deploy production** → **Run workflow** on `main` (leave the tag empty). GitHub asks the reviewer to approve; after that the workflow checks that the commit has a green CI, builds the two images, takes a database dump on the VM, copies the compose file and the scripts, logs the VM in to the registry with a short-lived token and runs `deploy.sh` (pull, migrate, start, health check). Then it checks `https://<domain>/up` from outside and runs the smoke test.

**The smoke test** (`deploy/smoke.sh`) lives a howler's whole life against the real site: the page, https and its headers; creating a howler; looking at it (no message leaks); opening it once; the second open refused; the closed doors (an unknown link, a `GET` on open, bad input, an oversized body). Then an expiry: it moves a test howler's expiry into the past in the database, checks that the site reports it expired, runs the purge on the server and checks that the message is gone. If anything fails, the workflow puts the previous version back by itself and turns red. You can run it by hand too: `deploy/smoke.sh https://<domain>` (it creates two ordinary howlers: about 3 US cents of voice).

Check it yourself as well: open the site on your phone and send a howler to yourself.

## 6. Roll back

Three ways, from the least to the most manual.

1. **Automatic.** If a new version is not healthy within about a minute, or the smoke test fails, the previous tag is put back by itself and the workflow fails. You do nothing.
2. **On the server:** `cd /opt/howler && ./rollback.sh`. It goes back to the version recorded in `.previous_tag`. The previous images are still on the machine, so no login is needed.
3. **Any older version:** Actions → Deploy production → Run workflow, with the **tag** of a known-good version (it still waits for the approval) (the tags are the first 12 characters of a commit hash, listed in the repository's Packages). No build happens: the images already exist.

**Migrations are not undone by a rollback.** Write them so the previous version still works on the new schema:
1. release A adds the new column or table (the old code ignores it);
2. release B starts using it and stops using the old one;
3. release C drops the old one.
If a migration cannot follow this, say so in its pull request and plan the rollback (a database dump first: section 8).

## 7. Monitoring, logs, alerts

**Sentry** (optional, the owner's account; read ADR-005 first: tokens and messages must never reach it).
1. Create two Sentry projects: one for PHP/Laravel, one for Vue.
2. Put the Laravel DSN in `/opt/howler/.env` as `SENTRY_LARAVEL_DSN`, and the Vue DSN in the repository variable `SENTRY_FRONTEND_DSN`. Deploy again.
3. Send a test event: on the server `docker compose -f docker-compose.prod.yml exec app php artisan sentry:test`, and throw an error in the page (browser console on the site: `setTimeout(() => { throw new Error('sentry test') })`).
4. **Open both events in Sentry and confirm there is no token, no message, no IP and no cookies.** The scrubber is tested, and this is the check with the real service.

**Logs.** `cd /opt/howler && docker compose -f docker-compose.prod.yml logs --tail 100 app` (or `web`, `scheduler`, `db`). Laravel logs go to the container's stderr. Docker keeps up to 30 MB per container (section 2).

**Uptime.** In Google Cloud: Monitoring → Uptime checks → create one for `https://<domain>/up` every minute, with an email alert.

**Money.** Google Cloud: Billing → Budgets & alerts, with a monthly amount and alerts at 50, 90 and 100 percent. OpenAI: the monthly limit on the account, and `HOWLER_VOICE_DAILY_LIMIT` as the second line.

## 8. Backups

The data is short-lived on purpose (a howler lives 7 days and is deleted once opened), so a backup is for a bad migration or a mistake, not for archival.

```
crontab -e   # as deploy
17 3 * * *  /opt/howler/backup.sh >> /opt/howler/backups/backup.log 2>&1
```

It keeps 7 daily dumps in `/opt/howler/backups`. To restore: `gunzip -c backups/howler-<stamp>.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U howler howler`.

## 9. Secrets

| Secret | Where it lives | To rotate |
|--------|----------------|-----------|
| `OPENAI_API_KEY` | `/opt/howler/.env` only | New key at OpenAI, edit `.env`, `docker compose -f docker-compose.prod.yml up -d` |
| `DB_PASSWORD` | `/opt/howler/.env` and the database | Change both together (`ALTER USER`), then restart |
| `APP_KEY` | `/opt/howler/.env` | Safe to change: nothing is encrypted with it and tokens are stored as SHA-256 hashes (ADR-003) |
| Deploy key | GitHub secret and `authorized_keys` | New key pair, replace both |

None of them is in the repository, in an image or in a log.

## 10. What was checked at the first deploys

The runbook was written before the first deploy and corrected by it. Checked on the real VM: https with a Let's Encrypt certificate and the redirect from http; the security headers and the Content-Security-Policy, with no console errors in a real browser; the whole flow with the real voice; one-time opening; the per-IP limits seeing the visitor's real address; the hourly purge on the scheduler; a daily dump in cron; an automatic redeploy, both rollbacks (on the server, and by deploying an older tag from the workflow) and, locally on the same images, a deliberately broken version rolling back by itself. The first deploy found and fixed three things: the app healthcheck (BusyBox `pgrep -x`), CRLF line endings in secrets saved from PowerShell, and `cron` missing on Ubuntu minimal.

**Still the owner's:** Sentry, with the check that no token or message appears in a real event (section 7), and restricting SSH (port 22) to the owner's address.

## Troubleshooting

| What you see | Probably | What to do |
|--------------|----------|-----------|
| The workflow is skipped, or waits and does nothing | It was not run on `main`, or the reviewer has not approved the `production` environment yet | Run it on `main` and approve it |
| `Permission denied (publickey)` | The deploy key is not in `authorized_keys`, or the wrong secret | Check section 4 |
| `Host key verification failed` or `invalid format` for the key, with secrets that look right | A secret was saved with Windows line endings (CRLF), for example piped from PowerShell | Save it from a file with `gh secret set NAME < file` in Git Bash, or paste it in the GitHub page. The workflow strips the extra characters, but check |
| `Host key verification failed` | `PRODUCTION_SSH_KNOWN_HOSTS` is missing or for another host | Run `ssh-keyscan` again |
| The rate limits do not seem to work, or every visitor looks like the same address | The DNS record is proxied by Cloudflare | Set it to "DNS only" (section 2) |
| The site shows a certificate error for a minute | Caddy is still getting the certificate | Wait; check DNS points at the IP and ports 80 and 443 are open |
| The workflow ends with "the smoke test failed" | A check of `deploy/smoke.sh` failed after the deploy; the previous version was put back | Read the failed line in the log, fix it, release again |
| `deploy.sh` says unhealthy and rolls back | The new version does not start | `docker compose -f docker-compose.prod.yml logs --tail 50 app web` |
| `502` on `/api` | The app container is down or restarting | `docker compose -f docker-compose.prod.yml ps`, then its logs |
| Howlers have no server voice | No key, the daily limit was reached, or OpenAI refused | The create answer says `"voice": false`; the reason is in the app log (never the message) |
| Disk full | Old images or logs | `docker image prune -a`, check `/opt/howler/backups` |
