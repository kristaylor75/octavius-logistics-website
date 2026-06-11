"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor, Preload } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import type { BloomEffect } from "postprocessing";
import { FogExp2 } from "three";
import { useDeepStore, type Tier } from "./store";
import {
  Atmosphere,
  causticParams,
  CAUSTIC_DEFAULTS,
} from "./subsystems/Atmosphere";
import {
  Particulate,
  tierToCount,
  particleParams,
  DEFAULTS as PARTICLE_DEFAULTS,
} from "./subsystems/Particulate";
import {
  Bioluminescence,
  bloomParams,
  BLOOM_DEFAULTS,
} from "./subsystems/Bioluminescence";
import { Octopus } from "./subsystems/Octopus";
import { floorHex } from "./palette";

// Adaptive quality levels (Phase 11). The PerformanceMonitor steps DOWN the
// level on sustained FPS dips and UP on headroom, applying reductions in the
// brief's order: particulate count → caustics → bloom → drift. (AdaptiveDpr
// scales the pixel ratio in parallel — the largest real GPU saving.)
const MAX_LEVEL = 4;
const COUNT_MUL = [1, 0.6, 0.55, 0.5, 0.4];

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
export default function DeepCanvas({ tier }: { tier: Tier }) {
  const bloomRef = useRef<BloomEffect>(null);

  // Quality level (mid starts one notch down for headroom). levelRef is the
  // source of truth for the guard's event callbacks; `level` state re-derives
  // the particle count. The dev count slider can override (countOverride).
  const initialLevel = tier === "mid" ? 1 : 0;
  const levelRef = useRef(initialLevel);
  const [level, setLevel] = useState(initialLevel);
  const [countOverride, setCountOverride] = useState<number | null>(null);
  const count =
    countOverride ?? Math.round(tierToCount(tier) * COUNT_MUL[level]);

  // Apply the ordered caustics/bloom/drift drops for a level (count is derived).
  // Mutates the same singletons the dev panels do; in production the guard owns
  // them. Run from the step callbacks (event handlers), never an effect.
  const applyLevel = useCallback((l: number) => {
    causticParams.intensity = l >= 2 ? 0 : CAUSTIC_DEFAULTS.intensity;
    bloomParams.intensity = l >= 3 ? 0 : BLOOM_DEFAULTS.intensity;
    const driftMul = l >= 4 ? 0.5 : 1;
    particleParams.driftSpeed = PARTICLE_DEFAULTS.driftSpeed * driftMul;
    particleParams.flowSpeed = PARTICLE_DEFAULTS.flowSpeed * driftMul;
  }, []);
  const setQuality = useCallback(
    (next: number) => {
      const nl = Math.max(0, Math.min(MAX_LEVEL, next));
      if (nl === levelRef.current) return;
      levelRef.current = nl;
      applyLevel(nl);
      setLevel(nl);
    },
    [applyLevel],
  );
  const stepDown = useCallback(() => setQuality(levelRef.current + 1), [setQuality]);
  const stepUp = useCallback(() => setQuality(levelRef.current - 1), [setQuality]);
  const stepFloor = useCallback(() => setQuality(MAX_LEVEL), [setQuality]);

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
        dpr={tier === "mid" ? [1, 1.5] : [1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        // The canvas is decorative ambient water: hide it from assistive tech
        // and the tab order entirely (the wrapper is also aria-hidden /
        // pointer-events:none — this is belt-and-suspenders).
        onCreated={({ gl }) => {
          gl.domElement.setAttribute("aria-hidden", "true");
          gl.domElement.setAttribute("tabindex", "-1");
        }}
      >
        <fogExp2 attach="fog" args={[floorHex, 0.008]} />
        <Atmosphere />
        <Octopus />
        <Particulate count={count} />
        <Bioluminescence />
        <DeepFrame />
        <VisibilityGate />
        <BloomController bloomRef={bloomRef} />
        {/* Adaptive quality guard: AdaptiveDpr scales pixel ratio first; the
            PerformanceMonitor steps the quality level down on sustained dips and
            back up on headroom (with a flip-flop cap → lock to floor). */}
        <PerformanceMonitor
          onDecline={stepDown}
          onIncline={stepUp}
          flipflops={4}
          onFallback={stepFloor}
        >
          <AdaptiveDpr pixelated={false} />
        </PerformanceMonitor>
        {/* Compile shaders / upload buffers before the first visible frame. */}
        <Preload all />
        {/* Gentle SELECTIVE bloom: only the bright bioluminescence exceeds the
            luminance threshold; the dark field/particulate/caustics stay crisp.
            intensity/threshold are mutated live (BloomController); radius is
            fixed (a prop change would re-mount the composer). */}
        {postfx}
      </Canvas>
      {ParticulateControls && (
        <ParticulateControls count={count} setCount={setCountOverride} />
      )}
      {AtmosphereControls && <AtmosphereControls />}
      {BioluminescenceControls && <BioluminescenceControls />}
      {OctopusControls && <OctopusControls />}
    </>
  );
}
