"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useDeepDrivers } from "./useDeepDrivers";
import { useDeepStore } from "./store";
import { computeTier } from "./tier";
import { StaticFallback } from "./StaticFallback";

// The WebGL canvas loads client-side only (ssr:false) — allowed here because
// this is a Client Component. loading:null = no DOM at hydration time, so the
// gate below produces identical (empty) SSR and client-initial output.
const DeepCanvas = dynamic(() => import("./DeepCanvas"), {
  ssr: false,
  loading: () => null,
});

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
  // Capability tier, decided once synchronously (SSR-safe → "low"): available on
  // the very first client render so the mount decision never flashes and the
  // WebGL chunk is never requested for low-tier / reduced-motion / save-data.
  const [tier] = useState(computeTier);
  const shouldAnimate = tier !== "low";

  // Lazy-init AFTER first content paint: requestIdleCallback yields to FCP/LCP
  // and layout before any scene JS runs (timeout caps the wait; setTimeout
  // fallback for Safari). SSR and the first client render are identical
  // (canvas-free) DOM — no hydration mismatch, no CLS (the canvas is fixed,
  // z-index -20, reserving no layout).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!shouldAnimate) return;
    const ric = window.requestIdleCallback;
    if (ric) {
      const id = ric(() => setReady(true), { timeout: 1000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, [shouldAnimate]);

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: -20 }}
      >
        <StaticFallback />
        {ready && shouldAnimate && <DeepCanvas tier={tier} />}
      </div>
      {process.env.NODE_ENV !== "production" && <DepthReadout />}
    </>
  );
}
