"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import { ShaderMaterial, Vector2, Vector3, type IUniform } from "three";
import { converter, formatHex, type Oklch } from "culori";
import { useDeepStore } from "../store";
import {
  deepSurface,
  deepMid,
  deepFloor,
  gridLine,
  hueSubtle,
  DEEP_GRID_FADE,
} from "../palette";

/**
 * Caustics (Phase 6) — faint surface light, an ADDITIVE term in the Atmosphere
 * shader (no extra pass). Continuous params live in a mutable singleton read on
 * the frame hot path; the DEV leva panel (AtmosphereControls) writes into it.
 */
export type CausticParams = {
  intensity: number;
  scale: number;
  speed: number;
  depthFalloff: number;
};

export const CAUSTIC_DEFAULTS: CausticParams = {
  intensity: 0.1,
  scale: 0.6,
  speed: 0.04,
  depthFalloff: 1.0,
};

export const causticParams: CausticParams = { ...CAUSTIC_DEFAULTS };

// Colour management mirrors palette.ts: OKLCH → linear-sRGB for the shader (it
// encodes linear→sRGB at the final line). The tint is a faint cool-white so the
// caustics can never read as a saturated gradient. Kept local to this file.
const _toLinear = converter("lrgb");
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
// Tuned blue hue (245°), toned per §3: low chroma so it reads as faint cool
// light, not a saturated blue glow. (User-picked #3880b7 was oklch ~0.58/0.111.)
const CAUSTIC_TINT_OKLCH: Oklch = { mode: "oklch", l: 0.72, c: 0.04, h: 245 }; // #90a8bd

/** Default tint as an sRGB hex, for the dev colour picker's initial value. */
export const CAUSTIC_TINT_HEX = formatHex(CAUSTIC_TINT_OKLCH) ?? "#e9eef2";

/** Live tint, in LINEAR space (mutable so the dev panel can retint). */
export const causticTint = (() => {
  const { r, g, b } = _toLinear(CAUSTIC_TINT_OKLCH);
  return new Vector3(clamp01(r), clamp01(g), clamp01(b));
})();

/** Set the live tint from an sRGB hex (from the dev colour picker). */
export function setCausticTint(hex: string) {
  const c = _toLinear(hex);
  if (c) causticTint.set(clamp01(c.r), clamp01(c.g), clamp01(c.b));
}

/**
 * Atmosphere — the animated depth field, drawn as the canvas background.
 *
 * A fullscreen ScreenQuad with a custom ShaderMaterial (depthTest/Write off,
 * renderOrder -1) so later 3D subsystems sit in front. It reproduces the Phase-2
 * static field (gradient + attenuating datum grid + faint surface accents) so
 * the handoff is invisible at depth≈0, then descends toward the indigo floor as
 * store.depth → 1, with a slow large-scale brightness drift for "living water".
 *
 * Colour: linear in (palette.ts), mixed in linear, encoded linear→sRGB at the
 * final line. No double gamma.
 */
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    // ScreenQuad position is a fullscreen clip-space triangle.
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  varying vec2 vUv;

  uniform float uDepth;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uGridFade;
  uniform vec2  uResolution;
  uniform vec3  uSurface;
  uniform vec3  uMid;
  uniform vec3  uFloor;
  uniform vec3  uGrid;
  uniform vec3  uAccentColor[4];
  uniform vec2  uAccentPos[4];
  uniform float uCausticIntensity;
  uniform float uCausticScale;
  uniform float uCausticSpeed;
  uniform float uCausticFalloff;
  uniform vec3  uCausticTint;
  uniform vec3  uBiasColor; // product-page accent (linear), Phase 7
  uniform float uBiasMix;   // 0 off product pages .. ~0.6 on a product page

  // --- Ashima simplex noise (2D) ---
  vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x){ return mod289(((x * 34.0) + 1.0) * x); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  float fbm(vec2 p){
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { s += a * snoise(p); p *= 2.0; a *= 0.5; }
    return s;
  }

  // linear-by-position gradient between the three deep stops (CSS stops 0/38/100%)
  vec3 gradient(float t){
    t = clamp(t, 0.0, 1.0);
    vec3 c = mix(uSurface, uMid, clamp(t / 0.38, 0.0, 1.0));
    c = mix(c, uFloor, clamp((t - 0.38) / 0.62, 0.0, 1.0));
    return c;
  }

  void main(){
    float p = clamp(1.0 - vUv.y, 0.0, 1.0); // 0 at surface (top) .. 1 at floor (bottom)

    // Descent: scrolling pushes the sampled water column deeper.
    float wd = clamp(p + uDepth * 0.7, 0.0, 1.0);
    vec3 col = gradient(wd);
    col = mix(col, uFloor, uDepth * 0.30); // deepen the whole palette with descent

    // Living water: slow, large-scale brightness drift (chroma untouched).
    float n = fbm(vUv * vec2(1.6, 1.1) + vec2(uTime * 0.015, uTime * 0.011));
    col *= 1.0 + n * 0.035;

    // Attenuating datum grid (8 CSS-px lattice; strongest at surface, gone by ~65% / deep).
    vec2 fc = vUv * uResolution;
    float cell = 8.0 * uPixelRatio;
    vec2 gc = fc / cell;
    vec2 gd = abs(fract(gc - 0.5) - 0.5) / fwidth(gc);
    float line = 1.0 - min(min(gd.x, gd.y), 1.0);
    float gridAtten = 1.0 - clamp(p / 0.65, 0.0, 1.0);
    gridAtten *= (1.0 - uDepth);
    col = mix(col, uGrid, line * uGridFade * 0.6 * gridAtten);

    // Faint, STATIC surface-band bioluminescent accents (match Phase-2 handoff).
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float band = smoothstep(0.45, 1.0, vUv.y) * (1.0 - uDepth * 0.7);
    for (int i = 0; i < 4; i++) {
      vec2 d = (vUv - uAccentPos[i]) * vec2(aspect, 1.0);
      float glow = exp(-dot(d, d) / (0.20 * 0.20));
      // On a product page, bias the surface accents toward that page's hue
      // (no new orbs — the existing accent band just leans to the accent).
      vec3 ac = mix(uAccentColor[i], uBiasColor, uBiasMix);
      col = mix(col, ac, glow * band * 0.11);
    }

    // Caustics: faint light cast from the surface. Two scrolling RIDGED simplex
    // layers (1 - |noise|) multiplied → bright filaments / dark cells, like the
    // network a water surface throws downward. Added in linear space, weighted
    // toward the upper screen (light from above) and gated to ~0 by the floor.
    vec2 cuv = vUv * vec2(aspect, 1.0) * uCausticScale;
    float ct = uTime * uCausticSpeed;
    float cn1 = snoise(cuv + vec2(ct, ct * 0.6));
    float cn2 = snoise(cuv * 1.7 + vec2(-ct * 0.8, ct * 0.5));
    float caustic = (1.0 - abs(cn1)) * (1.0 - abs(cn2));
    caustic = pow(caustic, 3.0); // tighten into thin filaments
    float upper = smoothstep(0.0, 0.95, vUv.y);
    upper *= upper; // weight toward the surface (top of screen)
    // Depth gate: a leading linear (1-depth) factor makes it EXACTLY 0 at the
    // floor, while pow's base is kept strictly positive so pow(0.0, y) is never
    // evaluated (SwiftShader/some drivers return NaN there, which would leak).
    float lin = clamp(1.0 - uDepth, 0.0, 1.0);
    float cDepth = lin * pow(max(lin, 1e-3), max(uCausticFalloff - 1.0, 0.0));
    col += uCausticTint * (caustic * upper * cDepth * uCausticIntensity);

    // Output LINEAR — the EffectComposer (DeepCanvas) owns the final sRGB encode.
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

type AtmoUniforms = {
  uDepth: IUniform<number>;
  uTime: IUniform<number>;
  uPixelRatio: IUniform<number>;
  uGridFade: IUniform<number>;
  uResolution: IUniform<Vector2>;
  uSurface: IUniform<Vector3>;
  uMid: IUniform<Vector3>;
  uFloor: IUniform<Vector3>;
  uGrid: IUniform<Vector3>;
  uAccentColor: IUniform<Vector3[]>;
  uAccentPos: IUniform<Vector2[]>;
  uCausticIntensity: IUniform<number>;
  uCausticScale: IUniform<number>;
  uCausticSpeed: IUniform<number>;
  uCausticFalloff: IUniform<number>;
  uCausticTint: IUniform<Vector3>;
  uBiasColor: IUniform<Vector3>;
  uBiasMix: IUniform<number>;
};

function makeUniforms(): AtmoUniforms {
  return {
    uDepth: { value: 0 },
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uGridFade: { value: DEEP_GRID_FADE },
    uResolution: { value: new Vector2(1, 1) },
    uSurface: { value: deepSurface },
    uMid: { value: deepMid },
    uFloor: { value: deepFloor },
    uGrid: { value: gridLine },
    // Order/positions mirror the Phase-2 CSS accents (upper band, edges).
    uAccentColor: {
      value: [
        hueSubtle.odyssey,
        hueSubtle.cortex,
        hueSubtle.imagine,
        hueSubtle.traderoute,
      ],
    },
    uAccentPos: {
      value: [
        new Vector2(0.92, 0.9),
        new Vector2(0.97, 0.66),
        new Vector2(0.06, 0.92),
        new Vector2(0.5, 0.97),
      ],
    },
    uCausticIntensity: { value: CAUSTIC_DEFAULTS.intensity },
    uCausticScale: { value: CAUSTIC_DEFAULTS.scale },
    uCausticSpeed: { value: CAUSTIC_DEFAULTS.speed },
    uCausticFalloff: { value: CAUSTIC_DEFAULTS.depthFalloff },
    uCausticTint: { value: causticTint.clone() },
    uBiasColor: { value: new Vector3() },
    uBiasMix: { value: 0 },
  };
}

export function Atmosphere() {
  const matRef = useRef<ShaderMaterial>(null);
  // Held in a (mutable) ref so the frame loop can write uniform values without
  // tripping the immutability rule, and without re-allocating each render.
  const uniformsRef = useRef<AtmoUniforms | null>(null);
  const uniforms = (uniformsRef.current ??= makeUniforms());

  useFrame((state, delta) => {
    // r3f gives the material its OWN uniforms object (not the `uniforms` prop
    // instance), so mutate THROUGH the material ref — otherwise none of these
    // reach the GPU. (The prop above only seeds the initial values.)
    const mat = matRef.current;
    if (!mat) return;
    const u = mat.uniforms as unknown as AtmoUniforms;
    const store = useDeepStore.getState();

    u.uDepth.value = store.depth;
    u.uTime.value += Math.min(delta, 0.05);
    state.gl.getDrawingBufferSize(u.uResolution.value);
    u.uPixelRatio.value = state.gl.getPixelRatio();

    u.uCausticIntensity.value = causticParams.intensity;
    u.uCausticScale.value = causticParams.scale;
    u.uCausticSpeed.value = causticParams.speed;
    u.uCausticFalloff.value = causticParams.depthFalloff;
    u.uCausticTint.value.copy(causticTint);

    // Product-page accent bias (Phase 7): ease the surface accents toward the
    // current page hue. Gentle fade so navigation doesn't snap.
    const accent = store.accentHue;
    const targetMix = accent ? 0.4 : 0.0; // subtle tint, not a corner glow (Phase 8)
    u.uBiasMix.value += (targetMix - u.uBiasMix.value) * 0.05;
    if (accent) u.uBiasColor.value.copy(hueSubtle[accent]);
  });

  return (
    <ScreenQuad renderOrder={-1}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        depthTest={false}
        depthWrite={false}
      />
    </ScreenQuad>
  );
}
