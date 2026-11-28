# Changelog

[English](CHANGELOG.md) · [Português](CHANGELOG.pt-BR.md)

All notable changes to Howler. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/). Each release is also a tag and a [GitHub release](https://github.com/raabesmps/howler/releases). The story of the first one, with its known limits, is in the [v1.0.0 release notes](docs/project/releases/v1.0.0.md).

## [Unreleased]

### Added
- **Credits:** "Made by Raabe" with a link to her LinkedIn, in the footer of every screen.
- **Google Tag Manager, on the write screen only** ([ADR-006](docs/decisions/ADR-006-analytics.md)): never where a link token or a message could be seen. Off unless the build has an id, and only after the visitor accepts the new cookie notice (LGPD): refuse and accept side by side, the details of what is collected, and a "Cookies" link in the footer to change the choice.
- **Portuguese and English.** The whole interface comes in both languages. The language follows the browser, a button in the top right corner switches it, and the choice is remembered on the device. The message a person writes is never translated.
- **Light and dark theme**, a second button next to it. Dark is the default (the brand's own); the scream and the burn stay dark in either theme.
- **End-to-end tests** for both (39 in total), including the accessibility audit in the light theme and in Portuguese.

### Changed
- **The write screen** is a compact note with its button right under it, centred on the screen, instead of a page to fill. The text gets smaller as it grows so it always fits.
- **The envelope talks.** The flap is hinged like an upper lip and the front pocket is the lower jaw: they open and close about five times a second while the voice is loud, wider when it is louder, and shut in the pauses. The letter stands above the envelope, where it can be read, and stays there until the burn starts.
- **The share screen** has smaller buttons, side by side, with icons, and a green "Copied".
- **The scream and the burn** are a dark stage covering the whole window, which removes the visible edge of the page column behind them.
- **A shorter link.** The token in a howler link is now 22 characters (128 bits, as strong as a UUID) instead of 43. Links made before still work. See the update in [ADR-003](docs/decisions/ADR-003-data-model-and-retention.md).

Next: refining the layout.

## [1.0.0] - 2026-11-24

The first release: the whole product, live at <https://howler.aquifunciona.dev.br>.

### Added
- **The product.** Write a message of up to 140 characters (and an optional name), get a one-time link. The recipient sees a closed envelope that rumbles, tears open and screams the message in a fixed, hysterical-mother voice, shaking with the loudness of the audio, then closes, burns from the centre outward and falls into powder. The link works once (checkpoints CP0 to CP5, tags `cp0` to `cp5`).
- **The voice.** Made on the server when the howler is created, with a pinned `gpt-audio` snapshot and the voice Coral; the transcript must match the text word for word (one retry), otherwise the browser's own voice reads it. Delivered with the one and only opening and deleted right after. Cleaned and levelled on the device (no echo, no hiss). A mute control before and during the scream, remembered between visits ([ADR-002](docs/decisions/ADR-002-voice-approach.md), CP4, CP8, CP9).
- **The API.** `POST /api/howlers`, `GET /api/howlers/{token}` (state only), `POST /api/howlers/{token}/open` (once, inside a transaction with `SELECT … FOR UPDATE`, `410 Gone` afterwards) and `POST /api/howlers/{token}/report`. Per-IP rate limits and a daily budget of server voices. OpenAPI 3.1 contract in [docs/api](docs/api/openapi.yaml) (CP7).
- **Privacy by construction.** Tokens are stored only as SHA-256 hashes; opening or expiring deletes the message; database `CHECK` constraints forbid content on a burned or expired howler; an hourly purge removes tombstones after 30 days; no IP or device is kept ([ADR-003](docs/decisions/ADR-003-data-model-and-retention.md), CP6).
- **Error monitoring** with Sentry, off unless a DSN is set, with a scrubber so tokens, messages, IPs, headers and breadcrumbs never leave ([ADR-005](docs/decisions/ADR-005-error-monitoring.md), CP10).
- **Tests and accessibility.** PHPUnit on PostgreSQL (including a 12-process concurrency test), Vitest, Playwright end to end on a phone viewport, axe checks on every screen, keyboard-only and reduced-motion paths, a loud-sound warning (CP9).
- **Performance.** The canvas burn watches its frame time and steps down through four quality levels on slow phones (CP9).
- **Delivery.** Production images (Laravel on PHP-FPM, Caddy with automatic HTTPS), Docker Compose, a one-VM deployment on Google Cloud, a deploy workflow that is manual and needs an approval, a database dump before each deploy, automatic rollback when the new version is unhealthy or the smoke test fails, a daily backup, and a runbook ([ADR-004](docs/decisions/ADR-004-hosting.md), CP10 and CP11).
- **Post-deploy smoke test** (`deploy/smoke.sh`): a howler's whole life against the real site, including an expiry and the purge (CP11).
- **Documentation** in English with a Portuguese twin of every document, an index, a checker for links and twins that runs in CI, and a README with the architecture and engineering notes.
- **License:** MIT.

### Changed
- Search engines may index the home page (`robots.txt`, no `noindex`). A howler link cannot be indexed: its token sits after the `#`, which crawlers never request (CP11).
- Production runs on the VM that served the first deploy, at the same domain. There is no online staging ([ADR-004](docs/decisions/ADR-004-hosting.md), CP11).

### Security
- Every API answer carries `nosniff`, `no-referrer`, a restrictive Content-Security-Policy and `same-origin` resource policy; the page gets HSTS, a Content-Security-Policy and frame protections from Caddy; request bodies over 8 KB are refused at the edge; CORS is closed by default.
- Secrets live only in the server's environment file and in GitHub secrets, never in the repository or an image. The deploy pins the server's SSH host key.

### Known limits
See the [release notes](docs/project/releases/v1.0.0.md): the production VM is small, Sentry is not switched on yet, SSH is open to the internet, and only Chromium is tested.

[Unreleased]: https://github.com/raabesmps/howler/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/raabesmps/howler/releases/tag/v1.0.0
