"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  DynamicDrawUsage,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  type Mesh,
  ShaderMaterial,
  Vector2,
} from "three";
import { useDeepStore } from "../store";
import { hueColors, type HueKey } from "../palette";

/**
 * Bioluminescence (Phase 7) — soft additive glow that lives ON the instruments.
 *
 * The five instruments are DOM/SVG (hero constellation, index rows); this WebGL
 * layer sits behind them. The hero/index publish their live *screen* positions
 * into store.anchors; here we draw one soft additive glow quad behind each, in
 * its product hue, pulsing slowly. A gentle selective bloom (DeepCanvas) makes
 * only these bleed light. Colour is emitted in LINEAR — the EffectComposer owns
 * the final linear→sRGB encode (see DeepCanvas / Atmosphere notes).
 *
 * One instanced draw call (instanced quads, not gl_Points → no point-size caps),
 * positions written straight in NDC each frame from the anchors.
 */

export type BioParams = {
  glowRadius: number; // hero glow radius in CSS px (index scales down via strength)
  intensity: number;
  pulsePeriod: number; // seconds
  pulseDepth: number; // 0..1 size/brightness modulation
};

export const BIO_DEFAULTS: BioParams = {
  glowRadius: 90,
  intensity: 0.42, // signal, not orb (Phase 8)
  pulsePeriod: 5.5, // slower, calmer
  pulseDepth: 0.22,
};

// Mutable singletons read on the frame hot path; the DEV leva panel writes them.
export const bioParams: BioParams = { ...BIO_DEFAULTS };
// Per-hue brightness balance: amber/magenta read hotter than indigo, so trim
// them and lift cortex a touch — the five lights match in perceived weight.
export const bioHueMult: Record<HueKey, number> = {
  cortex: 1.1,
  reflex: 0.85,
  imagine: 0.8,
  odyssey: 1,
  traderoute: 1,
};

/** Selective-bloom defaults (DeepCanvas). intensity/threshold are live-tunable
 *  via `bloomParams`; radius is a fixed prop (a change would re-mount the
 *  composer — see DeepCanvas). */
export const BLOOM_DEFAULTS = { intensity: 0.38, threshold: 0.2, radius: 0.4 };
export const bloomParams = {
  intensity: BLOOM_DEFAULTS.intensity,
  threshold: BLOOM_DEFAULTS.threshold,
};

const MAX = 24; // hero (5) + index rows (5) + headroom

/** Stable per-id pulse phase so each instrument keeps its own rhythm. */
function phaseFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 1000) / 1000) * Math.PI * 2;
}

const VERT = /* glsl */ `
  // position (vec3) + uv (vec2) are auto-injected by ShaderMaterial.
  attribute vec2 aNdc;
  attribute vec3 aColor;
  attribute float aStrength;
  attribute float aPhase;
  uniform vec2 uViewport;   // CSS px
  uniform float uTime;
  uniform float uGlowRadius; // CSS px
  uniform float uPulsePeriod;
  uniform float uPulseDepth;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vBright;

  void main() {
    vUv = uv;
    vColor = aColor;
    float pulse = 1.0 + uPulseDepth * sin(6.28318530718 * uTime / max(uPulsePeriod, 0.001) + aPhase);
    float sizePx = uGlowRadius * (0.4 + 0.6 * aStrength) * pulse;
    vec2 sizeNdc = vec2(sizePx / uViewport.x * 2.0, sizePx / uViewport.y * 2.0);
    vec2 ndc = aNdc + position.xy * sizeNdc;
    vBright = aStrength * (0.8 + 0.2 * pulse);
    gl_Position = vec4(ndc, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  varying vec3 vColor;  // LINEAR (composer encodes)
  varying float vBright;
  void main() {
    float d = length(vUv - 0.5) * 2.0; // 0 centre .. 1 edge
    float fall = smoothstep(1.0, 0.0, d);
    fall *= fall; // tighter, instrument-signal core (not a flat orb)
    float a = fall * uIntensity * vBright;
    if (a < 0.002) discard;
    gl_FragColor = vec4(vColor, a); // additive: adds vColor * a
  }
`;

function makeGeometry(): InstancedBufferGeometry {
  const geom = new InstancedBufferGeometry();
  geom.setAttribute(
    "position",
    new Float32BufferAttribute(
      [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0],
      3,
    ),
  );
  geom.setAttribute("uv", new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geom.setIndex([0, 1, 2, 0, 2, 3]);
  const mk = (n: number) => {
    const a = new InstancedBufferAttribute(new Float32Array(MAX * n), n);
    a.setUsage(DynamicDrawUsage);
    return a;
  };
  geom.setAttribute("aNdc", mk(2));
  geom.setAttribute("aColor", mk(3));
  geom.setAttribute("aStrength", mk(1));
  geom.setAttribute("aPhase", mk(1));
  geom.instanceCount = 0;
  return geom;
}

function makeUniforms() {
  return {
    uTime: { value: 0 },
    uViewport: { value: new Vector2(1, 1) },
    uGlowRadius: { value: BIO_DEFAULTS.glowRadius },
    uIntensity: { value: BIO_DEFAULTS.intensity },
    uPulsePeriod: { value: BIO_DEFAULTS.pulsePeriod },
    uPulseDepth: { value: BIO_DEFAULTS.pulseDepth },
  };
}

export function Bioluminescence() {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const geom = useMemo(() => makeGeometry(), []);
  const uniforms = useMemo(() => makeUniforms(), []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    const g = mesh.geometry as InstancedBufferGeometry;
    const u = mat.uniforms;
    const store = useDeepStore.getState();
    const dt = Math.min(delta, 0.05);

    u.uTime.value += dt;
    (u.uViewport.value as Vector2).set(state.size.width, state.size.height);
    u.uGlowRadius.value = bioParams.glowRadius;
    u.uIntensity.value = bioParams.intensity;
    u.uPulsePeriod.value = bioParams.pulsePeriod;
    // Defensive: never pulse under reduced motion (static, fully legible glow).
    u.uPulseDepth.value = store.reducedMotion ? 0 : bioParams.pulseDepth;

    const list = store.anchors;
    const n = Math.min(list.length, MAX);
    const W = state.size.width || 1;
    const H = state.size.height || 1;
    const ndc = g.attributes.aNdc.array as Float32Array;
    const col = g.attributes.aColor.array as Float32Array;
    const str = g.attributes.aStrength.array as Float32Array;
    const pha = g.attributes.aPhase.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const a = list[i];
      ndc[i * 2] = (a.x / W) * 2 - 1;
      ndc[i * 2 + 1] = 1 - (a.y / H) * 2;
      const c = hueColors[a.hue];
      const m = bioHueMult[a.hue] ?? 1;
      col[i * 3] = c.r * m;
      col[i * 3 + 1] = c.g * m;
      col[i * 3 + 2] = c.b * m;
      str[i] = a.strength;
      pha[i] = phaseFor(a.id);
    }
    if (n > 0) {
      g.attributes.aNdc.needsUpdate = true;
      g.attributes.aColor.needsUpdate = true;
      g.attributes.aStrength.needsUpdate = true;
      g.attributes.aPhase.needsUpdate = true;
    }
    g.instanceCount = n;
  });

  return (
    <mesh ref={meshRef} geometry={geom} frustumCulled={false} renderOrder={2}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
