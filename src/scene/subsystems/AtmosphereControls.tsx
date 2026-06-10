"use client";

import { useControls } from "leva";
import {
  CAUSTIC_DEFAULTS,
  CAUSTIC_TINT_HEX,
  causticParams,
  setCausticTint,
} from "./Atmosphere";

/**
 * DEV-ONLY leva panel for tuning the Atmosphere caustics (Phase 6).
 *
 * Like ParticulateControls, this statically imports `leva` and is loaded ONLY
 * via a dead-branch `next/dynamic` in DeepCanvas (gated on NODE_ENV), so leva is
 * tree-shaken out of the production bundle. Continuous params are written
 * straight into the mutable `causticParams` (read on the render hot path); the
 * tint goes through `setCausticTint` (sRGB hex → linear vector).
 *
 * Note: no <Leva/> root here — ParticulateControls already renders it; a second
 * root would duplicate the panel. This just registers a "Caustics" folder.
 */
export default function AtmosphereControls() {
  useControls("Caustics", {
    intensity: {
      value: CAUSTIC_DEFAULTS.intensity,
      min: 0,
      max: 0.2,
      step: 0.005,
      onChange: (v: number) => {
        causticParams.intensity = v;
      },
    },
    scale: {
      value: CAUSTIC_DEFAULTS.scale,
      min: 0.5,
      max: 10,
      step: 0.1,
      onChange: (v: number) => {
        causticParams.scale = v;
      },
    },
    speed: {
      value: CAUSTIC_DEFAULTS.speed,
      min: 0,
      max: 0.2,
      step: 0.005,
      onChange: (v: number) => {
        causticParams.speed = v;
      },
    },
    depthFalloff: {
      value: CAUSTIC_DEFAULTS.depthFalloff,
      min: 0.5,
      max: 4,
      step: 0.1,
      onChange: (v: number) => {
        causticParams.depthFalloff = v;
      },
    },
    tint: {
      value: CAUSTIC_TINT_HEX,
      onChange: (v: string) => {
        setCausticTint(v);
      },
    },
  });

  return null;
}
