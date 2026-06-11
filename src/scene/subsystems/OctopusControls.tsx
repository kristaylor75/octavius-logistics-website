"use client";

import { useControls } from "leva";
import { OCTO_DEFAULTS, octopusParams } from "./Octopus";

/**
 * DEV-ONLY leva panel for the Octopus (Phase 9). Registers an "Octopus" folder
 * into the shared leva panel (the one <Leva/> root is rendered/portaled by
 * ParticulateControls), so this returns null. Schema stays inline in useControls
 * so the singleton-mutation onChange handlers satisfy the immutability rule.
 */
export default function OctopusControls() {
  useControls("Octopus", {
    presence: {
      value: OCTO_DEFAULTS.presence,
      min: 0,
      max: 0.5,
      step: 0.005,
      onChange: (v: number) => {
        octopusParams.presence = v;
      },
    },
    parallaxDepth: {
      value: OCTO_DEFAULTS.parallaxDepth,
      min: 0,
      max: 2,
      step: 0.05,
      onChange: (v: number) => {
        octopusParams.parallaxDepth = v;
      },
    },
    posX: {
      value: OCTO_DEFAULTS.posX,
      min: -8,
      max: 8,
      step: 0.1,
      onChange: (v: number) => {
        octopusParams.posX = v;
      },
    },
    posY: {
      value: OCTO_DEFAULTS.posY,
      min: -6,
      max: 6,
      step: 0.1,
      onChange: (v: number) => {
        octopusParams.posY = v;
      },
    },
    armCurlStrength: {
      value: OCTO_DEFAULTS.armCurlStrength,
      min: 0,
      max: 2,
      step: 0.05,
      onChange: (v: number) => {
        octopusParams.armCurlStrength = v;
      },
    },
  });

  return null;
}
