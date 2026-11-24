# Howler

[English](README.md) · [Português](README.pt-BR.md)

Write a short message and share a one-time link. Whoever opens it sees a closed envelope: it rumbles, tears open and **screams the message in a hysterical, furious mother's voice**, shaking with every shout. Then it closes, burns from the centre outward and falls into powder. The link works only once.

Status: the prototype is built (the whole experience, with a small server-side voice endpoint and no real backend yet). Next come the Laravel backend, an online preview and the launch. See [docs/project/STATUS.md](docs/project/STATUS.md).

## Try it

```
cd frontend
npm install
npm run dev        # http://localhost:5173
```

The voice is made by an OpenAI audio model through a small endpoint in the dev server, so it needs a key: copy `.env.example` to `.env.local` in the repository root and fill in `OPENAI_API_KEY`. The file is git-ignored and the key never reaches the browser. Each howler costs roughly 1.5 US cents of audio. Without a key the howler still works with the plain browser voice. Start with the volume low: it is meant to be loud.

More in [frontend/README.md](frontend/README.md).

## How it was built

| Where | What |
|-------|------|
| [docs/project/PLAN.md](docs/project/PLAN.md) | The master plan, with its checkpoints and the changes made along the way |
| [docs/project/STATUS.md](docs/project/STATUS.md) | Where the project is right now |
| [docs/decisions/](docs/decisions/) | Architecture decisions: [ADR-001](docs/decisions/ADR-001-stack-and-layout.md) stack, [ADR-002](docs/decisions/ADR-002-voice-approach.md) the voice, [ADR-003](docs/decisions/ADR-003-data-model-and-retention.md) data and retention, [ADR-004](docs/decisions/ADR-004-hosting.md) hosting, [ADR-005](docs/decisions/ADR-005-error-monitoring.md) error monitoring and privacy |
| [docs/guides/DEPLOYMENT.md](docs/guides/DEPLOYMENT.md) | The deploy and rollback runbook: the VM, GitHub, monitoring, backups, secrets |
| [docs/guides/TESTING.md](docs/guides/TESTING.md) | The test strategy: what is tested, how to run it, coverage notes |
| [docs/guides/DEVELOPMENT.md](docs/guides/DEVELOPMENT.md) | Run the whole thing locally: database, API and frontend |
| [docs/api/](docs/api/README.md) | The API contract (OpenAPI) and how single-use opening works |
| [docs/design/](docs/design/) | The approved visual direction, tokens and screen references |
| [frontend/](frontend/) | Vue 3 + Vite + TypeScript: the screens, the audio engine, the canvas burn |
| [backend/](backend/) | Laravel 13 + PostgreSQL: the howlers table and model (CP6) and the single-use API (CP7) |

Documentation is in English with a Portuguese tab (`docs/pt-BR/`, `README.pt-BR.md`).

> Fan project. No affiliation with Warner Bros. or J.K. Rowling.
