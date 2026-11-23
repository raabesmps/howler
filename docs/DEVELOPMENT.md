# Development guide

[English](DEVELOPMENT.md) · [Português](pt-BR/DESENVOLVIMENTO.md)

How to run the whole thing on your computer: the database and the API in containers, the frontend with Vite.

## What you need

- **Docker** with Compose. On Windows it runs inside WSL (see [backend/README.md](../backend/README.md#on-windows)).
- **Node.js** (the version in `.github/workflows/ci.yml`) for the frontend.
- An **OpenAI key**, only if you want the real voice. Without it everything works and the browser's plain voice speaks.

## 1. The key (optional)

Create `.env.local` in the repository root (it is git-ignored) with one line:

```
OPENAI_API_KEY=your-key
```

Docker Compose hands it to the PHP container. Only the backend ever sees it. Each howler costs roughly 1.5 US cents of audio (ADR-002). Set a monthly spend limit on the OpenAI account, and keep `HOWLER_VOICE_DAILY_LIMIT` (default 300) at a number you are comfortable paying for.

## 2. Start the backend

From the repository root, where Docker runs:

```
scripts/dev-up.sh                                       # PostgreSQL, ready to accept connections
docker compose run --rm backend php artisan migrate     # create the tables
docker compose up -d backend                            # the API at http://localhost:8000
```

Check it: `curl http://localhost:8000/up` answers 200. The first request after a start takes several seconds (the code is on a mounted Windows folder); the next ones are fast.

On Windows from Git Bash, prefix each Docker command with `MSYS_NO_PATHCONV=1 wsl -d Ubuntu -u root -- bash -c "cd /mnt/c/<path-to-the-repo> && ..."`. WSL shuts down when idle and takes the containers with it: leave the hidden keep-alive process from the backend README running.

## 3. Start the frontend

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server forwards `/api` to the backend, so the browser never talks to anything else.

To see it on your phone, open `http://<your-computer-ip>:5173` on the same Wi-Fi. Sharing and copying are limited on plain http (browsers only enable them on https or localhost); the staging deploy (CP10) is https.

## 4. Try the whole flow

1. Write a message on the paper, press **Seal it**. It takes a few seconds: the server is making the scream.
2. **Share** or **Copy link**. The link is `http://.../#/h/<token>`.
3. Open the link (on your phone, or in a private window: a different "person"), tap the seal. Turn the volume down first.
4. It screams, burns and ends on "already delivered".
5. Open the same link again, on any device: still "already delivered". That is the point.

Or by hand against the API:

```
curl -X POST http://localhost:8000/api/howlers -H 'Content-Type: application/json' -d '{"message":"HOW DARE YOU!"}'
curl -X POST http://localhost:8000/api/howlers/<token>/open     # 200, once
curl -X POST http://localhost:8000/api/howlers/<token>/open     # 410
```

## Working without Docker

`VITE_API=mock npm run dev` keeps everything in the browser (the link carries the message, single use is per device, no server voice). It is only for working on the screens.

## Tests and checks

| What | Command (from the repository root) |
|------|------------------------------------|
| Backend tests (real PostgreSQL) | `docker compose run --rm backend php artisan test` |
| Backend code style | `docker compose run --rm backend ./vendor/bin/pint --test` |
| Frontend tests | `cd frontend && npm test` (on Windows from a path starting with `C:/`) |
| Frontend lint and types | `cd frontend && npm run lint && npm run typecheck` |
| End to end (real browser) | `scripts/e2e-backend.sh`, then `cd e2e && npm test` (see [TESTING.md](TESTING.md)) |

The backend tests never call OpenAI: any request that leaves the app without being faked fails the test, and the real key is blanked for them.

## Configuration

| Variable | Where | What |
|----------|-------|------|
| `OPENAI_API_KEY` | `.env.local` (repository root) | The voice. Backend only |
| `HOWLER_VOICE_DAILY_LIMIT` | `backend/.env` | At most this many server voices a day, for everybody (default 300) |
| `TRUSTED_PROXIES` | `backend/.env` | Proxy addresses to trust for the client IP. Empty locally, required behind the reverse proxy (CP10) |
| `VITE_API_TARGET` | environment of `npm run dev` | Where the dev server forwards `/api` (default `http://localhost:8000`) |
| `VITE_API` | environment of `npm run dev` / `build` | `mock` for the in-browser API |
| `HOWLER_CREATE_PER_MINUTE`, `HOWLER_CREATE_PER_DAY`, `HOWLER_ACCESS_PER_MINUTE`, `HOWLER_REPORT_PER_MINUTE` | `backend/.env` | The per-IP rate limits (defaults 5, 40, 30, 5). Only the end-to-end setup raises them |
| `CORS_ALLOWED_ORIGINS` | `backend/.env` | Other origins allowed to call the API. Empty by default (one origin) |
| `SENTRY_LARAVEL_DSN`, `VITE_SENTRY_DSN` | server `.env`, build | Error monitoring. Empty means off (see [DEPLOYMENT.md](DEPLOYMENT.md), ADR-005) |
| `VITE_SITE_URL` | environment of `npm run build` | The public URL, for the link-preview tags |

## When something goes wrong

- **`/api` answers with the web page instead of JSON, or 500:** the backend is not running or not ready yet. Run the `curl http://localhost:8000/up` check.
- **The howler has no server voice (`"voice": false` in the create response):** no key, the daily limit was reached, or the model did not speak the line exactly (it retries once). The reason is in `backend/storage/logs/laravel.log` (never the message or the key). The howler still works with the browser voice.
- **The API is slow, with random multi-second requests (Windows):** the project folder is mounted from Windows into Linux, and PHP re-checking every file for changes is slow there. The development image keeps compiled code and re-checks every 2 seconds; the end-to-end setup turns the re-check off. Rebuild the image after pulling (`docker compose build backend`).
- **Port 5173 is taken:** another Vite is running. Vite picks the next port and prints it.
- **Containers vanish on Windows:** WSL went idle. Start the keep-alive process.
