# CLAUDE.md

Read this file and `docs/project/PLAN.md` at the start of every session. Current checkpoint lives in `docs/project/STATUS.md`.

## What this is

Howler: write a message (max 140 chars), share a single-use link; the recipient sees a closed envelope that shakes, opens, screams the message and burns. After opening, the link is dead.

## Working rules

1. **One checkpoint at a time.** Only work on the current checkpoint (`docs/project/STATUS.md`).
2. **Stop and wait for approval.** When a checkpoint is done: run lint and tests, update `docs/project/STATUS.md` (both languages), open the PR, write "How to validate", then **stop**. Continue only after an "APPROVED CPx" message.
3. **One branch per checkpoint:** `cpNN-short-name`. PR against `main`.
4. **Merge without squash** (preserve each commit). After merging, create the tag `cpNN`.
5. **Small conventional commits:** `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `ci:`. One commit per item in the checkpoint list.
6. **No Warner or franchise assets.** No crest, house names, or "Harry Potter" in names, domains or branding. Original visuals. Footer notice: "Fan project, no affiliation with Warner Bros. or J.K. Rowling."
7. **Decisions become a short ADR** in `docs/decisions/ADR-NNN-title.md` (context, decision, alternatives).
8. **Secrets never enter the repo.** Only `.env.example`.
9. **Mobile first.** Validation is done on a phone.
10. **Language:** docs in English with a Portuguese tab (`docs/pt-BR/`, `README.pt-BR.md`); code, commits and names in English.
11. **Commit trailer:** end commits with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (explicitly allowed for this project only).
12. **Git identity:** use the GitHub noreply email (already set in this repo's local config), since GitHub rejects pushes that expose the private email.
13. **Product language:** the interface comes in English and Brazilian Portuguese (`frontend/src/i18n.ts`: a typed dictionary, a missing key in either language is a type error; the language follows the browser and a button in the top right switches it). A new piece of text needs both languages. The message a person writes can be in any language, so the voice pipeline must handle non-English text (at least English and Brazilian Portuguese).
14. **Tone is fixed by the product.** The sender never chooses the voice or the effects. Tone target: a furious mother's howler, booming and house-filling, building up in anger. It is a character tone, never an impersonation of a real person, and no franchise names appear in the product, code or docs.

## Commands

Run them from the repository root unless a folder is given. Docker runs inside WSL on Windows (see docs/guides/DEVELOPMENT.md).

| Area | Lint | Test |
|------|------|------|
| frontend (`cd frontend`) | `npm run lint`, `npm run typecheck` | `npm test` (Vitest). On Windows run it from a path with an uppercase drive letter (`C:/...`) or it fails with "Cannot read properties of undefined (reading 'config')" |
| backend (`backend/`, in the container) | `docker compose run --rm backend ./vendor/bin/pint --test` | `docker compose run --rm backend php artisan test` (real PostgreSQL) |
| e2e (`e2e/`) | n/a | `scripts/e2e-backend.sh` (where Docker runs), then `cd e2e && npx playwright test` (see docs/guides/TESTING.md). It leaves the API in test mode: `docker compose up -d --force-recreate backend` restores it |
| docs | `python scripts/check-docs.py` (links, anchors, the Portuguese twin of every document; also a CI check) | n/a |

## Layout

```
frontend/      Vue 3 + Vite + TypeScript
backend/       Laravel API + PostgreSQL
e2e/           Playwright tests and the compose override that starts the API for them
docker/        Dockerfiles (development PHP image, production app and web images)
deploy/        what runs on the server: compose, Caddyfile, deploy/rollback/backup/setup scripts
docs/          project/ (PLAN, STATUS), guides/, decisions/ (ADRs), api/, design/, assets/ ; pt-BR/ mirrors it at the same paths
scripts/       dev helpers and check-docs.py
.github/       CI, the production deploy workflow (manual, with an approval), the PR template
```

Docs: every document has its Portuguese twin at the same path under `docs/pt-BR/` (and `README.pt-BR.md` next to each README). STATUS.md is updated after every merge, in both languages.
