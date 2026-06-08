"use client";

import { useEffect } from "react";
import { useDeepStore, type Tier } from "./store";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Minimal typing for the experimental Network Information API (no `any`). */
interface NavigatorWithConnection extends Navigator {
  connection?: { saveData?: boolean };
}

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

function computeTier(reducedMotion: boolean): Tier {
  const nav = navigator as NavigatorWithConnection;
  const saveData = nav.connection?.saveData ?? false;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (reducedMotion || saveData || cores <= 4 || !hasWebGL()) return "low";
  return "high";
}

/**
 * Attaches the scroll → depth spine: ONE scroll listener, ONE pointermove
 * listener (both passive), and a resize listener. Also tracks reduced-motion and
 * a coarse capability tier. Everything is written into the store via setState —
 * never React state — so the hot path stays re-render free.
 */
export function useDeepDrivers(): void {
  useEffect(() => {
    const { setDepth, setVelocity, setPointer, setTier, setReducedMotion } =
      useDeepStore.getState();

    let lastScrollY = window.scrollY;
    let smoothedVelocity = 0;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const readDepth = () => {
      const scrollable = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      setDepth(clamp01(window.scrollY / scrollable));
    };

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY;
      lastScrollY = y;
      // exponential smoothing of the per-event scroll delta
      smoothedVelocity = smoothedVelocity * 0.8 + delta * 0.2;
      setVelocity(smoothedVelocity);
      readDepth();
      // decay velocity back to 0 shortly after scrolling stops
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        smoothedVelocity = 0;
        setVelocity(0);
      }, 120);
    };

    const onPointerMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      setPointer(x, y);
    };

    const onResize = () => readDepth();

    // reduced-motion + tier
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => {
      setReducedMotion(motionQuery.matches);
      setTier(computeTier(motionQuery.matches));
    };
    applyMotion();
    readDepth();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onResize);
    motionQuery.addEventListener("change", applyMotion);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      motionQuery.removeEventListener("change", applyMotion);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, []);
}
