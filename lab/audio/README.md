# Audio lab

[English](README.md) · [Português](README.pt-BR.md)

Throwaway experiment for CP2: compares three ways to give the howler a voice (see `docs/decisions/ADR-002-voice-approach.md`). Plain HTML and JS, no build step, nothing is uploaded.

## Run it

```
cd lab/audio
python -m http.server 8080
```

- Same computer: http://localhost:8080
- Phone on the same Wi-Fi: `http://<your-computer-ip>:8080` (approaches A and C work).
- Approach B (recording) needs the microphone, and browsers only allow it on `https://` or `localhost`. On a phone over plain http it is disabled with an explanation. Use an https link to test it.

## Files

| File | What it does |
|------|--------------|
| `index.html`, `style.css` | The page |
| `app.js` | Audio unlock, device info, scoring, export of results |
| `fx.js` | The effects chain shared by B and C, and the presets |
| `approach-a.js` | A: `speechSynthesis` |
| `approach-b.js` | B: microphone recording, decoded and processed |
| `approach-c.js` | C: sample or uploaded audio file, processed |
| `samples/` | Short voice files made with offline Windows voices (flat, they test the effects only) |

## How it was checked

An automated browser test (Playwright, Chromium with a fake microphone) covered: audio unlock, loading and playing a sample, recording and playing with B, the scoring and export, and offline renders of all four presets to confirm that each one changes the signal and ends cleanly. It found and fixed a DC offset in the distortion curve. Scoring on real phones is the part only a person can do.
