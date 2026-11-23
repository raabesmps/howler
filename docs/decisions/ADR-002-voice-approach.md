# ADR-002: Voice approach

[English](ADR-002-voice-approach.md) · [Português](../pt-BR/decisions/ADR-002-voice-approach.md)

Status: accepted (2026-11-22)
Date: 2026-11-22

## Context

The first prototype used the browser's `speechSynthesis`. That audio does not pass through Web Audio, so it cannot get distortion, reverb, bass or extra volume, and it sounds like a high-pitched GPS voice. The howler needs a voice that can be processed into a real scream.

Three approaches were tried in an audio lab (kept on the `cp02-audio-lab` branch): A) the browser voice, B) the sender's own recorded voice, C) a voice file generated on the server by a TTS service. Both approaches B and C were run through the same effects chain (pitch, saturation, bass, compression, reverb, tremolo, volume ramp, limiter). The effects chain works on any decoded audio, so it is not the deciding factor.

The product owner's direction after testing: **nobody picks the tone**. The sender only writes the message; the tone is fixed by the product (decided by the two of us), and the target is a furious mother's howler: a scolding, house-filling, booming voice that builds up in anger. It is a character tone, not an impersonation of any real person, and no franchise names appear in the product.

## Comparison

| Criterion | A. Browser voice | B. Recorded voice | C. Server TTS file |
|-----------|------------------|-------------------|--------------------|
| Can be processed into a scream | No (no Web Audio) | Yes | Yes |
| A fixed tone chosen by the product | No (depends on the device voices) | No (it is the sender's own voice) | Yes |
| Sender effort | None | Microphone permission, must record, needs https | None |
| Privacy (LGPD) | Nothing stored | A person's voice is personal data, stored until opened | Only text goes to the provider |
| Abuse and moderation | Text only | Audio of a real person, hard to moderate | Text only |
| Languages | Depends on installed voices | Any | Provider dependent; English and Brazilian Portuguese are well covered |

## Decision

1. **Production: C.** The text goes to a neural TTS service when the howler is created, the audio file is stored until the howler is opened, then deleted. The voice and its "furious" delivery are fixed by the product, and the effects chain from `frontend/src/audio/engine.ts` is applied on the device when it plays. The concrete provider and voice are chosen at CP8 by listening to real samples together.
2. **Prototype: an in-browser stand-in.** Until a backend exists, the prototype speaks with Piper models running in the browser (WebAssembly, MIT licence) and gives the anger through the treatment in `engine.ts`: the message is spoken in pieces, each louder, faster and higher than the last, then pushed through saturation, a heavy compressor and a huge hall. It is clearly a stand-in: a Piper voice reads calmly, the first visit downloads a model of about 60 MB, and it needs a secure context (https) to store it.
3. **Fallback: A.** If the voice cannot be prepared (offline, blocked, browsers without the needed storage API), the howler still works with the plain browser voice, so a message is never lost after it has been opened.
4. **B is out of the MVP.** Recording a person's voice brings the highest privacy and abuse risk for the smallest gain. It may return later as an explicit opt-in feature.

## Alternatives considered

- **Pitch-shifted `speechSynthesis` only**: rejected, it cannot be processed (the reason this decision exists).
- **Capturing `speechSynthesis` output through tab or system audio capture**: not possible in a normal page.
- **Client-side neural TTS as the final answer**: possible, but large downloads and slow on phones; and a calm read cannot carry real anger, which is what a good server voice can. It stays as the prototype stand-in and a possible offline fallback.
- **Generating the voice at open time**: adds latency at the dramatic moment and keeps the text on the server unprocessed; generating at creation time avoids both. (The prototype has to synthesize at open time only because it has no server.)

## Consequences

- CP6 (data model) needs `audio_path` and a retention rule: delete the file when the howler is opened or expires (ADR-003).
- CP7 and CP8 need a TTS provider key kept only on the server (`.env`, never in the repo) and a per-IP rate limit that also protects the provider cost. Provider choice and prices are checked at CP8, not assumed here.
- The prototype depends on third-party CDNs for the WebAssembly runtime and the voice model, which is acceptable for a preview and goes away when the server voice arrives.
