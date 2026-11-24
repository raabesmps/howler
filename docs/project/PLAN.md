# Howler Master Plan

[English](PLAN.md) · [Português](../pt-BR/project/PLAN.md)

Project: a site where someone writes a short message and shares a link. Whoever opens it hears the message screamed by an envelope that shakes, opens, yells and burns. The link works only once.

This is the master plan. Claude Code reads this file and `CLAUDE.md` at the start of every session.

---

## Changes to the plan (2026-11-22)

The plan below is the original. These are the decisions made while building it. They win over the text further down where they differ.

1. **CP2 (audio lab) was built and then superseded.** The idea was to let people compare voices. After testing, the product owner decided that **nobody picks the tone**: the tone is fixed by the product. The lab is kept on the branch `archive/audio-lab` and was never merged (so there is no `cp2` tag). The outcome is [ADR-002](../decisions/ADR-002-voice-approach.md).
2. **CP3, CP4 and CP5 were delivered as one prototype pull request**, at the product owner's request. The tags `cp3`, `cp4`, `cp5` and `prototype-approved` are created together after the merge.
3. **The voice is decided.** A hysterical, shrieking, over-the-top mother, made by the `gpt-audio` model (voice Coral, dated snapshot) from the server, then cleaned and made loud on the device, with no echo. It was chosen by ear over several rounds. Recording a person's own voice is out of the MVP. The old `gpt-4o-mini-tts` endpoint shuts down on 2027-01-06, so it is not used.
4. **CP5 "online preview" is still pending.** It needs an authorization to publish. A static host such as GitHub Pages has no voice endpoint, so a preview with the real voice needs a small server function; without it the preview only has the plain browser voice.
5. **CP6 (data model):** the howler also stores the audio (`audio_path`) and deletes it when the howler is opened or expires (ADR-003).
6. **CP8 (integration):** the voice is generated **when the howler is created**, on the server, with the key only on the server (the endpoint in `frontend/server/voice.ts` becomes the backend). It keeps the guards of the prototype: 1 to 140 characters, a per-IP limit that also protects the cost, and a transcript check. It also needs the provider and price check (about 1.5 US cents per howler measured, to confirm on the official page).
7. **CI was added early** (lint, typecheck, unit tests and build on every pull request). CP9 extends it with end-to-end tests and the rest.
8. **Hosting direction decided (2026-11-23):** one Google Cloud VM running everything with Docker Compose, not Netlify (it cannot run Laravel). See [ADR-004](../decisions/ADR-004-hosting.md). Size, region, domain and prices are fixed at CP10, and the online preview of CP5 becomes the staging deploy.
9. **Production on the same VM, no online staging (2026-11-24):** CP11 runs production on the VM CP10 prepared, at the domain of the first deploy; releases are a manual workflow that needs the owner's approval, with a database dump first and a smoke test after (a rollback if it fails). The license is MIT. See the update in [ADR-004](../decisions/ADR-004-hosting.md).

---

## 0. Working rules (apply to every phase)

1. **One checkpoint at a time.** Claude Code only works on the current checkpoint (see `docs/project/STATUS.md`).
2. **Stop and wait for approval.** When a checkpoint is done: run lint and tests, update `docs/project/STATUS.md`, open the PR, write "How to validate" and **stop**. Only move on after an "APPROVED CPx" message.
3. **One branch per checkpoint:** `cpNN-short-name`. PR against `main`.
4. **Merge without squash**, to preserve each commit of the plan. After merging, create the tag `cpNN`.
5. **Small conventional commits:** `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `ci:`. One commit per item in the checkpoint list.
6. **No Warner or franchise assets.** No crest, no house names, no "Harry Potter" in names, domains or branding. The visuals are original. Footer notice: "Fan project, no affiliation with Warner Bros. or J.K. Rowling."
7. **Decisions become a short ADR** in `docs/decisions/ADR-NNN-title.md` (context, decision, alternatives).
8. **Secrets never enter the repo.** Only `.env.example`.
9. **Mobile first.** All validation is done on her phone.
10. **Documentation is in English, with a Portuguese tab** (`docs/pt-BR/`, `README.pt-BR.md`). Code, commits and repo names are in English.

## 1. Scope

**In the MVP**
- Write a message (up to 140 characters), optional recipient name.
- Generate a single-use link.
- The opener sees the closed envelope. On tap, the envelope opens, screams the message and burns.
- After burning, the link shows "this howler has already been delivered".
- Automatic expiration (default 7 days) and content deletion after it is opened.

**Out of the MVP**
- User accounts, payments, sending by email or WhatsApp through the system, AI moderation.

**Risks that become requirements**
- Abuse (harassment): per-IP send limit, size limit, "report" button, the system sends nothing by itself (the sender shares the link).
- Privacy (LGPD): store the minimum, delete content after opening or expiration, no tracking of the recipient.
- Mobile audio: Safari and Chrome mobile only play sound after a tap. The tap on the envelope is the unlock.

## 2. Proposed stack (validate in CP0 and record in an ADR)

- **Frontend:** Vue 3 + Vite + TypeScript. Canvas for fire and smoke. Web Audio API.
- **Backend:** Laravel (API) + PostgreSQL. Tests with PHPUnit.
- **Tests:** Vitest (front), PHPUnit (back), Playwright (e2e).
- **CI:** GitHub Actions.
- **Deploy:** Docker. Decide hosting in CP10 (check current free tiers first). Domain option: a subdomain of the portfolio.

Repository layout:

```
howler/
  CLAUDE.md
  README.md
  docs/            plan, STATUS.md, decisions/, design/
  lab/audio/       audio experiments (plain HTML)
  frontend/        Vue (born as a prototype and becomes the real app)
  backend/         Laravel API
  .github/         workflows, PR template
```

## 3. Why the first prototype felt weak (and what changes)

The first prototype's voice comes from the browser's `speechSynthesis`. That audio **does not go through Web Audio**, so distortion, reverb, bass and gain cannot be applied. That is why it sounds like a high-pitched GPS voice.

For the scream to really land, the voice must become an **audio file or buffer** that goes through an effects chain. That is why CP2 (audio lab) comes before the prototype.

The visuals also level up: an envelope with a 3D opening, smoke coming out before it opens, escalating shake, an unfolding paper, a shaking and flashing screen, and fire in Canvas (particles) instead of CSS shapes.

---

# PHASES AND CHECKPOINTS

Each checkpoint has: goal, tasks, commits, how to validate and what needs approval.

## PHASE 0: Foundation

### CP0: Repository and rules
**Goal:** repository on GitHub from day one, with the whole evolution recorded.

**Tasks**
- Create the repository: `gh repo create raabesmps/howler --public --clone` (public from the start, by decision).
- Protect `main`, require PRs (if the GitHub plan allows it).
- Create GitHub milestones: one per phase. Create one issue per checkpoint.
- Write `CLAUDE.md` with the section 0 rules and the lint and test commands.
- Version this plan in `docs/project/PLAN.md` and create `docs/project/STATUS.md`.
- PR template with the fields: "What changed", "How to validate", "Acceptance checklist".

**Commits**
1. `chore: initial commit with README and gitignore`
2. `docs: add master plan and status tracker`
3. `docs: add CLAUDE.md with working rules`
4. `chore: add PR template and issue labels`
5. `docs: ADR-001 stack and repository layout`

**How to validate:** repository visible on GitHub, plan and issues created, tag `cp0`.
**Approve:** stack and layout (ADR-001).

---

## PHASE 1: Design

### CP1: Visual direction and wireframes
**Goal:** original identity and screen flow approved before any product code.

**Tasks**
- Define palette, typography and tone (modern, functional, not AI-looking, not copying the movie's identity).
- Mobile wireframes of the 5 screens: compose, link generated, closed envelope (recipient), screaming, burned/expired.
- Record design tokens in `docs/design/tokens.md`.
- Static HTML reference pages in `docs/design/`.

**Commits**
1. `docs: add visual direction and design tokens`
2. `docs: add mobile wireframes for the 5 screens`
3. `docs: add static HTML references for key screens`

**How to validate:** open the reference pages on the phone.
**Approve:** visual direction and flow.

---

## PHASE 2: Prototype (frontend only, no backend)

### CP2: Audio lab

*Superseded: see "Changes to the plan" at the top. Outcome: ADR-002.*

**Goal:** find out which voice really scares, comparing 3 approaches side by side in `lab/audio/index.html`.

**Approaches**
- **A. Baseline:** `speechSynthesis` with pitch and rate (what already exists).
- **B. Sender's recorded voice** (MediaRecorder) through effects: pitch, distortion (WaveShaper), reverb (Convolver), compression and a volume ramp.
- **C. Neural TTS voice generated on the server** (audio file) through the same effects. Only simulated with a sample audio in this checkpoint.

**Effects chain to test:** gain ramp, WaveShaper, room reverb, compressor, bass filter, volume tremolo.

**Comparison criteria:** is it scary? does it sound good on a phone with and without headphones? does it work on iOS Safari? latency? cost? privacy (storing a person's voice)?

**Commits**
1. `feat(lab): audio lab page with approach A (speechSynthesis)`
2. `feat(lab): approach B with recording and effects chain`
3. `feat(lab): approach C with sample audio and effects chain`
4. `docs: ADR-002 voice approach decision`

**How to validate:** listen to the three on the phone and note a score for each.
**Approve:** which approach moves forward (ADR-002).

### CP3: Prototype A, envelope and animations (no sound)
**Tasks**
- Create `frontend/` with Vue 3 + Vite + TS, CP1 tokens and screen structure.
- Envelope with 3D opening, smoke, escalating shake, unfolding paper.
- Fire and embers in Canvas, screen shake and flash.
- Respect `prefers-reduced-motion`.

**Commits**
1. `chore(frontend): scaffold Vue 3 + Vite + TS with design tokens`
2. `feat(frontend): envelope component with 3D open animation`
3. `feat(frontend): smoke and escalating shake before opening`
4. `feat(frontend): unfolding note with word-by-word reveal`
5. `feat(frontend): canvas fire and embers for the burn`
6. `feat(frontend): screen shake and flash`
7. `feat(frontend): reduced-motion fallback`

**How to validate:** run on the phone, tap the envelope, judge whether it feels like a living object.
**Approve:** animation quality.

### CP4: Prototype B, sound and voice
**Tasks**
- Implement the approach chosen in ADR-002 inside `frontend/`.
- Effects track: rumble before opening, tear on opening, scream, fire crackle.
- Audio unlock on first tap (iOS and Android).
- Sync the text word by word with the audio.

**Commits**
1. `feat(frontend): audio engine with unlock on first tap`
2. `feat(frontend): voice pipeline per ADR-002`
3. `feat(frontend): sound effects (rumble, tear, fire)`
4. `feat(frontend): word sync with voice`
5. `test(frontend): unit tests for audio engine state`

**How to validate:** Android and iPhone (if available), with and without headphones.
**Approve:** the scream.

### CP5: Prototype C, full flow and online preview
**Tasks**
- Flow of the 5 screens with mocked data (localStorage and in-memory state).
- Error screens: expired link, already burned, not found.
- Publish an online preview (Vercel, Netlify or GitHub Pages) so she can open it on the phone via link.
- Fan project notice in the footer.

**Commits**
1. `feat(frontend): compose screen with validation`
2. `feat(frontend): share screen with copy link`
3. `feat(frontend): recipient flow with mocked API`
4. `feat(frontend): burned, expired and not-found screens`
5. `ci: deploy preview of the prototype`
6. `docs: prototype walkthrough and known gaps`

**How to validate:** open the preview link on the phone and go through everything.

> **GATE: PROTOTYPE APPROVED.** Nothing from Phase 3 onward starts before the message "APPROVED CP5". Tag `prototype-approved`.

---

## PHASE 3: Backend

### CP6: Data model
**`Howler` model:** `id` (ULID), `token` (unique, random, long), `recipient_name`, `message`, `voice_settings` (json), `audio_path` (if ADR-002 requires it), `status` (`sealed`, `burned`, `expired`), `expires_at`, `opened_at`, timestamps.

**Commits**
1. `chore(backend): scaffold Laravel API with PostgreSQL via Docker`
2. `feat(backend): howlers migration and model`
3. `feat(backend): factory and seeders`
4. `test(backend): model and status transition tests`
5. `docs: ADR-003 data model and retention policy`

**How to validate:** `php artisan migrate:fresh --seed` and green tests.
**Approve:** model and retention policy.

### CP7: Single-open API
**Endpoints**
- `POST /api/howlers`: creates and returns the token.
- `GET /api/howlers/{token}`: only reports the state (`sealed`, `burned`, `expired`), **without revealing the content**.
- `POST /api/howlers/{token}/open`: returns the content **only once**, inside a transaction with `lockForUpdate`, and marks it `burned`. A second call returns `410 Gone`.
- `POST /api/howlers/{token}/report`: report abuse.

**Also:** validation, per-IP rate limit, a scheduled command that deletes the content of opened or expired howlers.

**Commits**
1. `feat(backend): create howler endpoint with validation`
2. `feat(backend): status endpoint without leaking content`
3. `feat(backend): atomic single-use open endpoint`
4. `feat(backend): rate limiting and report endpoint`
5. `feat(backend): scheduled purge of burned and expired howlers`
6. `test(backend): concurrency test for double open`
7. `docs: OpenAPI spec for the API`

**How to validate:** tests and a manual `curl` opening the same token twice.
**Approve:** API contract and single-open behavior.

---

## PHASE 4: Integration

### CP8: Frontend connected to the backend
**Tasks**
- Replace mocks with real calls, using a typed API client.
- Handle errors and states: loading, expired, burned, network down, send limit.
- If ADR-002 uses recorded voice or TTS: audio upload and download with deletion after opening.
- Share with the Web Share API, with a copy button as fallback.
- Link preview meta tags showing only the closed envelope, without leaking the message.

**Commits**
1. `feat(frontend): typed API client`
2. `feat(frontend): replace mocks with real API calls`
3. `feat(frontend): error and rate-limit states`
4. `feat(frontend): audio upload and cleanup flow (if per ADR-002)`
5. `feat(frontend): Web Share API and link preview meta`
6. `docs: local development guide`

**How to validate:** run front and back locally, send a howler to herself, open it on the phone, try opening the link again.
**Approve:** end-to-end flow.

---

## PHASE 5: Quality

### CP9: Tests, accessibility and CI
**Tasks**
- E2E with Playwright: create, open, burn, try to open again.
- Accessibility: keyboard focus, contrast, alt text, an alternative to intense animation.
- Loud volume warning and a mute button.
- Performance on phones (60 fps animations).
- GitHub Actions: lint, back and front tests, e2e.

**Commits**
1. `test(e2e): happy path and second-open failure`
2. `feat(frontend): volume warning and mute control`
3. `fix(frontend): accessibility issues from audit`
4. `perf(frontend): canvas particle budget on low-end phones`
5. `ci: lint, unit and e2e workflows`
6. `docs: test strategy and coverage notes`

**How to validate:** green CI on the PR and a test session on the phone.
**Approve:** overall quality.

---

## PHASE 6: Deploy

### CP10: Staging
**Tasks**
- Production Dockerfile and supporting `docker-compose`.
- Choose hosting (ADR-004), checking current prices and limits.
- Staging environment with database, HTTPS, environment variables, CORS and security headers.
- Automatic deploy from `main` to staging via GitHub Actions.
- Error monitoring (Sentry) and logs.

**Commits**
1. `chore: production Dockerfile and compose`
2. `docs: ADR-004 hosting decision`
3. `ci: deploy workflow to staging`
4. `chore(backend): production config, CORS and security headers`
5. `feat: error monitoring with Sentry`
6. `docs: deploy and rollback runbook`

**How to validate:** staging URL working on the phone, redeploy without errors, rollback tested.
**Approve:** environment and runbook.

### CP11: Production and launch
**Tasks**
- Domain, HTTPS and DNS.
- Manual deploy with approval (`workflow_dispatch`) to production.
- Post-deploy smoke test: create, open, burn, expire.
- README with GIF and fan project notice, license.
- Launch: Medium article (as before) and LinkedIn post in series tone ("Episode N: ...").

**Commits**
1. `ci: production deploy workflow with manual approval`
2. `chore: production domain and HTTPS`
3. `test: post-deploy smoke test`
4. `docs: README with demo GIF and fan-project notice`
5. `docs: changelog and v1.0.0 release notes`

**How to validate:** open the domain on the phone and run the whole flow in production.
**Approve:** publish. Tag `v1.0.0`.

---

## 4. Checkpoint table

| CP | Deliverable | Approval gate |
|----|-------------|---------------|
| 0 | Repo, plan, rules | Stack (ADR-001) |
| 1 | Visual direction and wireframes | Visuals and flow |
| 2 | Audio lab | Voice (ADR-002) |
| 3 | Envelope and animations | Animation |
| 4 | Sound and voice | The scream |
| 5 | Full flow and preview | **PROTOTYPE APPROVED** |
| 6 | Data model | ADR-003 |
| 7 | Single-open API | API contract |
| 8 | Front and back integration | End-to-end flow |
| 9 | Tests, a11y and CI | Quality |
| 10 | Staging | ADR-004 and runbook |
| 11 | Production and launch | Publish v1.0.0 |

## 5. `docs/project/STATUS.md` template

```
# Status
Current checkpoint: CP0
Last tag: none
Awaiting approval: no

## History
- (date) CP0 started
```
