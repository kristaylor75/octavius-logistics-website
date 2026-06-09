"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { FogExp2 } from "three";
import { useDeepStore } from "./store";
import { Atmosphere } from "./subsystems/Atmosphere";
import { Particulate, tierToCount } from "./subsystems/Particulate";
import { floorHex } from "./palette";

// DEV-only leva panel. The dynamic import sits in a dead branch in production
// (NODE_ENV is statically "production"), so leva is tree-shaken out entirely.
const DEV = process.env.NODE_ENV !== "production";
type ControlsProps = { count: number; setCount: (n: number) => void };
const NullControls: ComponentType<ControlsProps> = () => null;
const ParticulateControls = DEV
  ? dynamic<ControlsProps>(
      () =>
        // The dev panel must never crash the canvas: if its (leva) chunk fails
        // to load, fall back to a no-op so the scene keeps running.
        import("./subsystems/ParticulateControls").catch(() => ({
          default: NullControls,
        })),
      { ssr: false },
    )
  : null;

/**
 * Hot-path frame work: smooth a local pointer value toward the store target, and
 * lightly key the scene fog density to depth (drives the Atmosphere fog feel and
 * the Particulate distance fade). Reads the store via getState(), never React
 * subscriptions.
 */
function DeepFrame() {
  const smoothed = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    const { pointer, depth } = useDeepStore.getState();
    smoothed.current.x += (pointer.x - smoothed.current.x) * 0.1;
    smoothed.current.y += (pointer.y - smoothed.current.y) * 0.1;

    const fog = state.scene.fog;
    if (fog instanceof FogExp2) fog.density = 0.008 + depth * 0.02;
  });

  return null;
}

/** Pause the render loop while the tab is hidden (battery / perf). */
function VisibilityGate() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const onVisibility = () =>
      setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [setFrameloop]);
  return null;
}

/**
 * The persistent, full-viewport WebGL canvas. Renders the animated Atmosphere
 * (depth field) + suspended Particulate behind all content. Lazy-loaded client-
 * side only (ssr:false) via DeepProvider, and only mounted for capable,
 * non-reduced-motion users.
 */
export default function DeepCanvas() {
  // Initial particle count from the capability tier (high/mid; low never mounts).
  const [count, setCount] = useState(() =>
    tierToCount(useDeepStore.getState().tier),
  );

  return (
    <>
      <Canvas
        frameloop="always"
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <fogExp2 attach="fog" args={[floorHex, 0.008]} />
        <Atmosphere />
        <Particulate count={count} />
        <DeepFrame />
        <VisibilityGate />
      </Canvas>
      {ParticulateControls && (
        <ParticulateControls count={count} setCount={setCount} />
      )}
    </>
  );
}
