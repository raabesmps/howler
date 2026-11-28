# ADR-006: Analytics on the write screen only

[English](ADR-006-analytics.md) · [Português](../pt-BR/decisions/ADR-006-analytics.md)

Status: accepted (2026-11-28)
Date: 2026-11-28

## Context

The owner wants Google Tag Manager on the site, to measure visits.

A GTM container is not one script: it runs whatever is switched on in its web panel (Google Analytics, advertising pixels, session recording such as Clarity or Hotjar), and that can change without a deploy. This product has two secrets (ADR-003, ADR-005):

1. **The link token**, which sits in the page address on the share screen (`#/sent/<token>`) and on the open screen (`#/h/<token>`). Anyone who sees a sealed howler's address can open it.
2. **The message**, typed on the write screen and shown while it screams.

An analytics tag that records page addresses, or a session recording, could send both to a third party.

## Decision

- **Nothing optional runs before consent (LGPD art. 7, I).** A cookie notice on the write screen asks first; GTM is loaded only after "Accept". "Refuse" is the same size, side by side. The details say who is responsible, what is measured and why, who receives it (Google, possibly outside Brazil), which cookies and for how long, what stays on the device, and the legal basis. A "Cookies" link in the footer reopens it; refusing after accepting deletes the Analytics cookies and reloads the page. The choice is kept in local storage with a version, so a change in what is collected asks everyone again (`frontend/src/consent.ts`, `CookieBanner.vue`, with unit tests).
- **GTM is loaded on the write screen only.** It has no token. The container is never loaded on the share, open, end or error screens.
- **Leaving the write screen after GTM has loaded is a full page load**, not an in-app navigation. A script cannot be unloaded, so a fresh page is the only way to be sure nothing of the container runs where a token is (`frontend/src/analytics.ts`, with unit tests).
- **The message and name fields are marked for masking** (`data-clarity-mask`, `data-hj-suppress`), as a second line of defence if a recording tool is ever switched on. The rule stays: do not switch on session recording.
- **Off unless the build has an id.** The id comes from the repository variable `PRODUCTION_GTM_ID` at deploy time. Development, tests and forks load nothing.
- **The Content-Security-Policy allows Google's tag and Analytics hosts only**, and still blocks inline scripts: the container is loaded by our own module instead of the usual inline snippet, and "Custom HTML" tags in the container cannot run.

## Alternatives considered

- **GTM on every screen, with a token-free address pushed to the dataLayer:** works only if the panel is set up to use it and nobody ever switches on a recording or a pixel. Too fragile for a product whose promise is that the message disappears.
- **GTM on every screen, as given:** rejected, for the reasons above.
- **A cookie-less, self-hosted analytics tool:** better for privacy, but the owner already uses GTM in her other sites.

## Consequences

- Analytics sees visits to the write screen and what happens there (for example the "Seal it" click). It does not see shares or opens. Opens can be counted from the server if that is ever needed, without any address.
- Sending a howler costs one extra page load (the share screen reloads). It is fast, and it only happens when GTM is on.
- Analytics only counts the visitors who accept, so the numbers are lower than the real traffic. That is the cost of asking first.
