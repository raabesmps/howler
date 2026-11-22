# ADR-002: Voice approach

[English](ADR-002-voice-approach.md) · [Português](../pt-BR/decisions/ADR-002-voice-approach.md)

Status: **proposed** (technical analysis done; waiting for the phone scores from the audio lab, see "Scores")
Date: 2026-11-22

## Context

The first prototype used the browser's `speechSynthesis`. That audio does not pass through Web Audio, so it cannot get distortion, reverb, bass or extra volume, and it sounds like a high-pitched GPS voice. The howler needs a voice that can be processed into a real scream.

Three approaches were built side by side in `lab/audio/index.html` (CP2):

- **A. Browser voice** (`speechSynthesis`): pitch, speed, volume only.
- **B. The sender's recorded voice** (`MediaRecorder`), decoded and run through an effects chain.
- **C. A voice file generated on the server** by a neural TTS service, run through the same effects chain. Simulated in the lab with sample files plus an upload field.

The effects chain (shared by B and C) is: pitch, WaveShaper distortion, bass shelf, compressor, convolution reverb, tremolo, volume ramp, master volume, limiter. It was verified with an automated test (Playwright, offline rendering): every preset alters the signal, the output is bounded by the limiter, and a DC-offset bug in the distortion curve was found and fixed.

Constraints from the plan: mobile first (iOS Safari and Android Chrome), LGPD (store the minimum, delete after opening), abuse prevention, messages in any language (at least English and Brazilian Portuguese), and the interface is in English.

## Comparison

| Criterion | A. speechSynthesis | B. Recorded voice | C. Server TTS file |
|-----------|--------------------|-------------------|--------------------|
| Can be processed into a scream | No (no Web Audio) | Yes | Yes |
| Voice quality | Varies per device, often robotic | Real human voice | Consistent, neural quality |
| Sender effort and friction | None | Microphone permission, must record, needs https | None |
| Privacy (LGPD) | Best: nothing stored | Worst: a person's voice is personal data, stored until opened | Good: only the text goes to the provider, no voice of a real person |
| Abuse and moderation | Text only, easy | Audio of a real person (harassment), hard to moderate | Text only, easy to moderate |
| Languages | Depends on voices installed on the device | Any | Depends on the provider, EN and PT-BR are well covered |
| iOS Safari | Needs a tap; limited voices; no effects | Records `audio/mp4`; works on https only | Plays decoded audio after a tap, same as B |
| Latency | None | None (recorded before sending) | Generated once when the howler is created, not when it is opened |
| Cost | Free | Storage and bandwidth | Billed per character; at a 140 character cap each howler is small, but check current pricing in CP6 and CP8 |
| Offline or provider outage | Works | Works after download | Needs a fallback |
| Server work | None | Upload, store, delete audio | Call provider, store file until opened, delete |

## Scores (from the lab, to be filled)

| Approach | Scary (1-5) | Phone speaker (1-5) | Headphones (1-5) | Notes |
|----------|-------------|---------------------|------------------|-------|
| A | _pending_ | _pending_ | _pending_ | |
| B | _pending_ | _pending_ | _pending_ | |
| C | _pending_ | _pending_ | _pending_ | |

Caveat: the C samples in the lab were made with old offline Windows voices and sound flat. They test the effects chain, not neural voice quality. A fair score for C needs a real neural TTS file uploaded in the lab.

## Proposed decision (to confirm with the scores)

1. **C is the primary approach**: text goes to a neural TTS provider when the howler is created, the audio file is stored until it is opened, then deleted. It is the only option that has a processable voice, no friction for the sender, no real person's voice stored, and easy moderation.
2. **A is the fallback** when the TTS provider fails or the audio cannot be played: the howler still works, with the plain browser voice.
3. **B is out of the MVP.** Recording a person's voice brings the highest privacy and abuse risk for the smallest gain. It can return later as an explicit opt-in feature.
4. The effects chain from `lab/audio/fx.js` is the base for the CP4 audio engine, with the preset "howler" as the starting point.

## Alternatives considered

- **Pitch-shifted speechSynthesis only**: rejected, cannot be processed (the reason this checkpoint exists).
- **Capturing speechSynthesis through tab or system audio capture**: not possible in a normal page and needs scary permissions.
- **Client-side neural TTS (WASM models)**: possible, but large downloads (tens of MB), slow on phones, and hurts the "tap and it screams" moment. Revisit only if provider cost becomes a problem.
- **Generating the voice at open time**: adds latency right at the dramatic moment and keeps the text on the server unprocessed; generating at creation time avoids both.

## Consequences

- CP6 (data model) needs `audio_path` and a retention rule: delete the file when the howler is opened or expires (to be set in ADR-003).
- CP7/CP8 need a TTS provider key kept only on the server (`.env`, never in the repo) and a per-IP rate limit that also protects provider cost.
- The provider choice and pricing are checked at CP6, not assumed here.
- If the final decision changes after the scores (for example, C scores badly even with a neural voice), this ADR is updated before CP4 starts.
