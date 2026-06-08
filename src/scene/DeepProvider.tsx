"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useDeepDrivers } from "./useDeepDrivers";
import { useDeepStore } from "./store";
import { StaticFallback } from "./StaticFallback";

// The WebGL canvas loads client-side only (ssr:false) — allowed here because
// this is a Client Component. loading:null = no DOM at hydration time, so the
// gate below produces identical (empty) SSR and client-initial output.
const DeepCanvas = dynamic(() => import("./DeepCanvas"), {
  ssr: false,
  loading: () => null,
});

/** Best-effort check that a WebGL context can be created at all. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

/** Minimal typing for the experimental Network Information API (no `any`). */
interface NavigatorWithConnection extends Navigator {
  connection?: { saveData?: boolean };
}

/**
 * Synchronous, SSR-guarded gate. Mirrors the Phase-1 tier heuristic locally so
 * the canvas-mount decision is available on the very first client render (no
 * flash, no wasted chunk fetch). The store's reducedMotion/tier — written by
 * useDeepDrivers — remain the shared source of truth for later phases; this just
 * decides whether to mount WebGL at all.
 */
function computeShouldAnimate(): boolean {
  if (typeof window === "undefined") return false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return false;
  const nav = navigator as NavigatorWithConnection;
  const saveData = nav.connection?.saveData ?? false;
  const cores = navigator.hardwareConcurrency ?? 8;
  const low = saveData || cores <= 4 || !hasWebGL();
  return !low;
}

/**
 * Dev-only spine readout. Gated on NODE_ENV so it is dead-code-eliminated from
 * production builds and never ships. Subscribes reactively to the store.
 */
function DepthReadout() {
  const depth = useDeepStore((s) => s.depth);
  const velocity = useDeepStore((s) => s.velocity);
  const tier = useDeepStore((s) => s.tier);
  const reducedMotion = useDeepStore((s) => s.reducedMotion);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-2 left-2 z-50 rounded-[2px] px-2 py-1.5"
      style={{
        fontFamily: "var(--font-mono, monospace)",
        fontSize: "10px",
        lineHeight: 1.5,
        letterSpacing: "0.06em",
        color: "var(--ink-faint, #999)",
        backgroundColor: "oklch(16% 0.015 255 / 0.7)",
        boxShadow: "inset 0 0 0 0.5px var(--rule, #333)",
        whiteSpace: "pre",
      }}
    >
      {`DEEP · depth ${depth.toFixed(3)}\n      vel   ${velocity.toFixed(2)}\n      tier  ${tier}\n      rm    ${reducedMotion ? "on" : "off"}`}
    </div>
  );
}

/**
 * "The Deep" provider. Wires the scroll→depth drivers and renders the persistent
 * atmosphere behind all content (z-index -20, one notch behind the grain).
 *
 * StaticFallback is ALWAYS rendered (so it is in SSR output / first paint and is
 * the permanent experience for reduced-motion / low-tier). The WebGL canvas is
 * mounted only when `shouldAnimate`, above the fallback — so its chunk is never
 * even requested for reduced-motion / low-tier users.
 */
export function DeepProvider() {
  useDeepDrivers();
  // Synchronous capability decision (per spec): available on the first client
  // render, false during SSR.
  const [shouldAnimate] = useState<boolean>(computeShouldAnimate);
  // Defer the actual mount to after hydration so SSR and the first client render
  // produce identical (canvas-free) DOM — no hydration mismatch. The canvas is
  // empty/transparent, so this one-frame delay is invisible, and the chunk is
  // still never requested unless shouldAnimate is true.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: -20 }}
      >
        <StaticFallback />
        {hydrated && shouldAnimate && <DeepCanvas />}
      </div>
      {process.env.NODE_ENV !== "production" && <DepthReadout />}
    </>
  );
}
