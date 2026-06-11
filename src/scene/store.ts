import { create } from "zustand";
import type { HueKey } from "./palette";

/**
 * "The Deep" — shared depth store.
 *
 * The single source of truth for the ambient WebGL atmosphere. It is driven by
 * scroll/pointer via `useDeepDrivers`, and read on the render hot path with
 * `useDeepStore.getState()` (NOT a hook selector) so scroll/pointer updates do
 * not force React re-renders. The only component that subscribes reactively is
 * the dev-only DepthReadout.
 */
export type Tier = "high" | "mid" | "low";

/**
 * A bioluminescence anchor (Phase 7): the live *screen* position (client px) of
 * a real instrument in the DOM (a hero constellation node, an index row marker),
 * with its product hue. The Bioluminescence subsystem renders a soft additive
 * glow behind each. Published by the hero/index via setAnchors(source, list) —
 * keyed by source so multiple publishers merge and clear independently.
 */
export interface Anchor {
  id: string;
  x: number; // client px (viewport-relative)
  y: number; // client px (viewport-relative)
  hue: HueKey;
  strength: number; // 0..1 brightness multiplier (hero ~1, index ~0.5)
}

export interface DeepState {
  /** 0 = surface (page top) .. 1 = floor (page bottom). */
  depth: number;
  /** Recent smoothed scroll velocity (px/frame-ish); reserved for current-field use. */
  velocity: number;
  /**
   * Normalized cursor position in -1..1. This holds the raw *target*; the frame
   * loop smooths a local value toward it (see DeepCanvas). Kept here so any
   * subsystem can read the target via getState().
   */
  pointer: { x: number; y: number };
  /** Coarse capability tier (refined in a later phase). */
  tier: Tier;
  /** Mirrors prefers-reduced-motion. */
  reducedMotion: boolean;

  /** Flattened bioluminescence anchors (Phase 7), read on the render hot path. */
  anchors: Anchor[];
  /** Per-source anchor lists, merged into `anchors` by setAnchors. */
  anchorGroups: Record<string, Anchor[]>;
  /** Current product page's accent hue (Phase 7), or null off product pages. */
  accentHue: HueKey | null;

  setDepth: (depth: number) => void;
  setVelocity: (velocity: number) => void;
  setPointer: (x: number, y: number) => void;
  setTier: (tier: Tier) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  /** Publish (or clear, with []) one source's anchors; merges into `anchors`. */
  setAnchors: (source: string, list: Anchor[]) => void;
  setAccentHue: (hue: HueKey | null) => void;
}

export const useDeepStore = create<DeepState>((set) => ({
  depth: 0,
  velocity: 0,
  pointer: { x: 0, y: 0 },
  tier: "high",
  reducedMotion: false,
  anchors: [],
  anchorGroups: {},
  accentHue: null,

  setDepth: (depth) => set({ depth }),
  setVelocity: (velocity) => set({ velocity }),
  setPointer: (x, y) => set({ pointer: { x, y } }),
  setTier: (tier) => set({ tier }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setAnchors: (source, list) =>
    set((s) => {
      const anchorGroups = { ...s.anchorGroups, [source]: list };
      return { anchorGroups, anchors: Object.values(anchorGroups).flat() };
    }),
  setAccentHue: (accentHue) => set({ accentHue }),
}));
