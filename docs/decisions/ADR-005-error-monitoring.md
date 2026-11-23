# ADR-005: Error monitoring and what may leave the server

[English](ADR-005-error-monitoring.md) · [Português](../pt-BR/decisions/ADR-005-error-monitoring.md)

Status: accepted (2026-11-23)
Date: 2026-11-23

## Context

The plan asks for error monitoring (Sentry). An error tool is useful, and it is also a way for data to leave the product: by default it collects the request URL, headers, cookies, the request body, the user's address, the trail of clicks and queries before an error, and the props of the component that failed.

This product has two secrets, and the second is deleted on purpose:
- the **link token**: whoever holds it can open the howler. It is in the page address (after the `#`) and in the API path (`/api/howlers/{token}/open`);
- the **message**: it is removed from the database as soon as it is opened or expires (ADR-003). A copy in an error report would defeat that.

## Decision

Sentry is used for **errors only**, and a report is cut down to what is needed to find the bug: the exception, its stack trace, the route, the method and the release (the commit the code came from). Everything else is removed before the report leaves.

On the server (`backend/config/sentry.php`, `App\Support\SentryScrubber`):
- no personal data (`send_default_pii` off), the request body is never collected, no local variables;
- breadcrumbs (logs, cache, SQL, HTTP client, queue, notifications) are off;
- a `before_send` scrubber keeps only the request method and path, blanks every token in the path, the exception messages, the transaction name and any other text, and removes the user, the breadcrumbs and the extra data;
- expected outcomes are not reported: validation errors, an unknown link, an already-opened howler, rate limits and other HTTP exceptions;
- tracing is off.

In the page (`frontend/src/monitoring.ts`):
- the default integrations are replaced by the few needed for errors; there are no breadcrumbs (they record clicks, console output and navigation), no component props and no user, cookies, headers, bodies or query strings;
- the report's address is stripped of its fragment (where the token is) and its query;
- the Sentry code is a separate chunk, loaded only when the build has a DSN.

Both are **off unless a DSN is set**: `SENTRY_LARAVEL_DSN` on the server, `VITE_SENTRY_DSN` at build time. With no DSN nothing is sent and nothing is loaded. The page's DSN is public by design (it can only send events), so it is a repository variable, not a secret.

The Content-Security-Policy allows `connect-src https://*.sentry.io` for this.

## Alternatives considered

- **Log files only, no Sentry:** nothing leaves the server, but errors go unnoticed until someone reads the log, and a one-person project does not read logs daily. A good fallback, and the logs still exist.
- **Sentry with its defaults:** the most information per error, and it would put tokens and messages into a third party. Rejected.
- **Self-hosted error tracking:** keeps the data, but is one more thing to run and patch on the single VM. A possible later move.
- **Sentry Replay or performance tracing:** record what the person saw and did, which here is the secret itself. Rejected, not just left off.

## Consequences

- Reports are less detailed than Sentry's default (no breadcrumbs, no request data). Finding a bug relies on the exception, the stack trace and the release. That is the price of the privacy rule and it is accepted.
- The scrubber is unit tested with a realistic event (a token in the URL, headers, body, exception message, breadcrumbs and the IP): none of it may survive.
- When Sentry is switched on, the owner sends a test event (`php artisan sentry:test` on the server, and a thrown error in the page) and looks at it in Sentry to confirm no token or message appears. That last check needs a real project and is part of the runbook.
- A new place that could hold the token or the message (a new integration, a new log) must go through the scrubber or stay off.
