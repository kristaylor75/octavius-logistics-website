"use client";

import { useControls } from "leva";
import {
  BIO_DEFAULTS,
  BLOOM_DEFAULTS,
  bioParams,
  bioHueMult,
  bloomParams,
} from "./Bioluminescence";

const HUE_DEFAULTS = { ...bioHueMult };

/**
 * DEV-ONLY leva panel for the Bioluminescence + selective Bloom (Phase 7/8).
 *
 * Registers folders into the shared leva panel (the single <Leva> root is
 * rendered/portaled by ParticulateControls), so this returns null. All params
 * write into mutable singletons read on the frame hot path (and mutated onto the
 * live Bloom effect by BloomController) — nothing here triggers a React
 * re-render, so the EffectComposer never re-mounts mid-tweak. Bloom radius is a
 * fixed prop (a change would re-mount the composer); intensity/threshold tune.
 */
export default function BioluminescenceControls() {
  useControls("Bioluminescence", {
    glowRadius: {
      value: BIO_DEFAULTS.glowRadius,
      min: 20,
      max: 240,
      step: 1,
      onChange: (v: number) => {
        bioParams.glowRadius = v;
      },
    },
    intensity: {
      value: BIO_DEFAULTS.intensity,
      min: 0,
      max: 2,
      step: 0.02,
      onChange: (v: number) => {
        bioParams.intensity = v;
      },
    },
    pulsePeriod: {
      value: BIO_DEFAULTS.pulsePeriod,
      min: 1,
      max: 12,
      step: 0.1,
      onChange: (v: number) => {
        bioParams.pulsePeriod = v;
      },
    },
    pulseDepth: {
      value: BIO_DEFAULTS.pulseDepth,
      min: 0,
      max: 0.6,
      step: 0.01,
      onChange: (v: number) => {
        bioParams.pulseDepth = v;
      },
    },
  });

  useControls("Bloom", {
    bloomIntensity: {
      value: BLOOM_DEFAULTS.intensity,
      min: 0,
      max: 2,
      step: 0.02,
      onChange: (v: number) => {
        bloomParams.intensity = v;
      },
    },
    bloomThreshold: {
      value: BLOOM_DEFAULTS.threshold,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: (v: number) => {
        bloomParams.threshold = v;
      },
    },
  });

  useControls("Bio · per-hue", {
    cortex: {
      value: HUE_DEFAULTS.cortex,
      min: 0,
      max: 2,
      step: 0.05,
      onChange: (v: number) => {
        bioHueMult.cortex = v;
      },
    },
    reflex: {
      value: HUE_DEFAULTS.reflex,
      min: 0,
      max: 2,
      step: 0.05,
      onChange: (v: number) => {
        bioHueMult.reflex = v;
      },
    },
    imagine: {
      value: HUE_DEFAULTS.imagine,
      min: 0,
      max: 2,
      step: 0.05,
      onChange: (v: number) => {
        bioHueMult.imagine = v;
      },
    },
    odyssey: {
      value: HUE_DEFAULTS.odyssey,
      min: 0,
      max: 2,
      step: 0.05,
      onChange: (v: number) => {
        bioHueMult.odyssey = v;
      },
    },
    traderoute: {
      value: HUE_DEFAULTS.traderoute,
      min: 0,
      max: 2,
      step: 0.05,
      onChange: (v: number) => {
        bioHueMult.traderoute = v;
      },
    },
  });

  return null;
}
