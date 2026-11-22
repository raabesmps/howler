# Mobile wireframes (5 screens)

[English](wireframes.md) · [Português](../pt-BR/design/wireframes.md)

Target viewport: 390 x 844 (iPhone 14) down to 360 x 640 (small Android). One column, 20px gutters, primary action pinned to the bottom within thumb reach. Colored mock-ups of these screens: [reference.html](reference.html).

## Flow

```
Sender                                   Recipient
  1. Compose ──► 2. Share link ─ (sends link outside the app) ─► 3. Closed envelope
                                                                      │ tap
                                                                      ▼
                                                               4. Screaming
                                                                      │ ends
                                                                      ▼
                                                                5. Burned
                                       (opening the link again, or after 7 days: 5. Burned / Expired)
```

Screen 5 has three variants that share one layout: **burned**, **expired**, **not found**.

## 1. Compose (sender)

```
┌──────────────────────┐
│ HOWLER               │
│                      │
│ Say it loud.         │  Fraunces display
│                      │
│ TO (OPTIONAL)        │
│ ┌──────────────────┐ │
│ │ Name             │ │
│ └──────────────────┘ │
│ MESSAGE              │
│ ┌──────────────────┐ │
│ │ What do you need │ │
│ │ to get off your  │ │
│ │ chest?           │ │
│ │                  │ │
│ └──────────────────┘ │
│              23/140  │  turns ember at 120+
│                      │
│ Link works once.     │
│ Expires in 7 days.   │
│                      │
│ ┌──────────────────┐ │
│ │   Seal it        │ │  primary, bottom
│ └──────────────────┘ │
│ fan-project notice   │
└──────────────────────┘
```

- Message required, 1 to 140 characters, counter live. Name optional, max 40.
- Button disabled while empty; inline error text, never only color.
- Textarea font is 16px or larger (no iOS focus zoom).

## 2. Link generated (sender)

```
┌──────────────────────┐
│ HOWLER               │
│                      │
│   [sealed envelope]  │  static, small, kraft
│                      │
│ It's sealed.         │
│ Send this link.      │
│ It works once.       │
│                      │
│ ┌──────────────────┐ │
│ │ howler.app/x/9f… │ │  read-only, select-all on tap
│ └──────────────────┘ │
│ Expires in 7 days    │
│                      │
│ ┌──────────────────┐ │
│ │ Share            │ │  Web Share API
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │ Copy link        │ │  fallback, shows "Copied"
│ └──────────────────┘ │
│ Write another        │  text link
└──────────────────────┘
```

- The sender cannot re-read the message here. Showing the link is the only output (privacy).
- Warning line: "Opening this link yourself will burn it."

## 3. Closed envelope (recipient)

```
┌──────────────────────┐
│                      │
│                      │
│                      │
│     ┌──────────┐     │
│     │ ╲      ╱ │     │  kraft envelope,
│     │  ╲ ◉  ╱  │     │  seal crack glows ember,
│     │   ╲  ╱   │     │  slow idle breathing
│     └──────────┘     │
│                      │
│ Someone sent you     │
│ something.           │
│ For: Ana             │  only if a name was set
│                      │
│ ┌──────────────────┐ │
│ │ Tap to open      │ │  primary; this tap unlocks audio
│ └──────────────────┘ │
│ Loud sound. Turn the │
│ volume down first.   │
└──────────────────────┘
```

- The whole envelope and the button are tappable; both count as the audio-unlock gesture.
- Opening is irreversible; the page states it ("This can only be opened once.").
- The page does not call the open endpoint until the tap (link previews and bots must not burn it).

## 4. Screaming (recipient)

```
┌──────────────────────┐
│ ░ smoke ░░ embers ░  │  canvas layer, full screen
│                      │
│   ┌──────────────┐   │
│   │              │   │  note unfolds out of the
│   │  YOU  NEVER  │   │  envelope; words appear
│   │  ANSWER  MY  │   │  in sync with the voice,
│   │  CALLS       │   │  current word highlighted
│   │              │   │
│   └──────────────┘   │
│ ▓▓▓ fire at edges ▓▓ │
│                      │
│ [mute]               │  small, top corner, 48px target
└──────────────────────┘
```

- Sequence: rumble and growing shake, flap flies open, smoke, note unfolds, voice screams while words appear, fire eats the note from the edges, screen flash, ash.
- Screen shake and flash are skipped under reduced motion (see tokens).
- Text is always real DOM text (selectable by screen readers), also announced with `aria-live="polite"` once, not word by word.

## 5. Burned / expired / not found (recipient or anyone)

```
┌──────────────────────┐
│                      │
│                      │
│     [ash pile or     │
│      empty envelope] │
│                      │
│ This howler has      │
│ already been         │
│ delivered.           │  variant text changes
│                      │
│ Nobody can read it   │
│ again. That's the    │
│ point.               │
│                      │
│ ┌──────────────────┐ │
│ │ Send your own    │ │  primary, goes to screen 1
│ └──────────────────┘ │
│ fan-project notice   │
└──────────────────────┘
```

| Variant | Illustration | Headline |
|---------|--------------|----------|
| burned | ash and a few embers | This howler has already been delivered. |
| expired | grey, unopened envelope | This howler expired before anyone opened it. |
| not found | open empty envelope | Nothing here. Maybe it never existed. |

No variant reveals whether a message ever existed beyond what its own status implies; "not found" is also what a wrong token shows.

## Report

A small "Report this" text link lives on screens 3 and 5 (footer area), opening a short confirm sheet. Wired in CP7/CP8; shown as a non-functional link in the prototype.
