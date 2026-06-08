"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import { ShaderMaterial, Vector2, Vector3, type IUniform } from "three";
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

  vec3 linearToSRGB(vec3 c){
    c = max(c, 0.0);
    return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, c * 12.92, step(c, vec3(0.0031308)));
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
      col = mix(col, uAccentColor[i], glow * band * 0.11);
    }

    gl_FragColor = vec4(linearToSRGB(clamp(col, 0.0, 1.0)), 1.0);
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
  };
}

export function Atmosphere() {
  const matRef = useRef<ShaderMaterial>(null);
  // Held in a (mutable) ref so the frame loop can write uniform values without
  // tripping the immutability rule, and without re-allocating each render.
  const uniformsRef = useRef<AtmoUniforms | null>(null);
  const uniforms = (uniformsRef.current ??= makeUniforms());

  useFrame((state, delta) => {
    uniforms.uDepth.value = useDeepStore.getState().depth;
    uniforms.uTime.value += Math.min(delta, 0.05);
    state.gl.getDrawingBufferSize(uniforms.uResolution.value);
    uniforms.uPixelRatio.value = state.gl.getPixelRatio();
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
