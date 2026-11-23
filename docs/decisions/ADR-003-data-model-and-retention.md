# ADR-003: Data model and retention policy

[English](ADR-003-data-model-and-retention.md) · [Português](../pt-BR/decisions/ADR-003-data-model-and-retention.md)

Status: accepted (2026-11-23)
Date: 2026-11-23

## Context

A howler is a short message (up to 140 characters) plus the audio of its voice, opened exactly once and then gone. Privacy (LGPD) asks to keep the minimum and to delete the content after opening or expiry. The link must stay single use even when two requests arrive at the same moment (CP7). The voice audio is made when the howler is created and stored until it is opened (ADR-002).

## Decision

### The table `howlers`

| Column | Type | Meaning |
|--------|------|---------|
| `id` | ULID, primary key | Sortable, non-guessable identifier, internal |
| `token_hash` | `char(64)`, unique | SHA-256 of the link token. **The token itself is never stored** |
| `recipient_name` | `varchar(40)`, null | Optional name shown on the closed envelope. Not secret |
| `message` | `varchar(140)`, null | The content. Deleted once the howler is burned or expired |
| `audio_path` | `varchar(255)`, null | The voice file on a private disk. Deleted together with the message |
| `voice_settings` | `jsonb`, null | Which model, voice and treatment made the audio (for auditing the tone). No personal data |
| `status` | `varchar(16)` | `sealed`, `burned` or `expired` |
| `expires_at` | `timestamptz` | Created at plus 7 days |
| `opened_at` | `timestamptz`, null | When it was burned |
| `created_at`, `updated_at` | `timestamptz` | |

Index on `(status, expires_at)` for the purge.

### The rules live in the database too

Four `CHECK` constraints make a leftover message impossible even if the application has a bug:
1. `status` is one of the three values.
2. A sealed howler has a non-blank message.
3. A burned or expired howler has **no** message and **no** audio.
4. `opened_at` is set exactly when the status is `burned`.

### Lifecycle

`sealed` goes to `burned` (opened once) or to `expired` (nobody opened it before `expires_at`). There is no way back. A sealed howler past its `expires_at` is treated as expired immediately (`effectiveStatus`), even before the purge marks it.

### The token is stored as a hash (a deliberate deviation from the plan)

The plan lists a `token` column. Storing a long random token in plain text would hand out working links to anyone who gets a copy of the database. So the token is generated (256 random bits, URL safe), shown **once** when the howler is created, and only its SHA-256 is stored. Looking up a link hashes the received token. A fast hash is enough because the token is random and long, not a password.

### Retention

| Moment | What happens |
|--------|--------------|
| **Opened** | In the same transaction: status `burned`, `opened_at` set, message and `audio_path` cleared. The audio file is deleted after the commit. The content is returned to that one request only |
| **Expired** | A scheduled job (hourly, CP7) marks sealed howlers past their `expires_at` as `expired`, clears message and `audio_path` and deletes the audio file. Until it runs, the howler already behaves as expired |
| **Tombstone** | The row without content (id, hash, status, times) is kept **30 days** after it was opened or expired, so the link keeps saying "already delivered" or "expired". After that the job deletes the row and the link looks like it never existed |
| **Orphan files** | The same job deletes any audio file whose howler is no longer sealed |

Nothing about the person who opens the link is stored: no IP, no device. The rate limit uses a short-lived cache key (CP7). The report endpoint (CP7) will store only what it needs.

## Alternatives considered

- **Store the token in plain text, as the plan said:** simpler to debug, rejected for the reason above.
- **Delete the row when it is opened:** removes even the tombstone, but then an opened link says "not found" instead of "already delivered", which hurts the experience and confuses the recipient.
- **Soft deletes:** keeps the content by default, the opposite of what is wanted.
- **Encrypting the message at rest** with the application key: a good extra layer, but the content lives at most 7 days and is deleted at once on opening. It also needs a `text` column. Possible hardening later.
- **Auto-increment ids:** guessable and ordered. A ULID has neither problem and still sorts by time.

## Consequences

- CP7 opens a howler inside a transaction with `SELECT ... FOR UPDATE`, calls `burn()` and deletes the audio after the commit. A second concurrent request waits, then finds the howler burned and gets `410 Gone`. This needs PostgreSQL (the tests run on it).
- The seeder uses fixed tokens for development only and refuses to run in production.
- The tombstone period (30 days) and the hourly purge are settings that can change without touching the schema.
- The raw token cannot be recovered: if a sender loses the link, there is no way to show it again. That is intended.
