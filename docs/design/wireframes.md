# Mobile wireframes (5 screens)

[English](wireframes.md) · [Português](../pt-BR/design/wireframes.md)

Target viewport: 390 x 844 (iPhone 14) down to 360 x 640 (small Android). One column, 20px gutters, primary action pinned to the bottom within thumb reach. Colored mock-ups of these screens: [reference.html](reference.html).

## Flow

```
Sender                                   Recipient
  1. Compose ──► 2. Share link ─ (sends link outside the app) ─► 3. Closed envelope
                                                                      │ tap
                                                                      ▼
                                                               4a. Screaming ──► 4b. Burning
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
│   [sealed envelope]  │  static, small, brick red
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
│     │ ╲      ╱ │     │  brick-red envelope,
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

## 4a. Screaming (recipient)

```
┌──────────────────────┐
│                [mute]│  top corner, 48px target
│                      │
│     ┌──────────┐     │
│     │ YOU      │     │  the letter rises out of the
│     │ NEVER    │     │  envelope; words appear in
│     │ ANSWER   │     │  sync with the voice, current
│     │ MY CALLS │     │  word highlighted
│  ╲  │          │  ╱  │  flap works like a jaw
│   ┌─┴──╲    ╱──┴─┐   │
│   │      ╲╱      │   │  brick-red envelope, open,
│   └──────────────┘   │  body shakes as if it were talking
└──────────────────────┘
```

- **The envelope is the speaker.** It does not shake with a uniform rumble. It moves in **bursts that follow the speech rhythm**: short, sharp hits when a word is stressed, near-stillness in the pauses. Body squashes and stretches a little (taller on the hit, flatter on release), tilts a few degrees left and right, and the **flap opens and closes like a jaw** in time with the voice.
- The letter slides up out of the envelope pocket at the start (about 0.6s) and then rides along with the envelope's motion.
- **No fire in this screen.** Fire belongs to 4b.
- Under reduced motion: no shake and no flap movement; the letter fades in above a still, open envelope and the words highlight in sync.
- Text is always real DOM text (selectable by screen readers), also announced with `aria-live="polite"` once, not word by word.
- Implementation note for CP3/CP4: drive the burst rhythm from the voice's loudness envelope (Web Audio `AnalyserNode`) instead of fixed keyframes, so the envelope really moves with the speech. The CSS keyframes in `reference.html` are a stand-in.

## 4b. Burning (recipient)

```
┌──────────────────────┐
│                      │
│   ┌──────────────┐   │   t0: the seal cracks, a flame
│   │  ~ (fire) ~  │   │       catches at the CENTRE
│   │              │   │   t1: a ragged hole of burning paper
│   └──────────────┘   │       opens outward, flames lick up
│        ▫  ▪  ▫       │   t2: charred bits break off and fall
│          ▲           │   t3: they crumble to fine powder
│       ▂▃▅▇▅▃▂        │       and settle into a small heap
└──────────────────────┘   then: screen 5a (burned)
```

- **Direction: from the centre outward.** The fire starts at the seal and the burning edge spreads outward, irregular and organic, reaching the four corners last.
- **The burning edge reads as real burning paper:** a thin bright yellow-orange glowing rim, then a band of black char, then the untouched red paper. Real flames (particles, additive light) rise from the rim and lick over the paper; a few sparks float up. No smoke clouds.
- **Paper falls and becomes powder:** irregular charred bits (still glowing at the edges for a moment) break off the rim and fall, drifting a little toward the centre. They crumble as they fall, shedding fine 1px grains, and what reaches the ground is **powder, not blobs**. The grains pile up like fine sand into a **small mound** (it keeps an angle of repose, so it grows as a heap, not a flat layer).
- Hand-off to 5a (this howler has already been delivered).
- Duration target: about 6 to 7 seconds of burn, then 5a. The 11.5s loop in `reference.html` is only for reviewing.
- **Implementation:** Canvas 2D (see `burn-ref.js`, about 300 lines, no dependencies). A noise map drives the burn front, flame and spark particles use pre-rendered sprites with additive blending, and the powder heap is a height map. The same approach is meant for production in CP3, with a particle budget on low-end phones (CP9). Open `reference.html?burnT=5.5` to freeze the animation at a given second while reviewing.
- Under reduced motion: no flames; a slow fade of the envelope to the powder mound.

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
