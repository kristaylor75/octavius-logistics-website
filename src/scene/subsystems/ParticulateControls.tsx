"use client";

import { createPortal } from "react-dom";
import { Leva, useControls } from "leva";
import { DEFAULTS, particleParams } from "./Particulate";

/**
 * DEV-ONLY leva panel for tuning the Particulate subsystem.
 *
 * This module statically imports `leva`; it is loaded ONLY via a dead-branch
 * `next/dynamic` in DeepCanvas (gated on NODE_ENV), so leva is tree-shaken out
 * of the production bundle. Continuous params are written straight into the
 * mutable `particleParams` (read on the render hot path); `count` rebuilds the
 * geometry, so it goes through React state via `setCount`.
 *
 * Also renders the ONE shared <Leva/> root for the whole scene, PORTALED to
 * document.body (this component mounts inside DeepCanvas, which lives in
 * DeepProvider's `fixed inset-0` wrapper at z-index -20, pointer-events:none —
 * rendered inline the panel would be behind the page and non-interactive). Every
 * subsystem registers a folder into this one panel (Particulate / Caustics /
 * Bioluminescence / Bloom / Bio · per-hue). The schema is inline in useControls
 * — extracting it, or wrapping it in folder(), trips the react-hooks
 * immutability rule on the singleton-mutation onChange handlers.
 */
export default function ParticulateControls({
  count,
  setCount,
}: {
  count: number;
  setCount: (n: number) => void;
}) {
  useControls("Particulate", {
    count: {
      value: count,
      min: 0,
      max: 4000,
      step: 100,
      onChange: (v: number) => setCount(v),
    },
    size: {
      value: DEFAULTS.size,
      min: 0.5,
      max: 8,
      step: 0.1,
      onChange: (v: number) => {
        particleParams.size = v;
      },
    },
    opacity: {
      value: DEFAULTS.opacity,
      min: 0,
      max: 0.5,
      step: 0.01,
      onChange: (v: number) => {
        particleParams.opacity = v;
      },
    },
    driftSpeed: {
      value: DEFAULTS.driftSpeed,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: (v: number) => {
        particleParams.driftSpeed = v;
      },
    },
    flowScale: {
      value: DEFAULTS.flowScale,
      min: 0.02,
      max: 0.8,
      step: 0.01,
      onChange: (v: number) => {
        particleParams.flowScale = v;
      },
    },
    flowSpeed: {
      value: DEFAULTS.flowSpeed,
      min: 0,
      max: 0.5,
      step: 0.005,
      onChange: (v: number) => {
        particleParams.flowSpeed = v;
      },
    },
    flowAmp: {
      value: DEFAULTS.flowAmp,
      min: 0,
      max: 4,
      step: 0.05,
      onChange: (v: number) => {
        particleParams.flowAmp = v;
      },
    },
    bubbleAmount: {
      value: DEFAULTS.bubbleAmount,
      min: 0,
      max: 1,
      step: 0.05,
      onChange: (v: number) => {
        particleParams.bubbleAmount = v;
      },
    },
    riseSpeed: {
      value: DEFAULTS.riseSpeed,
      min: 0,
      max: 2,
      step: 0.02,
      onChange: (v: number) => {
        particleParams.riseSpeed = v;
      },
    },
    wobble: {
      value: DEFAULTS.wobble,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: (v: number) => {
        particleParams.wobble = v;
      },
    },
    plumeStrength: {
      value: DEFAULTS.plumeStrength,
      min: 0,
      max: 1.5,
      step: 0.05,
      onChange: (v: number) => {
        particleParams.plumeStrength = v;
      },
    },
    pointerInfluence: {
      value: DEFAULTS.pointerInfluence,
      min: 0,
      max: 0.3,
      step: 0.005,
      onChange: (v: number) => {
        particleParams.pointerInfluence = v;
      },
    },
    pointerRadius: {
      value: DEFAULTS.pointerRadius,
      min: 0.05,
      max: 1,
      step: 0.01,
      onChange: (v: number) => {
        particleParams.pointerRadius = v;
      },
    },
    scrollInfluence: {
      value: DEFAULTS.scrollInfluence,
      min: 0,
      max: 2,
      step: 0.05,
      onChange: (v: number) => {
        particleParams.scrollInfluence = v;
      },
    },
    fogFade: {
      value: DEFAULTS.fogFade,
      min: 0,
      max: 30,
      step: 0.5,
      onChange: (v: number) => {
        particleParams.fogFade = v;
      },
    },
  });

  return createPortal(<Leva collapsed />, document.body);
}
