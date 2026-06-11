import type { Tier } from "./store";

/**
 * Device capability tiering for "The Deep" (Phase 11) — the single source of
 * truth, used by both DeepProvider (mount decision) and useDeepDrivers (store).
 *
 *   low  → no WebGL canvas; the static CSS fallback is the whole experience.
 *   mid  → canvas mounts at reduced quality (fewer particles, lower DPR cap).
 *   high → full quality.
 *
 * The decision is a heuristic blend: prefers-reduced-motion / save-data / no
 * WebGL / a software (SwiftShader, llvmpipe) GPU all force `low`; a weak GPU
 * string, ≤4 cores, or ≤4 GB device memory drop to `mid`. Reduced motion always
 * wins (accessibility). A `?deepTier=high|mid|low` query param forces a tier for
 * QA across devices — but never overrides reduced motion.
 */

interface NavigatorWithCaps extends Navigator {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
}

/** Best-effort check that a WebGL context can be created at all. */
export function hasWebGL(): boolean {
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

/** The unmasked GPU renderer string, or "" if unavailable. */
function gpuRenderer(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "")
      : "";
  } catch {
    return "";
  }
}

const SOFTWARE = /swiftshader|llvmpipe|software|basic render|microsoft basic/i;
// Conservative "weak GPU" list — clear low-end mobile / very old integrated
// parts. Unknown GPUs default to capable; the adaptive guard catches the rest.
const WEAK_GPU =
  /mali-4\d{2}|mali-t[1-6]\d{2}|adreno [1-3]\d{2}|powervr|videocore|geforce 8|geforce 9\d{2}|intel.*(hd|uhd) graphics (2|3|4|5|6)\d{2}/i;

export function computeTier(): Tier {
  if (typeof window === "undefined") return "low";

  // Reduced motion always wins — even over the QA override (accessibility).
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "low";
  }

  const override = new URLSearchParams(window.location.search).get("deepTier");
  if (override === "high" || override === "mid" || override === "low") {
    return override;
  }

  const nav = navigator as NavigatorWithCaps;
  if ((nav.connection?.saveData ?? false) || !hasWebGL()) return "low";

  const renderer = gpuRenderer();
  if (SOFTWARE.test(renderer)) return "low";

  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = nav.deviceMemory ?? 8;
  if (WEAK_GPU.test(renderer) || cores <= 4 || mem <= 4) return "mid";

  return "high";
}
