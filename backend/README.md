# Howler backend

[English](README.md) · [Português](README.pt-BR.md)

Laravel 13 API with PostgreSQL. It stores the howlers, opens each one exactly once and deletes what it no longer needs. Built in CP6 (data model) and CP7 (the API); see `docs/project/PLAN.md` and the contract in [docs/api/](../docs/api/README.md).

Everything runs in containers, the same shape as on the server (ADR-004), so you do not need PHP, Composer or PostgreSQL installed.

## Run it

From the repository root, where Docker runs:

```
scripts/dev-up.sh                                              # start PostgreSQL and wait until it is ready
docker compose run --rm backend php artisan migrate:fresh --seed
docker compose run --rm backend php artisan test
docker compose up -d backend                                   # the API at http://localhost:8000
```

Configuration is in `backend/.env` (copy `backend/.env.example`, it is git-ignored). The database credentials in the example are for local development only.

### On Windows

Docker runs inside WSL (Ubuntu), not Docker Desktop. From PowerShell or Git Bash:

```
wsl -d Ubuntu -u root -- bash /mnt/c/<path-to-the-repo>/scripts/dev-up.sh
wsl -d Ubuntu -u root -- bash -c "cd /mnt/c/<path-to-the-repo> && docker compose run --rm backend php artisan test"
```

In Git Bash, prefix the command with `MSYS_NO_PATHCONV=1`, otherwise it rewrites the `/mnt/c/...` path.

WSL shuts itself down a minute after the last terminal closes, and the database goes with it. To keep it running, leave this hidden process open:

```
Start-Process wsl.exe -ArgumentList '-d','Ubuntu','-u','root','--exec','sleep','infinity' -WindowStyle Hidden
```

It has to be started again after a reboot.

## Tests

The tests run on a real PostgreSQL (the `howler_test` database, created with the first start of the container), not on SQLite: row locks and ULIDs behave differently, and the single-use opening of CP7 depends on them.

## Configuration worth knowing

- `OPENAI_API_KEY`: the voice. With docker compose it comes from the git-ignored `.env.local` at the repository root. Without it howlers are created without a server voice.
- `HOWLER_VOICE_DAILY_LIMIT` (default 300): at most this many server voices a day for everybody, as a safety net for the bill.
- `TRUSTED_PROXIES`: comma-separated proxy addresses whose `X-Forwarded-For` is believed. Leave it empty locally. Behind the reverse proxy (CP10) it must be set, or every visitor shares the proxy's IP and the per-IP limits break.
- The server must run `php artisan schedule:run` every minute (cron) for the purge to happen (CP10).

## What is where

| Path | What it is |
|------|-----------|
| `app/Models/Howler.php` | The howler model and its states (CP6) |
| `app/Http/Controllers/HowlerController.php`, `routes/api.php` | The four endpoints (CP7) |
| `app/Services/VoiceGenerator.php` | The voice: model, tone, the words check (ADR-002) |
| `app/Actions/CreateHowler.php` | Creates the howler and its voice |
| `app/Actions/OpenHowler.php` | The single-use opening: transaction plus row lock |
| `app/Console/Commands/PurgeHowlers.php` | The hourly retention job (`php artisan howlers:purge`) |
| `database/migrations/` | The tables |
| `database/factories`, `database/seeders` | Test and development data |
| `tests/` | PHPUnit tests |
| `../docker-compose.yml`, `../docker/` | PostgreSQL and the PHP image used for development |
