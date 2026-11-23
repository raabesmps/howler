# Deploy and rollback runbook

[English](DEPLOYMENT.md) · [Português](pt-BR/DEPLOY.md)

How Howler is put on a server, updated and rolled back. The design is in [ADR-004](decisions/ADR-004-hosting.md) (one Google Cloud VM running Docker Compose) and [ADR-005](decisions/ADR-005-error-monitoring.md) (error monitoring and privacy). This guide is the steps.

**Who does what.** The code, the images and the deploy script are in the repository and are tested. Creating the VM, DNS, the GitHub settings, Sentry and the spend alerts are the owner's, because they need the owner's accounts and money. Nothing in the repository touches Google Cloud or deploys anything until the owner turns the workflow on.

## What runs where

```
 visitor ──https──▶ Caddy (web) ──/api, /up──▶ Laravel PHP-FPM (app) ──▶ PostgreSQL (db)
                       │                                   ▲
                       └── the built site (static)         └── scheduler (hourly purge)
```

All four are containers of `docker-compose.prod.yml`, started by `deploy/deploy.sh`. Only Caddy publishes ports (80, 443). The database and PHP-FPM are reachable only inside the Docker network. The settings are in `/opt/howler/.env` on the server, never in the repository.

## 1. Decide

| Decision | Suggestion | Why |
|----------|-----------|-----|
| Region | `southamerica-east1` (São Paulo) if most visitors are in Brazil | Latency. It costs a little more than US regions: check the current price |
| VM size | A small general-purpose VM with 2 vCPU and 2 to 4 GB of RAM, 20 GB disk | Caddy, PHP-FPM (20 workers), PostgreSQL and the scheduler fit. The voice is made by OpenAI, not on the VM |
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
| Secret | `STAGING_SSH_KEY` | the content of the private file `howler-deploy` |
| Secret | `STAGING_SSH_KNOWN_HOSTS` | the line printed by `ssh-keyscan` |
| Variable | `STAGING_SSH_HOST` | the VM's IP or domain |
| Variable | `STAGING_SSH_USER` | `deploy` |
| Variable | `STAGING_DOMAIN` | `howler.example.com` |
| Variable | `STAGING_ENABLED` | `true` (this turns the deploy on) |
| Variable (optional) | `SENTRY_FRONTEND_DSN` | the page's Sentry DSN (section 7) |

The workflow ([deploy-staging.yml](../.github/workflows/deploy-staging.yml)) uses the `staging` environment: in **Settings → Environments → staging** you can add required reviewers if you want a click of approval before every deploy.

## 5. Deploy

**The first time:** Actions → **Deploy staging** → **Run workflow** (leave the tag empty). It builds the two images, copies the compose file and the scripts to the VM, logs the VM in to the registry with a short-lived token, runs `deploy.sh` (pull, migrate, start, health check) and finally checks `https://<domain>/up` from outside.

**Afterwards:** every merge to `main` deploys by itself. The workflow turns red if the new version is not healthy.

Check it: `https://<domain>/up` answers 200, then open the site on your phone and send a howler to yourself.

## 6. Roll back

Three ways, from the least to the most manual.

1. **Automatic.** If a new version is not healthy within about a minute, `deploy.sh` puts the previous tag back by itself and the workflow fails. You do nothing.
2. **On the server:** `cd /opt/howler && ./rollback.sh`. It goes back to the version recorded in `.previous_tag`. The previous images are still on the machine, so no login is needed.
3. **Any older version:** Actions → Deploy staging → Run workflow, with the **tag** of a known-good version (the tags are the first 12 characters of a commit hash, listed in the repository's Packages). No build happens: the images already exist.

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

## 10. What was checked, and what is left for the first deploy

Checked on this machine with the real production images (the same Dockerfiles and compose file): a first deploy, the whole flow over https (create, state, open, open again gives 410), the security headers and the Content-Security-Policy, that only Caddy publishes ports and the database does not, that the app runs as an unprivileged user with debug off, a second deploy, **a deliberately broken version rolling back by itself**, the manual rollback, the backup, and the 8 KB request limit. The deploy workflow passes `actionlint` and the scripts pass `shellcheck`.

**Left for the first real deploy** (it needs the VM, the domain and the GitHub settings): the certificate being issued for the real domain, the SSH and registry steps of the workflow, the uptime check, the Sentry test with a real project, and a pass on the phone. Treat the first deploy as the validation of this runbook and write down anything that differs.

## Troubleshooting

| What you see | Probably | What to do |
|--------------|----------|-----------|
| The workflow is skipped | `STAGING_ENABLED` is not `true` | Set the variable |
| `Permission denied (publickey)` | The deploy key is not in `authorized_keys`, or the wrong secret | Check section 4 |
| `Host key verification failed` | `STAGING_SSH_KNOWN_HOSTS` is missing or for another host | Run `ssh-keyscan` again |
| The rate limits do not seem to work, or every visitor looks like the same address | The DNS record is proxied by Cloudflare | Set it to "DNS only" (section 2) |
| The site shows a certificate error for a minute | Caddy is still getting the certificate | Wait; check DNS points at the IP and ports 80 and 443 are open |
| `deploy.sh` says unhealthy and rolls back | The new version does not start | `docker compose -f docker-compose.prod.yml logs --tail 50 app web` |
| `502` on `/api` | The app container is down or restarting | `docker compose -f docker-compose.prod.yml ps`, then its logs |
| Howlers have no server voice | No key, the daily limit was reached, or OpenAI refused | The create answer says `"voice": false`; the reason is in the app log (never the message) |
| Disk full | Old images or logs | `docker image prune -a`, check `/opt/howler/backups` |
