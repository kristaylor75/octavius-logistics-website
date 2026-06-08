"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { FogExp2 } from "three";
import { useDeepStore } from "./store";
import { Atmosphere } from "./subsystems/Atmosphere";
import { floorHex } from "./palette";

/**
 * Hot-path frame work: smooth a local pointer value toward the store target, and
 * lightly key the scene fog density to depth (forward-prep for later 3D — no
 * visible effect yet, since the background ScreenQuad doesn't use fog). Reads the
 * store via getState(), never React subscriptions.
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
 * (depth field) behind all content. Lazy-loaded client-side only (ssr:false) via
 * DeepProvider, and only mounted for capable, non-reduced-motion users.
 */
export default function DeepCanvas() {
  return (
    <Canvas
      frameloop="always"
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <fogExp2 attach="fog" args={[floorHex, 0.008]} />
      <Atmosphere />
      <DeepFrame />
      <VisibilityGate />
    </Canvas>
  );
}
