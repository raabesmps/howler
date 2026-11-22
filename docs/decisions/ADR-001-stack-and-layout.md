# ADR-001: Stack and repository layout

[English](ADR-001-stack-and-layout.md) · [Português](../pt-BR/decisions/ADR-001-stack-and-layout.md)

Status: proposed (awaiting approval at CP0)
Date: 2026-11-22

## Context

Howler is a small product with two hard technical needs:

1. A rich, real-time visual and audio experience on mobile browsers (envelope animation, canvas fire, Web Audio effects chain).
2. A strictly single-use link: the content must be revealed exactly once, even under concurrent requests, and deleted afterwards.

It is also a portfolio project, built one validated checkpoint at a time, so the stack should be well known, testable and cheap to host.

## Decision

- **Frontend:** Vue 3 + Vite + TypeScript. Canvas 2D for fire, smoke and embers. Web Audio API for the voice effects chain. Vitest for unit tests.
- **Backend:** Laravel (API only) + PostgreSQL. PHPUnit for tests. The single-use guarantee comes from a transaction with `lockForUpdate` (PostgreSQL row lock), not from application-level checks.
- **E2E:** Playwright.
- **CI:** GitHub Actions.
- **Packaging:** Docker, hosting decided later in ADR-004 (CP10).
- **Layout:** monorepo with `frontend/`, `backend/`, `lab/audio/` (throwaway audio experiments), `docs/` and `.github/`.
- **Repository:** `raabesmps/howler`, public from day one. Direct work happens on `cpNN-short-name` branches and PRs, merged without squash.

### Branch protection note

The goal was to protect `main` and require PRs. This is enforced by process (always a PR, never a direct commit after the initial one) and, where the GitHub plan allows it, by branch protection rules. Public repositories support branch protection on the free plan.

## Alternatives considered

- **Nuxt or Next full-stack (single deployable):** simpler hosting, but the single-use guarantee is easier to reason about and test with a real relational database and row locks, and Laravel is already familiar from other projects.
- **React frontend:** equally capable; Vue chosen for consistency with other projects in the portfolio.
- **Redis or similar for single-use tokens:** atomic `GETDEL` would work, but PostgreSQL gives durable storage, expiry queries and the purge job in one place, so there is one datastore less to run.
- **Separate repos for front and back:** more ceremony for a project with one author and tightly coupled checkpoints.

## Consequences

- Two runtimes (Node and PHP) to maintain, mitigated by Docker.
- The frontend can be developed and approved as a standalone prototype (CP2 to CP5) before any backend exists.
- The voice approach (ADR-002) may add audio storage to the backend, to be handled in ADR-003.
