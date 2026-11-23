# Status

[English](STATUS.md) · [Português](pt-BR/STATUS.md)

Current checkpoint: CP9 done, CP10 next (staging deploy)
Last tag: cp9 (before it: cp8, cp7, cp6, prototype-approved, cp5, cp4, cp3)
Awaiting approval: no

## History
- 2026-11-22 CP0 approved, merged (PR #13), tag `cp0`
- 2026-11-22 CP1 approved, merged (PR #14), tag `cp1`
- 2026-11-22 CP2 audio lab built (PR #15, closed without merge). After testing, the direction changed: nobody picks the voice, the real flow has a fixed tone. ADR-002 accepted. The lab is kept on the branch `archive/audio-lab`.
- 2026-11-22 Voice tone tuned by ear over several rounds and fixed: gpt-audio, voice Coral, clean loud treatment, no echo.
- 2026-11-23 CP3 to CP5 delivered as one prototype and approved, merged (PR #16), tags `cp3`, `cp4`, `cp5` and `prototype-approved`. Gate "prototype approved" passed: Phase 3 (backend) can start.
- 2026-11-23 Hosting decided: one Google Cloud VM, not Netlify (ADR-004, PR #18, merged).
- 2026-11-23 CP6 approved, merged (PR #19), tag `cp6`: Docker inside WSL, Laravel 13 on PostgreSQL, the howlers table with database-level rules, 22 tests, ADR-003.
- 2026-11-23 CP7 approved, merged (PR #20), tag `cp7`. Built: create, state, atomic open, report, per-IP rate limits, hourly purge, OpenAPI contract, 57 tests including a 12-process concurrency test. The branch protection on main now requires both CI checks (`frontend` and `backend`).
- 2026-11-23 CP8 approved, merged (PR #22), tag `cp8`. Built: typed API client, the real flow end to end, error and rate-limit states, report button, Web Share and link preview, the voice moved to the backend (made at creation, delivered once on open), development guide. Verified in a real browser against the real backend, PostgreSQL and the OpenAI voice.
- 2026-11-23 CP9 approved, merged (PR #24), tag `cp9`; main now requires the `e2e` check too. Built: 33 end-to-end tests in a real browser (journey, single use, failures, sound, accessibility with axe), a loud-sound warning and a mute control that survives and silences the browser voice, the accessibility fixes the audit found, a performance budget for the burn (23 to 52 fps on the test machine), the `e2e` job in CI, and the test strategy doc.
- Refinement of the layout and a pass through docs/TESTING.md are planned after the phases are finished (requested by the owner).
- Still open from CP5: the online preview. It becomes the staging deploy of CP10 (issue #6).

## Next
- CP10: deploy to a Google Cloud VM (Docker Compose, Caddy, GitHub Actions over SSH) and the staging preview.
