# Design direction and tokens

[English](tokens.md) · [Português](../pt-BR/design/tokens.md)

## Direction

**Idea: scorched paper.** A letter that is about to burn. The whole product is one object (an envelope) and one moment (it burns), so the interface stays quiet and dark until that moment, and the fire is the only loud color.

- **Tone:** dry, a little theatrical, never cute. Short sentences. The product talks like a stage direction ("Tap to open."), not like an app ("Let's get started!").
- **Not the movie:** no gold trim, no crest, no gothic lettering, no parchment-scroll clichés. The envelope is a **closed brick red leaning orange** (deliberately not blood red and not the movie's bright red) with a **dark wax seal and a glowing crack**, the interface is **charcoal**, the accent is **ember orange**.
- **Not generic-AI:** no purple gradients, no glassmorphism, no emoji in UI, no rounded-everything. Flat surfaces, hard shadows, one serif with character, generous empty space.
- **Mobile first:** one column, thumb-reachable actions at the bottom, minimum tap target 48px.

## Color

| Token | Value | Use |
|-------|-------|-----|
| `--char-950` | `#100E0C` | page background |
| `--char-900` | `#1A1714` | cards, inputs |
| `--char-700` | `#2E2924` | borders, dividers |
| `--ash-400` | `#8C8378` | secondary text |
| `--paper-100` | `#F3EAD8` | primary text, note paper |
| `--env-500` | `#B5391A` | envelope body |
| `--env-700` | `#8A2A12` | envelope flap and shadow side |
| `--ember-500` | `#FF5B1F` | primary action, fire, seal glow |
| `--flare-400` | `#FFC247` | fire highlight, focus ring |
| `--ink-900` | `#1B1612` | text on paper and on ember buttons |

Measured contrast (WCAG AA needs 4.5:1 for body text): `--paper-100` on `--char-950` 16.1:1; `--ash-400` on `--char-950` 5.2:1 (4.8:1 on `--char-900`); `--ink-900` on `--ember-500` 5.8:1; `--ember-500` on `--char-950` 6.2:1; `--ink-900` on `--paper-100` 15.0:1; `--paper-100` on `--env-500` 4.9:1 (text on the envelope); `--env-500` on `--char-950` 3.3:1 (graphic, needs 3:1). All pass AA. Re-verify with a tool in CP9.

Error and state colors reuse the palette on purpose: **expired** uses `--ash-400`, **burned** uses `--ember-500` text on charcoal. There is no separate red or green.

## Typography

- **Display and message:** [Fraunces](https://fonts.google.com/specimen/Fraunces) (variable serif, optical size and "wonk" axes). Used for the title, the screamed message and the note.
- **UI:** [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans). Used for labels, buttons and helper text.
- Self-host both in CP3 (no third-party font request at runtime, better for privacy and speed).

| Token | Size / line-height | Font, weight |
|-------|--------------------|--------------|
| `--text-display` | 40 / 1.05 | Fraunces 700 |
| `--text-message` | 28 / 1.25 | Fraunces 600 (animated, word by word) |
| `--text-title` | 22 / 1.2 | Fraunces 600 |
| `--text-body` | 17 / 1.5 | Instrument Sans 400 |
| `--text-label` | 13 / 1.3, uppercase, +0.08em | Instrument Sans 600 |

Minimum body size is 16px on mobile (also avoids iOS zoom on focus for inputs).

## Spacing, shape, motion

- **Spacing scale (px):** 4, 8, 12, 16, 24, 32, 48, 64. Page side gutter: 20.
- **Radius:** `--radius-s` 4px (inputs, buttons), `--radius-m` 8px (cards). Nothing fully round except the char counter ring.
- **Shadow:** hard, offset, no blur: `4px 4px 0 var(--char-700)`; envelope uses `0 24px 0 -12px rgba(0,0,0,.4)` as a floor shadow.
- **Motion tokens:** `--ease-out` `cubic-bezier(.2,.8,.2,1)`, `--dur-fast` 120ms, `--dur-base` 240ms, `--dur-scene` 900ms. Shake intensity and fire are scripted in CP3, not tokenized.
- **Reduced motion:** with `prefers-reduced-motion`, no shake, no flash, no 3D flip. The note fades in, the burn becomes a slow fade to ash. Sound still plays (it is opt-in through the tap).

## Voice of the interface (copy)

| Moment | Text |
|--------|------|
| Compose title | "Say it loud." |
| Compose placeholder | "What do you need to get off your chest?" |
| Share | "It's sealed. Send this link. It works once." |
| Recipient, closed | "Someone sent you something." / "Tap to open." |
| Burned | "This howler has already been delivered." |
| Expired | "This howler expired before anyone opened it." |
| Not found | "Nothing here. Maybe it never existed." |
| Footer | "Fan project. No affiliation with Warner Bros. or J.K. Rowling." |
