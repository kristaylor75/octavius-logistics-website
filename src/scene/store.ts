import { create } from "zustand";

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

  setDepth: (depth: number) => void;
  setVelocity: (velocity: number) => void;
  setPointer: (x: number, y: number) => void;
  setTier: (tier: Tier) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
}

export const useDeepStore = create<DeepState>((set) => ({
  depth: 0,
  velocity: 0,
  pointer: { x: 0, y: 0 },
  tier: "high",
  reducedMotion: false,

  setDepth: (depth) => set({ depth }),
  setVelocity: (velocity) => set({ velocity }),
  setPointer: (x, y) => set({ pointer: { x, y } }),
  setTier: (tier) => set({ tier }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));
