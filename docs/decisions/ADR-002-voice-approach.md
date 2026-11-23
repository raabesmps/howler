# ADR-002: Voice approach

[English](ADR-002-voice-approach.md) · [Português](../pt-BR/decisions/ADR-002-voice-approach.md)

Status: accepted (2026-11-22)
Date: 2026-11-22

## Context

The first prototype used the browser's `speechSynthesis`. That audio cannot be processed and it sounds like a high-pitched GPS voice. The howler needs a voice that actually screams.

The product owner's direction: **nobody picks the tone**. The sender only writes the message; the tone is fixed by the product. The target is a furious mother's howler, and we agreed it cannot be a copy of anyone: our version is a **hysterical, shrieking, over-the-top mother**. It is a character tone, not an impersonation of a real person, and no franchise names appear in the product, code or docs.

Three approaches were tried: A) the browser voice, B) the sender's own recorded voice, C) a voice generated on the server by a model. C won clearly (a fixed tone, no friction for the sender, no real person's voice stored, easy to moderate as text).

Then the tone was tuned by ear over several rounds of takes, with these findings:
- A plain read, even loud, is not a scream. What matters is the **direction** given to the model and **how the line is written**.
- Echo and reverb were rejected: the wanted sound is a dry, close, loud shout. Spelling out stretched vowels was rejected too.
- Heavy loudness processing caused hiss, harshness and "pumping" that hurt the ears. A **clean** treatment fixed it.
- The `gpt-4o-mini-tts` speech endpoint with the voice Coral was good, but **it is deprecated and shuts down on 2027-01-06** (OpenAI text-to-speech guide). It cannot be the base of the product.
- The newer `gpt-audio` model, which acts the line instead of only reading it, with the voice Coral, **was chosen by ear** as the best scream. `gpt-audio-1.5` read the stage direction aloud and added speech that was not in the line, so it is not usable as is. Framing the task as a stage actress in a comedy sketch was needed: framing the character as someone "losing control, almost crying" made the newer models refuse.

## Decision

1. **Model and voice:** `gpt-audio` (pinned to the dated snapshot `gpt-audio-2025-08-28`, so the tone does not change by itself), voice **Coral**, called through the chat completions endpoint with audio output. The direction and the comedy-sketch framing are fixed in `frontend/server/voice.ts`.
2. **Treatment on the device (named "V2"):** a noise gate that removes hiss between words, a little compression, the harsh highs tamed, and a measured volume of about -14 dB average with peaks under -1 dBFS. **No echo, no saturation, no extra boost of the highs.** Implemented in `frontend/src/audio/engine.ts` and `dsp.ts`.
3. **The key stays on the server.** In the prototype a small endpoint inside the Vite dev server (`POST /api/voice`) reads `OPENAI_API_KEY` from the git-ignored `.env.local` and returns the audio. In the product this becomes the backend (CP8), where the audio is made when the howler is created, stored until it is opened, then deleted (ADR-003).
4. **Guards on the endpoint:** the text must be 1 to 140 characters; at most 6 requests per minute per client (the cost is per use); the transcript returned by the model must match the sender's text word for word (it rejects stage directions read aloud, refusals, extra speech and a model that obeyed instructions hidden in the sender's text), with one retry.
5. **Fallback:** if the voice cannot be generated (offline, refusal, upstream error), the howler still works with the plain browser voice, so a message is never lost after it has been opened.
6. **B (recording a person's voice) is out of the MVP.** It brings the highest privacy and abuse risk for the smallest gain.

## Alternatives considered

- **`gpt-4o-mini-tts` (speech endpoint):** worked well, rejected because it shuts down on 2027-01-06.
- **`gpt-audio-1.5`:** rejected for now, it reads directions aloud and adds speech. Worth retesting later.
- **`gpt-realtime-2.1-mini` (the replacement OpenAI recommends):** not tried. It uses the Realtime API (a different workflow), so it is a candidate if `gpt-audio` is retired.
- **ElevenLabs** (supports tags such as `[shouting]`) and **Azure** (shouting styles on some voices): not needed so far; the fallback if the OpenAI tone cannot be kept.
- **In-browser Piper models:** used in the first prototype as a stand-in and removed: they read calmly and cannot scream.

## Consequences

- **Cost:** a measured howler used about 300 input and 220 output tokens. With the audio output price listed by aggregators (about US$ 64 per million tokens, **to be confirmed on the OpenAI pricing page**) it is roughly 1.5 US cents per howler, doubled in the rare retry. The rate limit also protects this cost.
- **Latency:** about 3 seconds to generate. The prototype generates when the envelope is opened (the rumble covers it); the product generates at creation, so the audio is ready beforehand.
- **Risk:** the tone belongs to a model snapshot. If OpenAI retires `gpt-audio-2025-08-28`, the tone must be re-checked by ear before switching.
- **Moderation:** abusive messages are not moderated in the MVP; the model may refuse some, and the fallback voice covers it. The report button and the rate limit are the MVP's defences (CP7).
- CP6 needs `audio_path` and a retention rule (ADR-003). CP8 needs the key only on the server and a per-IP limit.
