# Octavius Logistics — Marketing Site

> **Authoritative project context.** Read this before every task. If a request
> conflicts with the rules below, surface the conflict rather than silently
> overriding them. Companion file: [design-tokens.md](design-tokens.md).

---

## 1. The Concept — "Instruments for the Invisible"

Logistics runs on hidden structure: cost mechanics, network states, demand
signals, inventory lifecycle, decision logic. None of it is visible to the naked
eye, yet all of it determines whether a supply chain is healthy or bleeding.

**Octavius builds the instruments that make that hidden structure legible.**

The governing metaphor is the instrument — the sextant, the theodolite, the
oscilloscope, the navigational chart. An instrument does not generate the world;
it *reveals* something already there with precision and trust. Octavius is a
portfolio of such instruments for logistics.

Editorial consequences:

- **Each product is an instrument, not a feature bucket.** Describe what hidden
  quantity it makes readable, and with what precision — not a list of generic
  capabilities. Every product page should answer: *what was invisible before,
  and what does this instrument let you read?*
- **Earned, not magic.** We show the mechanism. We prefer "here is the
  measurement and how it was taken" over "AI does it for you." Trust is the
  product.
- **Legibility is the verb.** Our job is to render the invisible readable —
  charts, gauges, contour maps of cost and demand, not decoration.

---

## 2. Aesthetic — Precision Instrumentation + Cartography

The visual language is **technical drawing meets navigational chart**. Think
engineering blueprints, nautical charts, scientific instrument faces, surveyor's
field notes. Everything looks measured, plotted, and annotated.

Core visual devices (use them as real structure, not stickers):

- **Hairline rules** — 0.5px dividers and frames doing layout work.
- **Faint coordinate grid** — a barely-there background lattice that reads as
  graph paper / a chart datum, not a hero texture.
- **Contour lines** — topographic-style level curves for visualizing cost,
  demand, and network density.
- **Lat/long-style annotations** — coordinate labels, bearings, tick marks,
  scale bars framing content as if it sits on a chart.
- **Registration marks** — corner crosshairs / alignment targets, as in print
  and optical instruments.
- **Monospace micro-labels in the margins** — JetBrains Mono callouts, datum
  references, figure numbers, section coordinates running alongside content.

Tone: **measured, exact, quietly confident, intellectually serious.** Never breathless, never "AI
magic," never hype. The site should feel like a well-made instrument: nothing
extraneous, every mark intentional.

---

## 3. Hard Bans (non-negotiable)

These read as generic SaaS and break the concept. Do not introduce them, and
flag them if a request implies them:

- ❌ **No stock photos.** Ever. Visuals are drawn/generated diagrammatic assets.
- ❌ **No glowing globe or arcing flight-path lines.** The single most clichéd
  logistics visual.
- ❌ **No generic blue tech gradients.** (Our palette is OKLCH, near-black, with
  precise per-product hues — see [design-tokens.md](design-tokens.md).)
- ❌ **No rows of three equal feature cards.** Find composition with hierarchy,
  asymmetry, and instrument-panel logic instead.
- ❌ **Minimal glassmorphism.** Frosted blur is an *accent* at most (e.g. a
  floating readout over a chart), never the primary surface treatment.

---

## 4. Motion

- **Precise, mechanical, eased.** Motion behaves like a calibrated instrument:
  needles settling, plotters drawing, registration marks snapping into
  alignment. Easing is controlled (custom cubic-beziers), never `bounce`,
  never spring overshoot, never playful.
- **Prefer scroll-driven "assembly" animations** — diagrams that draw
  themselves, grids that resolve, contour lines that plot in, values that count
  to their measured reading. The page should feel like an instrument
  *calibrating* as you scroll.
- **Respect `prefers-reduced-motion`.** Every animation needs a static, fully
  legible fallback. Reduced motion shows the *finished* state immediately — no
  essential content is gated behind motion.

---

## 5. Stack & Architecture

- **Next.js (App Router) + TypeScript + Tailwind.** Server Components by
  default; `'use client'` ONLY for the hero and the five interactive demos.
  All marketing pages statically generated. Framer Motion for animation
  (`useScroll`/`useTransform` for scroll choreography). Lazy-load each demo with
  `next/dynamic` so its JS doesn't block first paint.

---

## 6. Accessibility

- **WCAG AA contrast** minimum for all text and meaningful UI, verified against
  the dark canvas. (Mono micro-labels are easy to under-contrast — check them.)
- **Full keyboard navigation.** Interactive instruments must be operable and
  focus-visible without a mouse.
- **Reduced-motion fallbacks** for everything animated (see §4).
- Semantic HTML, proper landmarks, labelled controls, meaningful alt/aria on
  diagrammatic SVGs.

---

## 7. The Products (the instruments)

Each has a signature OKLCH hue (defined in [design-tokens.md](design-tokens.md)).
Treat each as a distinct instrument with its own invisible quantity to reveal.

| Product        | Hue     | The instrument reads…                                              |
| -------------- | ------- | ------------------------------------------------------------------ |
| **Cortex**     | Indigo  | **Deterministic-first reasoning** — decision logic made auditable. |
| **Reflex**     | Magenta | **Expertise automation** — encoded operator judgment at speed.     |
| **Imagine**    | Amber   | **Parcel invoice audit / cost optimization** — hidden cost leaks.  |
| **Odyssey**    | Cyan    | **Fulfillment & demand visualization** — network state & demand.   |
| **TradeRoute** | Green   | **Reseller inventory lifecycle** — stock as it moves through time. |

Positioning notes:

- **Cortex** — "deterministic-first" is the point: it reasons with auditable,
  rule-grounded logic before reaching for probabilistic inference. Lead with
  trust and explainability, not autonomy.
- **Reflex** — captures and replays expert judgment so scarce expertise scales.
- **Imagine** — audits parcel invoices to surface overcharges and optimization
  opportunities; frame as recovered margin made visible.
- **Odyssey** — makes fulfillment flow and demand legible; the cartography metaphor
  is most literal here (network maps, demand contours).
- **TradeRoute** — tracks reseller inventory across its full lifecycle; think
  time-series and state transitions of stock.

---

## 8. Working Agreement

- These two files are the source of truth. When in doubt, re-read them.
- Build nothing until a page/section is explicitly requested.
- When proposing UI, name the instrument/cartography device it uses and confirm
  it clears every Hard Ban in §3.
