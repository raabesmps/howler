# CLAUDE.md

Read this file and `docs/PLAN.md` at the start of every session. Current checkpoint lives in `docs/STATUS.md`.

## What this is

Howler: write a message (max 140 chars), share a single-use link; the recipient sees a closed envelope that shakes, opens, screams the message and burns. After opening, the link is dead.

## Working rules

1. **One checkpoint at a time.** Only work on the current checkpoint (`docs/STATUS.md`).
2. **Stop and wait for approval.** When a checkpoint is done: run lint and tests, update `docs/STATUS.md` (both languages), open the PR, write "How to validate", then **stop**. Continue only after an "APPROVED CPx" message.
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
13. **Product language:** the interface is in English. The message a person writes can be in any language, so the voice pipeline must handle non-English text (at least English and Brazilian Portuguese).
14. **Tone is fixed by the product.** The sender never chooses the voice or the effects. Tone target: a furious mother's howler, booming and house-filling, building up in anger. It is a character tone, never an impersonation of a real person, and no franchise names appear in the product, code or docs.

## Commands

Filled in as each part of the stack lands.

| Area | Lint | Test |
|------|------|------|
| frontend (`cd frontend`) | `npm run lint`, `npm run typecheck` | `npm test` (Vitest). On Windows run it from a path with an uppercase drive letter (`C:/...`) or it fails with "Cannot read properties of undefined (reading 'config')" |
| backend (CP6+) | `./vendor/bin/pint --test` | `php artisan test` |
| e2e (CP9+) | n/a | `npx playwright test` |

## Layout

```
docs/          plan, STATUS.md, decisions/, design/
lab/audio/     audio experiments (plain HTML)
frontend/      Vue 3 + Vite + TS
backend/       Laravel API + PostgreSQL
.github/       workflows, PR template
```
