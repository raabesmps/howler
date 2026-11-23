# API

[English](README.md) · [Português](../pt-BR/api/README.md)

The contract is [openapi.yaml](openapi.yaml) (OpenAPI 3.1). Paste it into any OpenAPI viewer, or into [editor.swagger.io](https://editor.swagger.io), to browse it.

| Method and path | What it does | Answers |
|-----------------|--------------|---------|
| `POST /api/howlers` | Creates a howler and returns the one-time token | 201, 422, 429 |
| `GET /api/howlers/{token}` | The state only: `sealed`, `burned` or `expired`. Never the message | 200, 404, 429 |
| `POST /api/howlers/{token}/open` | Delivers the message to the first caller and burns it | 200, 404, **410**, 429 |
| `POST /api/howlers/{token}/report` | Reports abuse (reason only, no message, no reporter) | 201, 404, 422, 429 |

## The single-open behavior

1. The row is read with `SELECT ... FOR UPDATE` inside a transaction.
2. The first request sets the status to `burned`, deletes the message and commits. It alone receives the message.
3. A simultaneous request waits for the lock, then reads the committed row, sees `burned` and gets `410 Gone`.

`ConcurrentOpenTest` proves it with 12 separate PHP processes firing at the same instant against PostgreSQL: exactly one gets the message. Removing the `lockForUpdate()` makes that test fail (two get it), so the test really guards the lock.

## Try it by hand

```
curl -X POST http://localhost:8000/api/howlers -H 'Content-Type: application/json' -d '{"message":"HOW DARE YOU!","recipient_name":"Ron"}'
curl http://localhost:8000/api/howlers/<token>              # {"status":"sealed","recipient_name":"Ron"}
curl -X POST http://localhost:8000/api/howlers/<token>/open  # 200 with the message
curl -X POST http://localhost:8000/api/howlers/<token>/open  # 410 {"status":"burned", ...}
```

## Decisions worth knowing

- **Opening is a POST, state is a GET.** Chat apps and crawlers unfurl links with GET. If opening were a GET they would burn every howler before the recipient saw it.
- **404 versus 410.** An unknown token is 404. A known one that is burned or expired is 410 (tombstones are kept for 30 days, ADR-003). After the purge, the link is a 404 again.
- **No identity is stored.** Not on reports, not on openings. The IP is used only as a short-lived rate-limit key.
- **Limits are per IP** and need the real client address behind the reverse proxy: set `TRUSTED_PROXIES` (CP10).
- **The voice is made when the howler is created**, on the server, with the key only on the server (`VoiceGenerator`). The create response says whether it worked (`voice`). It is stored in private storage and delivered inside the one and only open response (`audio`, base64 WAV), then deleted. The state endpoint never carries it.
- **A failed voice never fails the howler.** No key, an upstream error, a transcript that does not match the line, or the daily budget (`HOWLER_VOICE_DAILY_LIMIT`) all end the same way: the howler is created with `voice: false` and the browser reads it with its own voice.
