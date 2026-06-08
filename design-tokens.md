# Octavius — Design Tokens

> The design system for the Octavius marketing site. Extends an **OKLCH + DM
> Sans** foundation. Companion to [CLAUDE.md](CLAUDE.md); the aesthetic rules and
> Hard Bans there govern how these tokens are used.

OKLCH is the source of truth for color because it keeps **perceived lightness (L)
and chroma (C) constant while only hue (H) varies** — which is exactly how the
per-product signature hues are derived (§2). Tokens are expressed as both a raw
OKLCH value and a Tailwind-ready CSS custom property.

---

## 1. Canvas & Neutrals

Near-black dark theme. The canvas is a calibrated instrument face, not pure
black — a faint blue-cool cast (H ≈ 255) unifies the neutrals.

```css
:root {
  /* Surfaces — ascending lightness */
  --bg:            oklch(16% 0.015 255);  /* page canvas (near-black)        */
  --surface-1:     oklch(19% 0.018 255);  /* raised panel / instrument face  */
  --surface-2:     oklch(23% 0.020 255);  /* card / readout background       */
  --surface-3:     oklch(28% 0.022 255);  /* hover / elevated                */

  /* Ink — text & marks on canvas */
  --ink:           oklch(96% 0.010 255);  /* primary text                    */
  --ink-muted:     oklch(78% 0.012 255);  /* secondary text                  */
  --ink-faint:     oklch(62% 0.012 255);  /* mono micro-labels, annotations  */
  --ink-ghost:     oklch(46% 0.010 255);  /* tick marks, least-emphasis      */

  /* Lines — see §5 for the hairline grid */
  --rule:          oklch(34% 0.012 255);  /* 0.5px hairline divider / frame  */
  --rule-strong:   oklch(44% 0.014 255);  /* emphasized rule                 */
  --grid:          oklch(26% 0.010 255 / 0.6); /* faint coordinate lattice   */
}
```

Contrast check (against `--bg`, WCAG AA per [CLAUDE.md](CLAUDE.md) §6):
`--ink` and `--ink-muted` clear AA for body text; `--ink-faint` is for ≥12px
mono labels only — verify in context; `--ink-ghost` is for non-text marks
(ticks, grid) and must not carry meaningful text alone.

---

## 2. Per-Product Signature Hues

One instrument, one hue. All five share a **constant L = 72% and C = 0.16** so
they read as a coordinated instrument set; only **H** changes. (Vivid/subtle
variants hold the hue and shift L/C predictably.)

| Product        | Hue name | H (°) | OKLCH (base)            |
| -------------- | -------- | ----- | ----------------------- |
| **Cortex**     | Indigo   | 275   | `oklch(72% 0.16 275)`   |
| **Reflex**     | Magenta  | 340   | `oklch(72% 0.16 340)`   |
| **Imagine**    | Amber    | 75    | `oklch(72% 0.16 75)`    |
| **Odyssey**    | Cyan     | 215   | `oklch(72% 0.16 215)`   |
| **TradeRoute** | Green    | 150   | `oklch(72% 0.16 150)`   |

```css
:root {
  /* Base signature hue (lines, accents, data ink on dark canvas) */
  --cortex:      oklch(72% 0.16 275);
  --reflex:      oklch(72% 0.16 340);
  --imagine:     oklch(72% 0.16 75);
  --odyssey:     oklch(72% 0.16 215);
  --traderoute:  oklch(72% 0.16 150);

  /* Vivid — emphasis, active states (hold H, raise C, drop L slightly) */
  --cortex-vivid:     oklch(68% 0.20 275);
  --reflex-vivid:     oklch(68% 0.20 340);
  --imagine-vivid:    oklch(68% 0.20 75);
  --odyssey-vivid:    oklch(68% 0.20 215);
  --traderoute-vivid: oklch(68% 0.20 150);

  /* Subtle — fills, washes, contour bands (hold H, low C, low L) */
  --cortex-subtle:     oklch(30% 0.05 275);
  --reflex-subtle:     oklch(30% 0.05 340);
  --imagine-subtle:    oklch(30% 0.05 75);
  --odyssey-subtle:    oklch(30% 0.05 215);
  --traderoute-subtle: oklch(30% 0.05 150);
}
```

Usage:

- **One hue per product context.** Don't mix signature hues within a single
  product's section except for deliberate cross-references in portfolio views.
- The signature hue is **data ink and accent**, not a background flood (no
  generic gradient fills — [CLAUDE.md](CLAUDE.md) §3).
- A neutral, hueless context (portfolio/overview) lets the five hues sit
  together as a legend.

### Tailwind wiring

Expose tokens as CSS variables and reference them in `tailwind.config` so
utilities like `text-cortex`, `border-rule`, `bg-surface-1` exist:

```js
// tailwind.config — colors map to the CSS variables above
colors: {
  bg: 'oklch(var(--bg-l) var(--bg-c) var(--bg-h))', // or simply 'var(--bg)'
  ink: 'var(--ink)',
  'ink-muted': 'var(--ink-muted)',
  'ink-faint': 'var(--ink-faint)',
  rule: 'var(--rule)',
  cortex: 'var(--cortex)',
  reflex: 'var(--reflex)',
  imagine: 'var(--imagine)',
  odyssey: 'var(--odyssey)',
  traderoute: 'var(--traderoute)',
}
```

> Note: to use Tailwind's `/<alpha>` opacity syntax on these, store channels
> without the `oklch()` wrapper and compose, e.g.
> `--cortex-ch: 72% 0.16 275;` → `oklch(var(--cortex-ch) / <alpha-value>)`.
> Decide one convention at build setup and keep it consistent.

---

## 3. Typography

Two families, strict roles:

- **DM Sans** — display, headings, UI, body copy.
- **JetBrains Mono** — data, labels, coordinates, annotations, figure numbers,
  margin micro-labels. Anything that reads as an *instrument reading* is mono.

```css
:root {
  --font-display: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', ui-monospace, 'SF Mono', monospace;
}
```

### Type scale

Modular scale, ~1.25 (major third), 16px base. `rem` assumes 16px root.

| Token         | Size            | Line height | Family  | Use                                   |
| ------------- | --------------- | ----------- | ------- | ------------------------------------- |
| `--text-7xl`  | 4.5rem / 72px   | 1.02        | display | hero display                          |
| `--text-6xl`  | 3.5rem / 56px   | 1.05        | display | page title                            |
| `--text-5xl`  | 2.75rem / 44px  | 1.08        | display | section title                         |
| `--text-4xl`  | 2.25rem / 36px  | 1.12        | display | subsection                            |
| `--text-3xl`  | 1.75rem / 28px  | 1.2         | display | card / feature heading                |
| `--text-2xl`  | 1.375rem / 22px | 1.3         | display | lead / large body                     |
| `--text-xl`   | 1.125rem / 18px | 1.5         | display | body large                            |
| `--text-base` | 1rem / 16px     | 1.6         | display | body                                  |
| `--text-sm`   | 0.875rem / 14px | 1.5         | either  | small body / UI                       |
| `--text-xs`   | 0.75rem / 12px  | 1.4         | mono    | micro-labels, annotations, data       |
| `--text-2xs`  | 0.6875rem / 11px| 1.3         | mono    | margin coordinates, registration ids  |

Mono treatment for labels: uppercase, **letter-spacing ≈ 0.08–0.12em**, often
`--ink-faint`. This is the "instrument label" texture used in margins and on
annotations.

```css
:root {
  --tracking-label: 0.1em;   /* mono micro-labels, coordinate annotations */
  --tracking-tight: -0.01em; /* large display headings                    */
  --weight-regular: 400;
  --weight-medium:  500;
  --weight-semibold:600;
}
```

---

## 4. Spacing — 8px base

8px base unit. Use the scale; avoid arbitrary values so layouts stay on a
visible, predictable rhythm (it reinforces the graph-paper datum).

```css
:root {
  --space-0:  0;
  --space-1:  0.25rem; /*  4px — half-step, hairline insets        */
  --space-2:  0.5rem;  /*  8px — base unit                         */
  --space-3:  0.75rem; /* 12px                                     */
  --space-4:  1rem;    /* 16px                                     */
  --space-6:  1.5rem;  /* 24px                                     */
  --space-8:  2rem;    /* 32px                                     */
  --space-12: 3rem;    /* 48px                                     */
  --space-16: 4rem;    /* 64px                                     */
  --space-24: 6rem;    /* 96px — section padding                   */
  --space-32: 8rem;    /* 128px — major section breaks             */
}
```

---

## 5. Grid & Hairline System

The coordinate grid is a defining device ([CLAUDE.md](CLAUDE.md) §2). It must be
*present but faint* — a chart datum, never a hero texture.

```css
:root {
  --rule-width:   0.5px;          /* all hairline rules are exactly 0.5px    */
  --grid-cell:    8px;            /* base lattice = spacing base             */
  --grid-major:   64px;          /* every 8th line, slightly stronger        */
  --content-max:  72rem;         /* 1152px content measure                   */
  --gutter:       var(--space-6);
}
```

Faint coordinate lattice as a background (graph-paper datum):

```css
.datum-grid {
  background-image:
    linear-gradient(to right,  var(--grid) var(--rule-width), transparent var(--rule-width)),
    linear-gradient(to bottom, var(--grid) var(--rule-width), transparent var(--rule-width));
  background-size: var(--grid-cell) var(--grid-cell);
}
```

- **0.5px rule color** is `--rule` (dividers/frames), `--rule-strong` for emphasis.
- Major grid lines (`--grid-major` spacing) may use `--rule` over the fainter
  `--grid` cell lattice to read as the chart's primary graticule.

> **Rendering a true 0.5px hairline.** A literal `border: 0.5px solid` is
> unreliable — sub-pixel borders round inconsistently across browsers and at
> non-Retina device-pixel-ratios (they can vanish or snap to 1px). Render
> hairlines so the width is driven by `--rule-width` and resolves crisply:
> - **Frames/insets:** `box-shadow: inset 0 0 0 var(--rule-width) var(--rule)`
>   instead of `border`. (This is what the preview uses.)
> - **Single lines:** a block with `height: var(--rule-width); background: var(--rule)`,
>   or a `linear-gradient` stop at `var(--rule-width)` (as in `.datum-grid`).
> - **Need pixel-perfect at any DPR:** a 1px pseudo-element scaled with
>   `transform: scaleY(0.5)` (or `scaleX`) and `transform-origin` on the edge.
>
> On Retina (DPR ≥ 2) all three resolve to a clean single device pixel; on DPR 1
> displays a 0.5px line falls back to the thinnest the device can draw. Keep
> `--rule-width` the single source so a future global change is one edit.

---

## 6. Reusable Primitives

The recurring marks that give every page its instrument character. Defined here
as intent + token usage; components live in code later.

### 6.1 Coordinate-annotation label
A mono callout that frames content as a point on a chart — a bearing, datum, or
figure reference sitting just outside the element it annotates.

- Font: `--font-mono`, `--text-2xs`/`--text-xs`, `--tracking-label`, uppercase.
- Color: `--ink-faint` (or product hue for active/data context).
- Form: `N 41°·W 087°`, `FIG. 02 / COST·SURFACE`, `LAT 0.000  LON 0.000`.
- Placement: margins, corners, alongside diagrams — never in the reading flow.

### 6.2 Registration mark
A corner crosshair / alignment target (print + optical-instrument reference).
Used at frame corners, section boundaries, and as a motion anchor (marks snap
into alignment — [CLAUDE.md](CLAUDE.md) §4).

- Built from `--rule`/`--rule-strong` hairlines (a `+` or cornered crosshair).
- Size on the 8px grid (e.g. 16px or 24px arms); `--ink-ghost`/`--rule` color.
- Stroke is `--rule-width` (0.5px). May tint to product hue when "locked/active".

### 6.3 Hairline divider
The workhorse rule. Exactly `--rule-width` (0.5px), color `--rule`. Used for
section breaks, table rules, and framing. Variants: full-bleed, inset (starts at
a margin tick), and labeled (a mono micro-label breaks the line — like a scale
bar). Never thicker than 0.5px; emphasis comes from `--rule-strong`, not weight.

### 6.4 Mono micro-label
The smallest instrument label: figure numbers, section coordinates, units,
datum refs running in margins and along rules.

- Font: `--font-mono`, `--text-2xs`, `--tracking-label`, uppercase.
- Color: `--ink-faint` default, `--ink-ghost` for least emphasis.
- Examples: `OCT·001`, `§ 02.3`, `SCALE 1:1`, `Δ COST`, `v.2026`.

---

## 7. Motion Tokens

Mechanical, eased, never bouncy ([CLAUDE.md](CLAUDE.md) §4). No springs, no
overshoot.

```css
:root {
  /* Easing — calibrated, settling. No bounce. */
  --ease-instrument: cubic-bezier(0.2, 0.0, 0.0, 1.0); /* needle settling     */
  --ease-plot:       cubic-bezier(0.4, 0.0, 0.2, 1.0); /* plotter draw        */
  --ease-linear:     linear;                            /* sweeps / scans      */

  /* Durations */
  --dur-fast:   150ms;  /* hover, focus, small state changes      */
  --dur-base:   300ms;  /* standard transitions                   */
  --dur-draw:   600ms;  /* diagram / contour assembly             */
  --dur-settle: 900ms;  /* value count-up, needle settle          */
}

@media (prefers-reduced-motion: reduce) {
  /* Show finished state; no essential content gated behind motion. */
  :root { --dur-fast: 0ms; --dur-base: 0ms; --dur-draw: 0ms; --dur-settle: 0ms; }
}
```

---

## 8. Radii & Elevation

Instruments are precise — radii are minimal; elevation is line-based, not
shadow-heavy (avoids the soft "glow" the Hard Bans reject).

```css
:root {
  --radius-none: 0;
  --radius-sm:   2px;  /* readouts, chips                          */
  --radius-md:   4px;  /* panels                                   */
  /* Elevation = hairline frame + faint surface step, not big blur shadows. */
  --shadow-readout: 0 var(--rule-width) 0 0 var(--rule); /* crisp hairline seat */
}
```

Glassmorphism, if used at all, is an accent only (a floating readout over a
chart) — see [CLAUDE.md](CLAUDE.md) §3.
