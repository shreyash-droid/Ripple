---
name: Ripple
description: A near-black instrument panel lit by one ice-cyan wash, where every number is a measurement and every control is a bracketed command.
colors:
  black-canvas: "#0a0a0b"
  surface-1: "#161618"
  surface-2: "#1d1d20"
  surface-3: "#252528"
  emerald-300: "#8dd9ed"
  emerald-500: "#5cc8e8"
  emerald-600: "#3dafd1"
  emerald-700: "#2b8caa"
  emerald-glow: "rgba(92, 200, 232, 0.35)"
  text-primary: "#ededef"
  text-secondary: "#8a8a90"
  text-tertiary: "#5c5c62"
  text-on-accent: "#062028"
  rl-quiet: "#9a9aa2"
  border-faint: "rgba(255, 255, 255, 0.06)"
  border-soft: "rgba(255, 255, 255, 0.1)"
  border-strong: "rgba(255, 255, 255, 0.16)"
  cy-line: "rgba(92, 200, 232, 0.22)"
  amber-500: "#e8a23d"
  red-500: "#e5484d"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(2.1rem, 7.4vw, 5.5rem)"
    fontWeight: 700
    lineHeight: 0.97
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(1.55rem, 3.3vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(1.05rem, 1.9vw, 1.4rem)"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  lede:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(1rem, 1.5vw, 1.15rem)"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  body-sm:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  command:
    fontFamily: "JetBrains Mono, ui-monospace, SF Mono, monospace"
    fontSize: "11.5px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.16em"
  meta:
    fontFamily: "JetBrains Mono, ui-monospace, SF Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0.12em"
  measurement:
    fontFamily: "JetBrains Mono, ui-monospace, SF Mono, monospace"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tabular-nums"
  wordmark:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontStyle: "italic"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
  pill: "999px"
  full: "50%"
  frame: "26px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "20px"
  space-6: "24px"
  space-7: "32px"
  space-8: "40px"
  space-9: "48px"
  space-10: "64px"
  space-11: "80px"
  space-12: "96px"
  space-13: "128px"
components:
  command:
    textColor: "{colors.text-primary}"
    typography: "{typography.command}"
    padding: "10px 4px"
  command-accent:
    textColor: "{colors.emerald-300}"
    typography: "{typography.command}"
    padding: "10px 4px"
  command-hover:
    textColor: "{colors.emerald-500}"
    typography: "{typography.command}"
  nav-command:
    textColor: "{colors.text-secondary}"
    typography: "{typography.meta}"
    padding: "8px 4px"
  register-row:
    textColor: "{colors.text-secondary}"
    typography: "{typography.body}"
    padding: "17px 4px"
  register-row-active:
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    padding: "17px 4px"
  score-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "22px 24px 24px"
  chip-criterion:
    textColor: "{colors.emerald-300}"
    typography: "{typography.command}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  mode-pill:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  mode-pill-active:
    backgroundColor: "#132c36"
    textColor: "{colors.emerald-300}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  composer:
    backgroundColor: "rgba(22, 22, 24, 0.85)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "10px"
  send-button:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text-tertiary}"
    rounded: "{rounded.full}"
    height: "38px"
    width: "38px"
  send-button-ready:
    backgroundColor: "{colors.emerald-500}"
    textColor: "{colors.text-on-accent}"
    rounded: "{rounded.full}"
    height: "38px"
    width: "38px"
  message-bubble-user:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
---

# Design System: Ripple

## Overview

**Creative North Star: "The Instrument Panel"**

Ripple looks like measuring equipment that happens to talk. The canvas is near-black (#0a0a0b), the only light in the room is a single ice-cyan wash, and everything drawn on top of that is either a rule, an address, a numeral, or a sentence. The product's claim is that you will be scored and the number will move; the surface's job is to make that number look like an instrument reading rather than a marketing figure, which is why measurements are set in JetBrains Mono with tabular numerals and voice is set in Inter at extreme size contrast.

The system ships in two namespaces that share one token file and one control idiom. `.h2c-` is the chat application — the Operate world, where surfaces are tonal cards on a rounded 8–22px scale, the composer floats over a moving ambient field, and depth comes from real shadow tokens. `.rl-` is the "How it works" surface — the Persuade world, where there are almost no cards at all: structure is carried by hairline rules, a dotted field and one inset console frame, and the page's light is anchored to the document so it scrolls away and leaves the reading dark. The split is deliberate. They are recognisably the same brand because they share the palette, the wordmark-and-orb, the type pairing and the bracketed monospace command; they are not the same layout language, and neither should be flattened into the other.

The confirmed refusals are narrow and hold: no gradient text anywhere, no second decorative hue on the Persuade surface, no glass used as decoration, and no invented commercial proof (no logos, prices, testimonials or benchmarks — where a demonstration is synthetic it is labelled synthetic on the page, twice, because a label does not survive a section boundary).

**Key Characteristics:**
- Near-black canvas with a single ice-cyan accent; the accent is light, not paint.
- Two type voices only: Inter for everything a person says, JetBrains Mono for addresses, labels and measurements.
- Bracketed monospace is the entire link/action vocabulary at brand level.
- Hairline rules and dotted fields carry structure on the Persuade surface; tonal cards carry it in the app.
- Numbers are always tabular and always on the 0–100 scale.
- Motion is authored and rare: one boot sequence, one reveal, one meter fill.

## Colors

A one-accent palette: a five-step cool neutral ramp from near-black to near-white, lit by a single ice-cyan family, with amber and red admitted only as score bands.

### Primary
- **Ice Cyan** (`emerald-500`, #5cc8e8): the system's only light. Used as the radial wash behind frames, the core tile, the live status dot, the active-row marker, the ready send button, bracket hover, and the one bar in the trend chart that clears the threshold. **The token family is named `emerald-*` and it is not green** — it is ice-cyan, and has been since the tokens were ported. The names are locked; read the values, not the labels.
- **Ice Cyan Light** (`emerald-300`, #8dd9ed): cyan-on-dark *text*. Criterion chips, measurement figures, accent command labels, footer link hover. Where cyan has to be read rather than seen, it is this step, not the 500.
- **Ice Cyan Deep** (`emerald-700`, #2b8caa): the far stop of every cyan gradient (orb, core tile) and the resting colour of accent brackets.
- **Cyan Glow** (`emerald-glow`, rgba(92,200,232,0.35)): halo behind the orb, the status dot, and the active-row marker. Never a fill.

### Secondary
There is no second brand hue. Amber (`amber-500`, #e8a23d) and red (`red-500`, #e5484d) exist only as the mid and low bands of the score scale, and only inside a scorecard — a quoted product artifact. They are the product's data speaking, not the brand's voice.

### Neutral
- **Canvas** (`black-canvas`, #0a0a0b): the page ground, everywhere, both namespaces.
- **Card** (`surface-1`, #161618): the app's cards, sidebar and popovers, and the landing scorecard.
- **Raised** (`surface-2`, #1d1d20): user message bubbles, mode pills at rest, hover ground.
- **Overlay** (`surface-3`, #252528): the hovered/pressed step above raised, and the idle send button.
- **Body** (`text-primary`, #ededef): all display type, claims, questions, and read prose.
- **Muted** (`text-secondary`, #8a8a90): supporting prose, flanking captions, answers being critiqued.
- **Quiet** (`rl-quiet`, #9a9aa2): the Persuade surface's own step for captions, addresses, notes and hints.
- **Faint** (`text-tertiary`, #5c5c62): decorative-only greys and app-shell placeholder text.
- **Hairline / Soft / Emphasis** (`border-faint` .06, `border-soft` .10, `border-strong` .16 white): the three-step rule vocabulary. Faint is the register rule, soft is a card edge, strong is an axis or a quoted-source spine.
- **Cyan Hairline** (`cy-line`, rgba(92,200,232,0.22)): the console frame's own border, the one place a rule is tinted.

### Named Rules
**The Token Names Lie Rule.** `--emerald-*` is ice-cyan (#5cc8e8). The names are a locked port artifact and will not be renamed. Never pick a colour by reading a token name in this project; resolve the value.

**The One Light Rule.** Cyan is the only source of light on a screen, and it appears as wash, halo, hairline, a single filled marker, or a number — never as a large filled area of chrome. If two cyan objects are competing for the eye in one viewport, one of them is decoration and should be removed.

**The Bands Are Data Rule.** Amber and red may only be used to encode a score band inside a scorecard, where the product itself renders them. Outside a scorecard the same information goes monochrome and cyan marks only the value that crosses the threshold (the trend chart at `STRONG = 75` is the reference implementation). A colour ramp used as the page's own voice violates the one-light palette.

**The Quiet Step Rule.** On the Persuade surface, quiet text is #9a9aa2, not `--text-tertiary`. #5c5c62 measures ~2.8:1 on the near-black canvas and every quiet thing on that page is still text a visitor is meant to read; the quiet step clears 4.5:1. `--text-tertiary` remains legitimate for genuinely non-essential greys.

## Typography

**Display Font:** Inter (with -apple-system, Segoe UI, sans-serif)
**Body Font:** Inter — the same family; tone comes from roman/italic, never from a second grotesque
**Label/Mono Font:** JetBrains Mono (with ui-monospace, SF Mono, monospace)

**Character:** One minimal grotesque doing all the talking, against a monospace that only ever does bookkeeping. The pairing reads as a machine that writes well: the prose is warm and confident, the labels around it are cold, spaced and mechanical.

### Hierarchy
- **Display** (700, clamp(2.1rem, 7.4vw, 5.5rem), 0.97, -0.035em, UPPERCASE): the two statements that carry the surface — the boot headline and the closing call. Balanced wrap, always hard-broken by hand into deliberate lines. A smaller step (clamp(1.9rem, 5.4vw, 3.6rem)) exists for the closing frame.
- **Headline** (600, clamp(1.55rem, 3.3vw, 2.5rem), 1.1, -0.03em): section heads. Sentence case, never uppercase — uppercase is reserved to Display and to mono.
- **Title** (500, clamp(1.05rem, 1.9vw, 1.4rem), 1.25, -0.02em): register claims and the selected mode's one-line promise. Capped near 30ch.
- **Lede** (400, clamp(1rem, 1.5vw, 1.15rem), 1.6, -0.01em): the opening paragraph of a section, at `--text-primary`, capped at 62ch.
- **Body** (400, 15px, 1.6): the reading voice, at `--text-secondary`, capped at 68ch. Italic inside body is a colour change too — it lifts to `--text-primary`.
- **Label / Meta** (mono, 400, 10.5–11.5px, 0.09–0.18em, UPPERCASE): kickers, addresses (`GEN` `CO` `01` `02`), signals, figure captions, footer. Every one of these is a machine's annotation of the human text next to it.
- **Command** (mono, 500, 11.5px, 0.16em, UPPERCASE): the bracketed control. The app's nav restatement is 11px / 0.14em.
- **Measurement** (mono, 500, 13–34px, tabular-nums): every score, delta and axis figure. Overall scores at 34px, criterion values at 13px, chart values at 22px.
- **Wordmark** (Inter italic 600, 18px, -0.02em): "Ripple", beside the orb. The only italic in the chrome.

### Named Rules
**The Mono Is Not A Costume Rule.** JetBrains Mono carries addresses, labels, commands and measurements only. It never sets a sentence a person would read aloud. If mono is running past about eight words it is being worn as a costume and belongs in Inter.

**The Extreme Contrast Rule.** Inter works at two ends and thin in the middle: a display line at up to 5.5rem and body at 15px, with as little as possible between them. When a size is needed between headline and body, prefer changing colour or weight instead of inventing a step.

**The Tabular Numeral Rule.** Any figure that could change or be compared — score, delta, axis value — is mono with `font-variant-numeric: tabular-nums`. Numbers that jog horizontally as they animate read as a UI bug, not a measurement.

## Layout

Both worlds sit inside a full-height scroll container, not the document body.

**Persuade surface (`.rl-`).** The page's gutter *is* the console frame's inset: `--frame-inset: 20px` (10px under 680px), so the two frames are margin-set and nothing else needs page padding. Between the frames, sections are a centred `--container-max` (1120px) column with 24px side padding and vertical padding of `clamp(76px, 12vh, 148px)`. The opening frame is `calc(100dvh - inset*2)` — dvh, not vh, because on phones the retracted-URL-bar height pushed the primary action below the real fold. Two-column sections run asymmetric on purpose (0.85fr/1.15fr for the intro, 0.7fr/1.3fr for the mode selector, 1fr/1fr for the trend) and collapse to a single column at 940px. The register list is a three-track grid (`4.5em` address / claim / body) that folds to two tracks at 940px with the body re-spanning under the claim.

**Rhythm.** Every section after the first is separated by one hairline (`--border-faint`) that stops 24px short of the gutters, so the whole page reads as a ruled register rather than as a stack of blocks. Lists use the same device: a rule on top of the list and one under every row.

**Chat shell (`.h2c-`).** A sticky 100dvh stage over a 250vh scroll spacer drives the hero→chat transition from a single `--p` progress variable; once a message is sent the spacer collapses and the landing is retired. The chat itself is a two-track grid whose first track is `--rail`, a registered `<length>` custom property so the sidebar can be *transitioned* (60px collapsed, 264px expanded) without relaying out its contents each frame. The thread column is `--container-chat` (720px) and reserves `--composer-h + 56px` at its foot so the floating composer never covers the last message.

**Breakpoints.** 940px (multi-column sections collapse), 680px (frame inset halves, status readout drops out of the rail rather than wrapping, flanking captions stack under the core, scorecard goes single-column), 600px and 420px in the app shell (nav command tightens; wordmark gives way before the orb does).

**Named Rules**
**The Frame Is The Gutter Rule.** On the Persuade surface the console frame's own inset is the page margin. Do not add page padding around a frame; set `--frame-inset` instead.

**The dvh Rule.** Any full-height surface whose first viewport contains a required action is sized in `dvh` with a `vh` line immediately above it as the fallback.

## Elevation & Depth

Hybrid, and split by namespace. The chat shell is a genuinely layered world: three shadow tokens plus tonal steps (`surface-1` → `surface-2` → `surface-3`) do the lifting, and one blur is spent where it is earned. The Persuade surface is almost flat: it has exactly one shadowed object (the console frame) and gets its depth from light instead — a page-anchored radial wash, a semi-transparent frame that darkens top-to-bottom so the glow reads through its upper third, and a masked dot field.

The critical behaviour is that the wash is **absolute inside the scroll container, not fixed**. Fixed was the first instinct and it was wrong: it re-lit the top of every section as that section scrolled past, so the page sat under one flat glow and the pacing died. Anchored to the page, the light is present at the two ends where the frames are and absent through the middle where the reading happens; the closing frame therefore carries its own bottom-anchored radial, because the page glow is long gone by the time anyone reaches it.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px rgba(0,0,0,0.35)`): rubric cards and other resting panels in the app.
- **Raised** (`0 12px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04) inset`): the composer, popovers, the mode-switch confirmation.
- **Overlay** (`0 24px 64px rgba(0,0,0,0.55)`): full overlays and drawers.
- **Frame** (`inset 0 1px 0 rgba(255,255,255,0.07), 0 40px 120px rgba(0,0,0,0.6)`): the console frame only — a pane held in front of the light.
- **Accent glow, small** (`0 0 16px rgba(92,200,232,0.4)`): the ready send button.
- **Accent glow, full** (`0 0 0 1px rgba(92,200,232,0.25), 0 0 24px rgba(92,200,232,0.35), 0 0 48px rgba(92,200,232,0.15)`): reserved for the rare object that is supposed to be emitting.

### Named Rules
**The Light Scrolls Rule.** A page-level glow is positioned absolutely inside its scroll container so it travels with the content. A viewport-fixed wash re-lights every section identically and destroys the page's pacing.

**The Blur Is Earned Rule.** `backdrop-filter` is legitimate exactly where something translucent sits over content that moves behind it — the composer over the ambient field is the reference case, at `--blur-panel: 14px`. It is not legitimate as a decorative material: the landing scorecard was translucent until it was noticed that the page glow has scrolled away by the time anyone reaches it, so the blur was sampling flat canvas and buying a compositing layer for nothing. It ships opaque (#161618).

## Shapes

Two radius families, both real.

The app shell is generously rounded on the inherited scale — 8/12/16/22px, `pill` for anything switch-like, `full` for orbs, avatars and the 38px circular attach/send buttons. The composer deliberately uses a **fixed 22px** rather than `pill`: a pill radius resolves to half the box height, so it stayed a pill at one line and ballooned into an ~80px curve once the textarea grew, eating the corners its own controls sit in.

The Persuade surface has almost no radii at all, because it has almost no boxes. Its shapes are: the console frame at 26px (18px under 680px), the scorecard at 12px, criterion chips at `pill`, and the core tile at a superellipse-ish `border-radius: 30%` with a 34% orb inside a conic four-arc ring. Everything else is a 1px line: rules, ticks, a 2px×20px active-row marker, a 3px meter, a dashed threshold. A ghost stroke sits 12px outside the boot frame at 38px radius, echoing it — one repeat only, because a stack of them would be decoration rather than a device.

### Named Rules
**The Hairline Before The Box Rule.** On the Persuade surface, structure is a rule until it cannot be. A selected row gets a 2px cyan tick and a 10px indent, not a filled pill: a hairline row does not become a card just because it is on.

**The Growable Box Rule.** Any container that can grow vertically takes a fixed radius, never `--radius-pill`.

## Components

### Buttons
The action vocabulary at brand level is one shape: **the bracketed monospace command**. There is no filled brand button on the Persuade surface at all.

- **Shape:** none — no border, no background, no radius. The brackets are the affordance.
- **Command (default):** `--text-primary` label in mono 500 11.5px / 0.16em uppercase, 10px 4px padding, with `[` and `]` drawn as `::before`/`::after` in `--rl-quiet`. Drawn in CSS specifically so the accessible name stays "Start a chat" rather than "[ Start a chat ]".
- **Hover:** brackets translate ±3px outward over 200ms `--ease-emphasized` and take `--emerald-500`; the label does not move. The label is the destination, the brackets are the mechanism.
- **Accent (`data-tone="accent"`):** label in `--emerald-300`, brackets resting at `--emerald-700`. This is the primary action; it appears in the top rail, at the foot of the boot frame, and in the closing frame — always with **identical wording**, because two names for one destination inside a single viewport reads as two destinations.
- **Nav restatement (`.h2c-navcmd`):** the same idiom inside the chat shell at 11px / 0.14em, resting at `--text-secondary`, so the one link into the landing page looks like where it goes. It tightens at 600px rather than hiding — it is the only route to that page in the client.
- **Filled buttons** exist only inside the app shell, for in-product confirmations: `--surface-accent` ground with `--text-on-accent` (#062028) text on a pill.

### Chips
- **Criterion chip:** the real rubric key in mono 11.5px / 0.06em, `--emerald-300`, on a transparent ground inside a 1px rgba(92,200,232,0.25) pill, 6px 12px. Used only to list criteria a mode is actually scored on.
- **Mode pill (app):** solid `--surface-2` at rest — solid rather than translucent because these sit directly over the moving ambient field and need their own ground. Active is a deep cyan-black (#132c36) with `--emerald-300` text. A *pending* mode (proposed, not yet confirmed) is outlined with an inset cyan ring instead of filled, so two pills never look selected at once.

### Cards / Containers
- **Console frame:** 26px radius, 1px `--cy-line` border, `overflow: hidden`, and a three-stop vertical gradient from rgba(8,20,26,0.24) to rgba(10,10,11,0.95) so the light reads through the top third and the interior is near-black by the time the primary action arrives. Contains a masked dotted field.
- **Dotted field:** 1px dots of rgba(180,230,246,0.3) on a 26px grid, masked by a radial that fades to transparent at 92%. It is a device, not wallpaper — but it has to be legible: at 0.11 alpha behind a short mask it rendered as flat black.
- **Scorecard:** 12px radius, 1px `--border-soft`, **opaque** #161618, 22px 24px 24px. This is the one place the Persuade surface allows a bounded panel, because it is quoting an artifact the product actually renders.
- **App cards:** `--surface-1` on `--radius-md` with `--border-subtle` and `--shadow-card`.

### Inputs / Fields
- **Composer:** a translucent rgba(22,22,24,0.85) bar at 22px radius with a 14px backdrop blur, 1px `--border-default` and `--shadow-raised`, bottom-aligned so its 38px circular attach and send buttons stay level as the textarea grows to a 220px max.
- **Field:** transparent, borderless, `outline: none`, 16px/1.5 Inter, placeholder at `--text-tertiary`, with a scrollbar restyled into the panel's own palette (10px, thumb rgba(255,255,255,0.18), clipped to content-box so the border pads rather than frames it).
- **Send:** idle is `--surface-3` with `--text-tertiary` and `cursor: default`; ready is `--surface-accent` with `--text-on-accent` and `--glow-accent-sm`. State is legible before it is interactive.
- **Focus:** global, everywhere: `outline: 2px solid rgba(92,200,232,0.5)` at 2px offset on `:focus-visible`. Never removed, never replaced per component.

### Navigation
The Persuade top rail is brand-left / status-centre / command-right at 18px 24px, over a 1px rgba(92,200,232,0.12) bottom rule. The status readout is a pulsing 6px cyan dot beside mono 11px / 0.1em uppercase text; under 680px the rail sheds its middle readout rather than wrapping, because three items at 360px would break the wordmark in half. The chat shell's top bar is the same three-slot arrangement with the account state on the right.

### The Register Row (signature)
The recurring list primitive across the whole Persuade surface: a rule above the list, a rule under every row, a mono address in the first track, the human content after it. Interactive versions (the mode selector) shift `padding-left` to 10px and grow a 2px×20px cyan marker with a glow on the left edge when selected; the address turns cyan too. This is the system's answer to a card grid.

### The Core (signature)
The one built object on the surface: a `clamp(132px, 21vw, 196px)` tile at 5:6 aspect and 30% radius, filled with a 165° ice-cyan gradient, carrying a conic four-arc ring (the four rubrics, drawn rather than illustrated) and the app's own orb at 34%. A blurred radial glow sits at `inset: -46%` behind it. Under 680px it reorders above its flanking captions rather than being squeezed to a sliver — the object is the point of that viewport.

### Motion
Three authored moments, and nothing else.
1. **The boot sequence** (Persuade, first viewport only): the frame's border and shadow strike in over 900ms, the rail sweeps left-to-right by clip-path at 120ms, the display resolves at 300ms, the core scales up out of blur at 520ms, then the flanks at 760ms and the action at 900ms. Every element animates *from* a state that is already laid out, so nothing here can leave the page blank if it never runs.
2. **The reveal** (Persuade, below the fold): opacity/translateY(18px)/blur(9px) over 640ms `--ease-emphasized`. The default state is *arrived* — the observer removes `.is-waiting` rather than adding it — and only elements below 85% of the viewport at first paint are ever hidden. Applied in `useLayoutEffect`, not `useEffect`, because an after-paint effect made the page render complete, snap to blank, then fade back in.
3. **The fill**: meters and bars animate with `scaleX`/`scaleY` from a zero origin over 360–720ms; the inline size is the target, the animation only rides up to it.

Easing is `--ease-standard` for colour and background, `--ease-emphasized` for anything that moves. Durations are 120 / 200 / 360ms. Every one of these is disabled under `prefers-reduced-motion: reduce`, and disabling them leaves a complete page.

## Do's and Don'ts

### Do:
- **Do** resolve `--emerald-*` to its value before using it. It is ice-cyan #5cc8e8, not green.
- **Do** use the bracketed mono command as the action shape on brand surfaces, with the brackets drawn in CSS so the accessible name stays clean.
- **Do** give the same destination the same words everywhere it appears in one viewport.
- **Do** set every score, delta and axis figure in JetBrains Mono with `tabular-nums`.
- **Do** use `--rl-quiet` (#9a9aa2) for quiet text on the near-black Persuade canvas; `--text-tertiary` fails 4.5:1 there.
- **Do** carry structure with hairlines and addresses before reaching for a bounded box.
- **Do** anchor page-level light to the scroll content, so it can scroll away and shape the page.
- **Do** animate from a laid-out state, so a page with no JS, no IntersectionObserver, or reduced motion is complete rather than blank.
- **Do** size any full-height surface with a required action in `dvh`, with a `vh` fallback line above it.
- **Do** label a synthetic demonstration as synthetic in every section it appears in; a label does not carry across a section boundary.

### Don't:
- **Don't** introduce a second brand hue. Amber and red are score bands inside a scorecard and nothing else; outside one, go monochrome and let cyan mark only the value that crosses the threshold.
- **Don't** set gradient text, anywhere.
- **Don't** use `backdrop-filter` on something that is not sitting over moving content — it buys a compositing layer to sample flat canvas.
- **Don't** run JetBrains Mono past a label's length. It is for addresses, labels, commands and measurements, not prose.
- **Don't** use `--radius-pill` on a container that can grow vertically; a pill resolves to half the height and balloons.
- **Don't** fix a page glow to the viewport.
- **Don't** turn a selected hairline row into a filled card or pill.
- **Don't** invent commercial proof — no prices, customers, benchmarks or logos. Any such slot ships as a clearly marked placeholder.
- **Don't** merge the `.h2c-` and `.rl-` layout languages. They share tokens, the wordmark and the command idiom; the card-and-shadow shell and the hairline-and-frame surface are separately correct.
