# Status

[English](STATUS.md) · [Português](pt-BR/STATUS.md)

Current checkpoint: CP7 done, CP8 next (frontend connected to the backend)
Last tag: cp7 (before it: cp6, prototype-approved, cp5, cp4, cp3)
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
- Still open from CP5: the online preview. It becomes the staging deploy of CP10 (issue #6).

## Next
- CP8: connect the frontend to the real API. The voice moves to the backend and is generated when the howler is created.
