"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import type { BloomEffect } from "postprocessing";
import { FogExp2 } from "three";
import { useDeepStore } from "./store";
import { Atmosphere } from "./subsystems/Atmosphere";
import { Particulate, tierToCount } from "./subsystems/Particulate";
import {
  Bioluminescence,
  bloomParams,
  BLOOM_DEFAULTS,
} from "./subsystems/Bioluminescence";
import { Octopus } from "./subsystems/Octopus";
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
// Caustics dev panel — a leva DOM panel can't live inside the <Canvas>, so it's
// mounted here alongside ParticulateControls (same dev-gated, non-fatal pattern).
const AtmosphereControls = DEV
  ? dynamic(
      () =>
        import("./subsystems/AtmosphereControls").catch(() => ({
          default: () => null,
        })),
      { ssr: false },
    )
  : null;
const BioluminescenceControls = DEV
  ? dynamic(
      () =>
        import("./subsystems/BioluminescenceControls").catch(() => ({
          default: () => null,
        })),
      { ssr: false },
    )
  : null;
const OctopusControls = DEV
  ? dynamic(
      () =>
        import("./subsystems/OctopusControls").catch(() => ({
          default: () => null,
        })),
      { ssr: false },
    )
  : null;

/** Drive the (live-tunable) bloom intensity/threshold from the dev singleton. */
function BloomController({
  bloomRef,
}: {
  bloomRef: RefObject<BloomEffect | null>;
}) {
  useFrame(() => {
    const b = bloomRef.current;
    if (!b) return;
    b.intensity = bloomParams.intensity;
    b.luminanceMaterial.threshold = bloomParams.threshold;
  });
  return null;
}

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
  const bloomRef = useRef<BloomEffect>(null);

  // Memoized so its element identity is STABLE across DeepCanvas re-renders
  // (e.g. the `count` slider): the EffectComposer must not see new children and
  // re-mount mid-frame — that throws and surfaces as a circular-JSON overlay.
  const postfx = useMemo(
    () => (
      <EffectComposer>
        <Bloom
          ref={bloomRef}
          mipmapBlur
          intensity={BLOOM_DEFAULTS.intensity}
          luminanceThreshold={BLOOM_DEFAULTS.threshold}
          luminanceSmoothing={0.15}
          radius={BLOOM_DEFAULTS.radius}
        />
        {/* Subtle instrument framing — only the outer edge deepens, center is
            untouched. Not mood lighting; no DOF. (Phase 8) */}
        <Vignette offset={0.55} darkness={0.32} />
      </EffectComposer>
    ),
    [],
  );

  return (
    <>
      {/* `flat` = NoToneMapping; with the EffectComposer the scene renders in
          LINEAR and the composer owns the single linear→sRGB encode (so the
          subsystems output linear — see Atmosphere/Particulate/Bioluminescence). */}
      <Canvas
        flat
        frameloop="always"
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <fogExp2 attach="fog" args={[floorHex, 0.008]} />
        <Atmosphere />
        <Octopus />
        <Particulate count={count} />
        <Bioluminescence />
        <DeepFrame />
        <VisibilityGate />
        <BloomController bloomRef={bloomRef} />
        {/* Gentle SELECTIVE bloom: only the bright bioluminescence exceeds the
            luminance threshold; the dark field/particulate/caustics stay crisp.
            intensity/threshold are mutated live (BloomController); radius is
            fixed (a prop change would re-mount the composer). */}
        {postfx}
      </Canvas>
      {ParticulateControls && (
        <ParticulateControls count={count} setCount={setCount} />
      )}
      {AtmosphereControls && <AtmosphereControls />}
      {BioluminescenceControls && <BioluminescenceControls />}
      {OctopusControls && <OctopusControls />}
    </>
  );
}
