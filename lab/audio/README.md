# Audio lab

[English](README.md) · [Português](README.pt-BR.md)

Throwaway experiment for CP2: compares three ways to give the howler a voice (see `docs/decisions/ADR-002-voice-approach.md`). Plain HTML and JS, no build step, nothing is uploaded. The page itself is in Portuguese because only one person uses it.

## Run it

```
cd lab/audio
python -m http.server 8080
```

- Same computer: http://localhost:8080
- Phone on the same Wi-Fi: `http://<your-computer-ip>:8080`.
- Voice B (recording) needs the microphone, and browsers only allow it on `https://` or `localhost`. Over plain http the page skips that step and says why. The decision does not depend on it.

## The guided flow

One question per screen, one primary button, everything fits a phone screen without scrolling.

1. **Intro:** language of the message, speaker or headphones, a volume warning.
2. **Voice A** (the phone's own voice): listen, score 1 to 5.
3. **Voice C** (server TTS file, simulated by a sample or by an uploaded file): four versions to listen to (Clean, Howler, Demon, Radio), pick the best one, score it.
4. **Fine tuning:** one-tap buttons ("more deep", "more aggressive", "heavy bass", "more echo", "more tension") that replay right away.
5. **Voice B** (your own recorded voice, through the recipe you chose).
6. **Done:** a summary and a "copy result" button to paste in the chat.

## Files

| File | What it does |
|------|--------------|
| `index.html`, `style.css` | The page (follows `docs/design/tokens.md`) |
| `app.js` | Audio context creation (needs a tap) and device info |
| `fx.js` | The effects engine and the four recipes (no UI) |
| `wizard.js` | The guided flow, voices A, B and C, and the result export |
| `samples/` | Short voice files made with offline Windows voices (flat, they test the effects only) |

## How it was checked

An automated browser test (Playwright, Chromium with a fake microphone) walks the whole flow: the primary button stays disabled until each step is done, language switch, voice A, the four versions of C, the one-tap tweaks and undo, recording and playing voice B, the summary and the exported result. It also checks that every screen fits a 390x844 phone without scrolling. Earlier versions of the test found a DC offset in the distortion curve and a stalled-download problem with the dev server, both fixed. Scoring on real phones is the part only a person can do.
