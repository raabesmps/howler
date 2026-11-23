# Status

[English](STATUS.md) · [Português](pt-BR/STATUS.md)

Current checkpoint: CP6 (data model)
Last tag: prototype-approved (also cp3, cp4, cp5)
Awaiting approval: yes (CP6 pull request)

## History
- 2026-11-22 CP0 approved, merged (PR #13), tag `cp0`
- 2026-11-22 CP1 approved, merged (PR #14), tag `cp1`
- 2026-11-22 CP2 audio lab built (PR #15, closed without merge). After testing, the direction changed: nobody picks the voice, the real flow has a fixed tone. ADR-002 accepted. The lab is kept on the branch `archive/audio-lab`.
- 2026-11-22 Voice tone tuned by ear over several rounds and fixed: gpt-audio, voice Coral, clean loud treatment, no echo.
- 2026-11-23 CP3 to CP5 delivered as one prototype and approved, merged (PR #16), tags `cp3`, `cp4`, `cp5` and `prototype-approved`. Gate "prototype approved" passed: Phase 3 (backend) can start.
- 2026-11-23 Hosting direction decided: one Google Cloud VM, not Netlify (ADR-004).
- 2026-11-23 CP6 started: Docker installed inside WSL, Laravel 13 on PostgreSQL in containers, the howlers table and model, factory and seeder, 22 tests, ADR-003.
- Still open from CP5: the online preview. It becomes the staging deploy of CP10 (issue #6).
