# Test strategy and coverage notes

[English](TESTING.md) · [Português](pt-BR/TESTES.md)

What is tested, where, why, and what is deliberately not tested.

## The layers

| Layer | Tool | Where | What it proves | Runs in CI |
|-------|------|-------|----------------|------------|
| Backend | PHPUnit on a real PostgreSQL | `backend/tests` | The rules: states and their database constraints, the four endpoints, rate limits, retention, the voice (with OpenAI faked), and that two simultaneous openings give the message to one caller | `backend` job |
| Frontend units | Vitest + jsdom | `frontend/src/**/*.test.ts` | The pieces with logic: the HTTP client and its errors, the error wording, text timing, audio helpers, mute memory, the link-preview tags, the burn performance budget | `frontend` job |
| End to end | Playwright (Chromium, Pixel 7 viewport) | `e2e/tests` | A real browser against the real frontend, API and database: the journey, the single use, the failures, the sound controls, accessibility | `e2e` job |

The three layers answer different questions. The backend tests are the source of truth for the single-use promise (including a real concurrency test with 12 separate processes). The end-to-end tests prove the screens and the API agree with each other and with a person's keyboard and screen reader. The unit tests keep the logic fast to check.

## What the end-to-end tests cover

- **The journey** (`flow.spec.ts`): write, seal, share, a second browser opens it, it screams and burns, "already delivered".
- **Single use:** reload on the same device, another device, the API directly, six simultaneous openings (exactly one 200), and that merely looking at the link (what a chat preview does) does not burn it.
- **Failures:** rate limit (with the wait time, and the text kept), server unreachable on sealing and on arrival (with a working retry), connection lost while opening (the envelope stays closed and retryable), unknown link, reporting.
- **Keyboard and reduced motion:** the whole opening from the keyboard; with `prefers-reduced-motion` the words still arrive and it ends without the fire.
- **Sound** (`sound.spec.ts`): the loud-sound warning is shown before anything plays; muting works before opening, is remembered for the next howler, silences the browser voice too, and is still there to stop it midway.
- **Accessibility** (`a11y.spec.ts`): axe-core (WCAG 2.0 and 2.1, A and AA) on every screen, the page structure, zoom allowed, focus landing on the outcome, touch targets of at least 44 px.

The e2e API runs **without an OpenAI key**: howlers have no server voice and the browser's own voice reads them. That is the fallback path, and it keeps the suite free and deterministic. The server voice itself is covered by the backend tests with OpenAI faked, and by a manual run with the real key (below). No test can reach OpenAI: any outgoing request that is not faked fails the backend test.

## Running it

```
# backend and frontend units: see docs/DEVELOPMENT.md
scripts/e2e-backend.sh            # where Docker runs: the API with the voice off, high rate limits, the howler_test database
cd e2e && npm install && npx playwright install chromium
npm test                          # starts the frontend itself; set E2E_API_TARGET if the API is not on :8000
```

Afterwards, `docker compose up -d --force-recreate backend` returns the API to normal development settings. In CI the same thing runs in the `e2e` job, and the report and traces are kept as an artifact when it fails.

## Accessibility: what is automated and what is a manual check

Automated checks find roughly a third of real problems: contrast, names, roles, structure. The audit found and fixed:

- the character counter and the unspoken words in the scream had too little contrast over a gradient and over the paper (the words are now at least 4.5:1, the counter has its own backdrop);
- the mute button's visible text did not match its accessible name (WCAG 2.5.3): the visible text is now the name and never changes, `aria-pressed` carries the state;
- when the burn ended, keyboard focus was lost: it now lands on the outcome heading so a screen reader announces it;
- small touch targets: text buttons are now at least 44 px tall.

Manual checklist to run on a phone before a release (not automatable):

- [ ] With a screen reader (TalkBack or VoiceOver): write and seal; open a link; the scream is announced as text; the outcome is announced at the end.
- [ ] With the system text size at the largest setting and with zoom at 200 percent: nothing is cut off or overlaps.
- [ ] With "reduce motion" on at the system level: no shaking and no fire.
- [ ] Mute before opening: nothing is heard, including the rumble and the paper tear.
- [ ] Landscape orientation still works.

## Performance

The burn is the heavy part: a per-pixel burn pass, hundreds of flame sprites a second and a full-screen glow. Rather than tuning for one phone, it watches its own frame time and steps down through four quality levels (canvas resolution, how often the burn front is recomputed, how many particles are spawned). It only goes down, and a wall-clock deadline ends it on a device too slow to finish. Phones that report few cores or little memory start one level down. See `frontend/src/burn/budget.ts` (unit tested).

Measured in headless Chromium on a development machine, with the browser throttled by a CPU slowdown factor to stand in for a slower phone (a rough stand-in: software rendering, not a real GPU):

| CPU slowdown | Before the budget | With the budget |
|--------------|-------------------|-----------------|
| 1x (this machine) | 23 fps | 52 to 54 fps |
| 4x | 3 fps | 5 to 16 fps |
| 6x | 2 fps | 5 to 13 fps |

The throttled numbers vary from run to run because the budget needs a few frames to step down after the throttle starts. A 6x slowdown is far below any phone sold today; the point of the numbers is the direction. **A test on a real phone is still the validation** (CP9's "how to validate"): note any stutter during the burn.

## Coverage notes

- There is no coverage percentage on purpose. The risks are in behavior (single use, privacy, retention, failure handling), and those are tested directly, not measured by lines.
- **Not covered by automation:** how the voice and the effects *sound* (they are judged by ear, ADR-002), how the burn *looks* on a real phone, the real OpenAI call (covered by a manual run with a key), and Web Share (it needs https and a real share sheet; the copy fallback is what the tests can reach).
- **Known gaps:** only Chromium is tested (Safari and Firefox are not); the stress and load behavior of the API is not measured; the daily voice budget is tested with a small limit, not at 300.
