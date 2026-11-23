# Howler frontend

[English](README.md) · [Português](README.pt-BR.md)

Vue 3 + Vite + TypeScript. Since CP8 it talks to the real backend (Laravel + PostgreSQL); the whole local setup is in the [development guide](../docs/DEVELOPMENT.md).

Write a message, get a link, and whoever opens it sees a closed envelope. They tap the seal: it rumbles and shakes, the flap tears open, the letter rises, the envelope screams the message (shaking with the loudness of the voice), closes, burns from the centre outward and falls into powder. The link works once.

## Run it

With the backend running (see the development guide):

```
cd frontend
npm install
npm run dev        # http://localhost:5173 (also reachable from a phone on the same Wi-Fi)
npm test           # unit tests (Vitest)
npm run lint
npm run typecheck
npm run build
```

`/api` is forwarded to the backend by the dev server (`http://localhost:8000`, change it with `VITE_API_TARGET`), so the browser only ever talks to its own origin: no CORS, and no key in the browser.

To work on the screens **without Docker**, start it with `VITE_API=mock npm run dev`: everything then lives in the browser (the link carries the message, single use is per device, and there is no server voice, so the plain browser voice speaks).

On Windows, run the tests from a path that starts with an uppercase drive letter (`C:/...`): with a lowercase `c:` Vitest loads two copies of itself and fails with "Cannot read properties of undefined (reading 'config')".

Phones and https: browsers only enable sharing and copying on `https://` or `localhost`, so on a phone over plain `http://<ip>:5173` the Share and Copy buttons are limited. The staging deploy (CP10) is https.

## What is where

| Path | What it is |
|------|-----------|
| `src/views/` | The screens: compose, share, recipient (the whole journey), not found |
| `src/components/` | Envelope, seal, the talking envelope, the burn stage, end states, the report button |
| `src/api/types.ts` | The API contract the screens use, and the typed errors |
| `src/api/http.ts` | The real client (talks to the Laravel API). `index.ts` picks it, or the mock |
| `src/api/mock.ts` | The in-browser implementation, for tests and for working without Docker |
| `src/lib/errors.ts` | Turns an error into plain words for the person |
| `src/audio/engine.ts` | The voice treatment, its playback and the sound effects (rumble, paper tear) |
| `src/audio/dsp.ts` | Pure audio helpers (noise gate, level), unit tested |
| `src/audio/voice.ts` | Decodes the voice that arrives with the opened howler |
| `src/burn/burn.ts` | The canvas burn: fire, falling paper, powder |
| `public/og.png` | The link-preview image: a closed envelope, the same for every link |

## How it behaves

- **The tone is fixed.** The sender cannot change the voice. It is a hysterical, shrieking, over-the-top mother, made by the backend with an audio model and a fixed direction, then cleaned and made loud on the device (no echo). See ADR-002.
- **The voice is made when the howler is created**, so it is ready the instant the recipient taps the seal. It travels with the message in the one and only opening, and the server deletes it right after.
- **The envelope moves with the voice.** The shaking is driven by the real loudness of the audio every frame, so it hits on stressed words and goes still in the pauses.
- **Single use.** Opening is a `POST` that burns the howler on the server and reveals the message to the first caller only. A second try, from any device, says "already delivered".
- **Nothing is lost.** If the server could not make the voice, the howler still speaks with the plain browser voice.
- **Errors are explained.** Offline, slow down (rate limit, with the wait time), invalid input, a server failure, burned, expired, unknown: each has its own words and, where it helps, a retry. If opening fails before anything arrives, the envelope stays closed so they can try again.
- **Link preview.** The preview of a howler link is always the same closed envelope. The token lives after the `#` of the URL, which browsers never send to a server, so a chat app or crawler cannot see the message, the name or even the token. Set `VITE_SITE_URL` at build time so the preview tags get absolute URLs.
- **Reduced motion.** With `prefers-reduced-motion` there is no shaking and no fire: the words still light up and the envelope fades to the end screen.
- **The burn is silent** on purpose: only the rumble and the paper tear have sound.

## Known gaps

- Accessibility, contrast and 60 fps on phones are the subject of CP9.
- The report button sends the reason "abuse" only. A reason picker can come later.
