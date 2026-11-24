# Status

[English](STATUS.md) · [Português](../pt-BR/project/STATUS.md)

Current checkpoint: CP10 (staging): LIVE at https://howler.aquifunciona.dev.br. Left to close it: a pass on the phone, Sentry, the Google Cloud spend and uptime alerts, and restricting SSH to the owner's address
Last tag: cp10 (before it: cp9, cp8, cp7, cp6, prototype-approved, cp5, cp4, cp3)
Awaiting approval: no (issue #11 closes after the first real deploy)

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
- 2026-11-23 CP10 approved, merged (PR #26), tag `cp10`. Built: production images (app on PHP-FPM, web on Caddy), the production compose file, deploy, rollback and backup scripts, the staging deploy workflow (off until `STAGING_ENABLED` is set), CORS and security headers, error monitoring with Sentry that never sends tokens or messages (ADR-005), and the runbook. Checked on this machine with the real images: deploy, the whole flow over https, a broken version rolling back by itself. Not done yet: the VM, the domain, the GitHub settings and the first real deploy (owner).
- 2026-11-24 First real deploy: staging is live on a Google Cloud e2-micro (us-central1-c) behind Caddy with a Let's Encrypt certificate, DNS on Cloudflare in DNS-only mode. Checked from outside and inside: https and security headers, the whole flow in a browser with the real voice (no console or CSP errors), one-time opening, per-IP rate limits seeing the real address, the hourly purge scheduled, a daily backup in cron, an automatic redeploy on merge, and both rollbacks (on the server, and by deploying an older tag from the workflow). Found and fixed on the way: the app healthcheck (BusyBox pgrep), CRLF in secrets saved from PowerShell, and cron missing on Ubuntu minimal.
- Refinement of the layout and a pass through docs/guides/TESTING.md are planned after the phases are finished (requested by the owner).
- Still open from CP5: the online preview. It becomes the staging deploy of CP10 (issue #6).

## Next
- Finish CP10 with the first real deploy (the owner creates the VM and sets the GitHub variables: docs/guides/DEPLOYMENT.md), then CP11: production and launch.
