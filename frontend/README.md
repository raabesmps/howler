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

On Windows, run the tests from a path that starts with an uppercase drive letter (`C:/...`): with a lowercase `c:` Vitest loads two copies of itself and fails with "Cannot read properties of undefined (reading 'config')".

Phones and https: browsers only enable the storage used for the voice model, sharing and copying on `https://` or `localhost`. Over plain `http://<ip>:5173` the voice falls back to the plain browser voice. See the known gaps below.

## What is where

| Path | What it is |
|------|-----------|
| `src/views/` | The screens: compose, share, recipient (the whole journey), not found |
| `src/components/` | Envelope, seal, the talking envelope, the burn stage, end states |
| `src/audio/engine.ts` | The voice treatment (fixed by the product) and the sound effects |
| `src/audio/voice.ts` | Text to speech stand-in (Piper in the browser) |
| `src/burn/burn.ts` | The canvas burn: fire, falling paper, powder |
| `src/api/` | The API contract (`types.ts`) and the browser implementation (`mock.ts`) |
| `src/lib/` | Text helpers (language guess, splitting, word timing) and shake |

## How it behaves

- **The tone is fixed.** The sender cannot change the voice. The message is spoken in pieces, each louder, faster and higher than the last, through saturation, a heavy compressor and a huge hall.
- **The envelope moves with the voice.** The shaking is driven by the real loudness of the audio every frame, so it hits on stressed words and goes still in the pauses.
- **Single use.** Opening burns the howler first and reveals the message after. The mock keeps this per browser; the real atomic endpoint arrives in CP7.
- **Nothing is lost.** If the voice cannot be prepared, the howler still speaks with the plain browser voice.
- **Reduced motion.** With `prefers-reduced-motion` there is no shaking and no fire: the words still light up and the envelope fades to the end screen.
- **Tuning the tone together.** Add `?voice=cori` (or `alba`, `southern`, `jenny`) after the link, for example `#/h/<token>?voice=cori`, to hear another British voice.

## Known gaps of the prototype (on purpose, fixed later)

- The token carries the message, so a link made on one device opens on another without a server. Anyone with the link can read the message from the URL, and the same link can be opened once per device. The real product uses a random id and an atomic server-side open (CP7).
- The voice is a stand-in: Piper models run in the browser, a calm reading made angry by the treatment. The first visit downloads about 60 MB from third-party CDNs. The final voice comes from a server TTS service (ADR-002, CP8).
- The voice is made when the envelope is opened, so the rumble can last several seconds. With a server the audio is ready beforehand.
- Link preview meta tags and the report button are not wired yet (CP8, CP7).
