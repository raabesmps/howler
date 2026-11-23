# Howler frontend

[English](README.md) · [Português](README.pt-BR.md)

Vue 3 + Vite + TypeScript. This is the prototype: the whole experience works, with no backend.

Write a message, get a link, and whoever opens it sees a closed envelope. They tap the seal: it rumbles and shakes, the flap tears open, the letter rises, the envelope screams the message (shaking with the loudness of the voice), closes, burns from the centre outward and falls into powder. The link works once.

## Run it

```
cd frontend
npm install
npm run dev        # http://localhost:5173 (also reachable from a phone on the same Wi-Fi)
npm test           # unit tests (Vitest)
npm run lint
npm run typecheck
npm run build
```

**The voice needs a key.** The howler's voice is made by an OpenAI audio model, called from a small endpoint inside the dev server (`server/voice.ts`). Create a file `.env.local` in the **repository root** (one level above `frontend/`) with one line, `OPENAI_API_KEY=your-key`. It is git-ignored and the key never reaches the browser. See `.env.example`. Without a key the howler still works with the plain browser voice. Each howler costs roughly 1.5 US cents of audio (see ADR-002).

On Windows, run the tests from a path that starts with an uppercase drive letter (`C:/...`): with a lowercase `c:` Vitest loads two copies of itself and fails with "Cannot read properties of undefined (reading 'config')".

Phones and https: browsers only enable sharing and copying on `https://` or `localhost`, so on a phone over plain `http://<ip>:5173` those two buttons are limited. The voice itself works, because it is made by the dev server.

## What is where

| Path | What it is |
|------|-----------|
| `src/views/` | The screens: compose, share, recipient (the whole journey), not found |
| `src/components/` | Envelope, seal, the talking envelope, the burn stage, end states |
| `src/audio/engine.ts` | The voice treatment, its playback and the sound effects (rumble, paper tear) |
| `src/audio/dsp.ts` | Pure audio helpers (noise gate, level), unit tested |
| `src/audio/voice.ts` | Asks the server for the voice |
| `src/burn/burn.ts` | The canvas burn: fire, falling paper, powder |
| `src/api/` | The API contract (`types.ts`) and the browser implementation (`mock.ts`) |
| `server/voice.ts` | The voice endpoint (dev server only): the fixed tone, the guards, the key |

## How it behaves

- **The tone is fixed.** The sender cannot change the voice. It is a hysterical, shrieking, over-the-top mother, made by an audio model with a fixed direction, then cleaned and made loud on the device (no echo). See ADR-002.
- **The envelope moves with the voice.** The shaking is driven by the real loudness of the audio every frame, so it hits on stressed words and goes still in the pauses.
- **Single use.** Opening burns the howler first and reveals the message after. The mock keeps this per browser; the real atomic endpoint arrives in CP7.
- **Nothing is lost.** If the voice cannot be generated, the howler still speaks with the plain browser voice.
- **The endpoint is guarded.** 1 to 140 characters, 6 requests a minute, and the model's transcript must match the text word for word (otherwise it retries once, then falls back).
- **Reduced motion.** With `prefers-reduced-motion` there is no shaking and no fire: the words still light up and the envelope fades to the end screen.
- **The burn is silent** on purpose: only the rumble and the paper tear have sound.

## Known gaps of the prototype (on purpose, fixed later)

- The token carries the message, so a link made on one device opens on another without a server. Anyone with the link can read the message from the URL, and the same link can be opened once per device. The real product uses a random id and an atomic server-side open (CP7).
- The voice is made when the envelope is opened, so there is about 3 seconds of rumble. With a server the audio is made at creation and is ready beforehand (CP8).
- The voice endpoint only exists in the dev and preview servers. A static copy of the site (such as GitHub Pages) has no voice endpoint and uses the plain browser voice.
- Link preview meta tags and the report button are not wired yet (CP8, CP7).
