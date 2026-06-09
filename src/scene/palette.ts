import { Color, Vector3 } from "three";
import { converter, formatHex, type Oklch } from "culori";

const toSRGB = converter("rgb");

/**
 * SINGLE SOURCE OF TRUTH for scene color.
 *
 * ⚠️  The numeric OKLCH values below MUST stay identical to the CSS tokens in
 *     src/app/globals.css:
 *       --deep-surface  oklch(22% 0.02 245)
 *       --deep-mid (=--bg) oklch(16% 0.015 255)
 *       --deep-floor    oklch(11% 0.018 265)
 *       --grid          oklch(26% 0.01 255)
 *       §2 product hues  oklch(72% 0.16 H)  and  -subtle oklch(30% 0.05 H)
 *     If one changes, change BOTH. The animated field must match the CSS
 *     StaticFallback exactly (invisible handoff).
 *
 * COLOR MANAGEMENT CONVENTION (one convention, documented once):
 *   OKLCH is converted here to LINEAR-sRGB. The shader mixes everything in
 *   linear, then encodes linear→sRGB itself at the final line (exact sRGB OETF).
 *   We do NOT rely on the renderer to encode a custom ShaderMaterial's output
 *   (it doesn't, reliably) and we do NOT double-encode. Calibrated against the
 *   --bg swatch.
 */

const toLinear = converter("lrgb");
const ok = (l: number, c: number, h: number): Oklch => ({ mode: "oklch", l, c, h });
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** OKLCH → linear-sRGB Vector3 (for shader uniforms). */
function linVec(o: Oklch): Vector3 {
  const { r, g, b } = toLinear(o);
  return new Vector3(clamp01(r), clamp01(g), clamp01(b));
}
/** OKLCH → THREE.Color stored in linear working space (for later 3D phases). */
function linColor(o: Oklch): Color {
  const v = linVec(o);
  return new Color().setRGB(v.x, v.y, v.z, "srgb-linear");
}

// ---- The Deep field stops (must mirror globals.css) ----
const DEEP_OKLCH = {
  surface: ok(0.22, 0.02, 245),
  mid: ok(0.16, 0.015, 255),
  floor: ok(0.11, 0.018, 265),
  grid: ok(0.26, 0.01, 255),
};

export const deepSurface = linVec(DEEP_OKLCH.surface);
export const deepMid = linVec(DEEP_OKLCH.mid);
export const deepFloor = linVec(DEEP_OKLCH.floor);
export const gridLine = linVec(DEEP_OKLCH.grid);

/** Datum-grid persistence at the surface — mirrors --deep-grid-fade. */
export const DEEP_GRID_FADE = 0.5;

/**
 * Marine-snow particulate colour — pale, very low chroma, faintly cool.
 * Emitted in *sRGB* (not linear): the points are a faint alpha-blended overlay,
 * so they composite correctly in the canvas's sRGB framebuffer (the point shader
 * outputs this value directly).
 */
export const particleColor = (() => {
  const c = toSRGB(ok(0.86, 0.012, 240));
  return new Vector3(clamp01(c.r), clamp01(c.g), clamp01(c.b));
})();

/** Floor as an sRGB hex, for scene fog color (forward-prep). */
export const floorHex = formatHex(DEEP_OKLCH.floor);

// ---- Product hues (§2) — stubs reused by later phases ----
export type HueKey = "cortex" | "reflex" | "imagine" | "odyssey" | "traderoute";

const HUE_H: Record<HueKey, number> = {
  cortex: 275,
  reflex: 340,
  imagine: 75,
  odyssey: 215,
  traderoute: 150,
};

const hueKeys = Object.keys(HUE_H) as HueKey[];

/** Base product hues (oklch 72% 0.16 H) as linear THREE.Color, for later phases. */
export const hueColors = hueKeys.reduce<Record<HueKey, Color>>(
  (acc, k) => {
    acc[k] = linColor(ok(0.72, 0.16, HUE_H[k]));
    return acc;
  },
  {} as Record<HueKey, Color>,
);

/** Subtle hues (oklch 30% 0.05 H) as linear Vector3 — used for the faint
 *  surface-band accents so the handoff matches the Phase-2 static accents. */
export const hueSubtle = hueKeys.reduce<Record<HueKey, Vector3>>(
  (acc, k) => {
    acc[k] = linVec(ok(0.3, 0.05, HUE_H[k]));
    return acc;
  },
  {} as Record<HueKey, Vector3>,
);
