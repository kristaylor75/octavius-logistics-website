"use client";

import { useEffect } from "react";
import { useDeepStore } from "@/scene/store";
import type { HueKey } from "@/scene/palette";

/**
 * Publishes the current product page's accent hue into the Deep store (Phase 7)
 * so the ambient Atmosphere biases its surface accents toward it. Clears on
 * unmount. Renders nothing; no SSR/markup impact.
 */
export function ProductAccentBridge({ hue }: { hue: HueKey }) {
  useEffect(() => {
    useDeepStore.getState().setAccentHue(hue);
    return () => useDeepStore.getState().setAccentHue(null);
  }, [hue]);
  return null;
}
