# Howler

[English](README.md) · [Português](README.pt-BR.md)

Write a short message and share a one-time link. Whoever opens it sees a closed envelope: it rumbles, tears open and **screams the message in a hysterical, furious mother's voice**, shaking with every shout. Then it closes, burns from the centre outward and falls into powder. The link works only once.

Status: the prototype is built (the whole experience, with a small server-side voice endpoint and no real backend yet). Next come the Laravel backend, an online preview and the launch. See [docs/STATUS.md](docs/STATUS.md).

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
| [docs/PLAN.md](docs/PLAN.md) | The master plan, with its checkpoints and the changes made along the way |
| [docs/STATUS.md](docs/STATUS.md) | Where the project is right now |
| [docs/decisions/](docs/decisions/) | Architecture decisions: [ADR-001](docs/decisions/ADR-001-stack-and-layout.md) stack, [ADR-002](docs/decisions/ADR-002-voice-approach.md) the voice, [ADR-004](docs/decisions/ADR-004-hosting.md) hosting |
| [docs/design/](docs/design/) | The approved visual direction, tokens and screen references |
| [frontend/](frontend/) | Vue 3 + Vite + TypeScript: the screens, the audio engine, the canvas burn |
| `backend/` | Laravel API with single-use opening (planned, CP6 and CP7) |

Documentation is in English with a Portuguese tab (`docs/pt-BR/`, `README.pt-BR.md`).

> Fan project. No affiliation with Warner Bros. or J.K. Rowling.
