import type { CSSProperties } from "react";

/**
 * "The Deep" — static depth field. Plain, hook-free, SSR-safe.
 *
 * Renders behind all content (inside DeepProvider's fixed -z-20 container) and
 * serves three roles: the SSR/first-paint baseline, the permanent experience for
 * reduced-motion / low-tier devices, and the visual target the animated WebGL
 * scene matches later. Pure CSS, no animation, fixed to the viewport.
 *
 * Layers (back → front): depth gradient · bioluminescent accents · attenuating
 * datum grid. Everything is aria-hidden + pointer-events-none. It must read as
 * the chart datum acquiring depth, not a saturated gradient (design-tokens.md §9).
 */

// Faint product-hue marks in the upper "surface" band — faint living light deep
// in the water, never a hero glow. They use the *-subtle* hue tokens (L30, low
// chroma), not the bright base hues: a bright hue spikes luminance and drops
// --ink-faint below WCAG AA at just ~4% tint, whereas the subtle tokens hold AA
// to ~0.18 opacity even at peak — so legibility is preserved at any scroll
// position (CLAUDE.md §6), regardless of where a label lands.
const ACCENTS: { hue: string; style: CSSProperties }[] = [
  { hue: "var(--odyssey-subtle)", style: { top: "-16%", right: "-12%", width: "52vw", height: "52vh", opacity: 0.13 } },
  { hue: "var(--cortex-subtle)", style: { top: "18%", right: "-12%", width: "34vw", height: "42vh", opacity: 0.1 } },
  { hue: "var(--imagine-subtle)", style: { top: "-18%", left: "-14%", width: "44vw", height: "44vh", opacity: 0.09 } },
  { hue: "var(--traderoute-subtle)", style: { top: "-22%", left: "44%", width: "40vw", height: "38vh", opacity: 0.08 } },
];

export function StaticFallback() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* (a) depth field — surface → mid (= canvas) → floor */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, var(--deep-surface) 0%, var(--deep-mid) 38%, var(--deep-floor) 100%)",
        }}
      />

      {/* (c) bioluminescent accents — faint living light, never a hero glow */}
      <div className="absolute inset-0 overflow-hidden">
        {ACCENTS.map((a, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              ...a.style,
              background: `radial-gradient(circle at center, ${a.hue}, transparent 62%)`,
            }}
          />
        ))}
      </div>

      {/* (b) attenuating datum grid — graph paper dissolving into the deep */}
      <div
        className="datum-grid absolute inset-0"
        style={{
          opacity: "var(--deep-grid-fade)",
          maskImage: "linear-gradient(to bottom, black, transparent 65%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 65%)",
        }}
      />
    </div>
  );
}
