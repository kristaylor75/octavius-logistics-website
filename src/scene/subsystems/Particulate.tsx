"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  FogExp2,
  NormalBlending,
  ShaderMaterial,
  Vector2,
  Vector3,
  type IUniform,
} from "three";
import { particleColor } from "../palette";
import { useDeepStore, type Tier } from "../store";
import { FLOW_GLSL } from "../flow";

/**
 * Particulate — suspended "marine snow": one THREE.Points (single draw call) of
 * small, soft, low-opacity specks. All motion is analytic in the vertex shader
 * (Phase 5): a static base position transported down over time (with wrap),
 * displaced by a curl-noise current, then deflected by a pointer swirl and a
 * brief scroll turbulence. Cheap (no CPU loop), organic, never blown around.
 */

export type ParticleParams = {
  size: number;
  opacity: number;
  driftSpeed: number;
  fogFade: number;
  flowScale: number;
  flowSpeed: number;
  flowAmp: number;
  pointerInfluence: number;
  pointerRadius: number;
  scrollInfluence: number;
};

export const DEFAULTS: ParticleParams = {
  size: 2.8,
  opacity: 0.23,
  driftSpeed: 0.26,
  fogFade: 11,
  flowScale: 0.41,
  flowSpeed: 0.13,
  flowAmp: 0.45,
  pointerInfluence: 0.19,
  pointerRadius: 0.63,
  scrollInfluence: 0.7,
};

export const particleParams: ParticleParams = { ...DEFAULTS };

export function tierToCount(tier: Tier): number {
  if (tier === "mid") return 380; // ~proportional to the tuned high count
  if (tier === "low") return 0; // never mounted (no canvas)
  return 1300; // high (tuned)
}

// Volume (half-extents) in front of the default r3f camera (z=5, looking -z).
const HALF_X = 12;
const HALF_Y = 10;
const Z_NEAR = 2;
const Z_FAR = -14;

function buildData(count: number) {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * HALF_X;
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * HALF_Y;
    positions[i * 3 + 2] = Z_FAR + Math.random() * (Z_NEAR - Z_FAR);
    scales[i] = 0.5 + Math.random() * 0.9;
    seeds[i] = Math.random();
  }
  return { positions, scales, seeds };
}

const VERT = /* glsl */ `
  ${FLOW_GLSL}

  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uDriftSpeed;
  uniform float uFlowScale;
  uniform float uFlowSpeed;
  uniform float uFlowAmp;
  uniform float uPointerInfluence;
  uniform float uPointerRadius;
  uniform float uScrollInfluence;
  uniform float uVelocity;
  uniform float uAspect;
  uniform vec2 uPointer;
  attribute float aScale;
  attribute float aSeed;
  varying float vViewZ;
  varying float vEdgeFade;

  const float HALF_Y = 10.0;

  void main() {
    vec3 base = position;
    // Transport: drift down over time, wrapping over the volume height.
    base.y = mod(base.y - uDriftSpeed * uTime + HALF_Y, 2.0 * HALF_Y) - HALF_Y;
    // Fade near the volume's vertical limits so the wrap is invisible.
    vEdgeFade = 1.0 - smoothstep(HALF_Y * 0.7, HALF_Y, abs(base.y));

    // Curl-noise current (divergence-free → organic, not gridded).
    vec3 flow = curlNoise(base * uFlowScale + vec3(0.0, 0.0, uTime * uFlowSpeed) + aSeed * 7.0);
    vec3 pos = base + flow * uFlowAmp;

    // Scroll: brief, soft vertical turbulence scaled by scroll velocity.
    pos.y += snoise(base * (uFlowScale * 1.6) + vec3(uTime * 0.6, 0.0, aSeed * 3.0)) * uVelocity * uScrollInfluence;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewZ = -mvPosition.z;
    vec4 clip = projectionMatrix * mvPosition;

    // Pointer: a soft tangential swirl near the (trailing) cursor, in NDC.
    vec2 ndc = clip.xy / clip.w;
    vec2 rel = ndc - uPointer;
    float dist = length(rel * vec2(uAspect, 1.0));
    float fall = smoothstep(uPointerRadius, 0.0, dist);
    ndc += vec2(-rel.y, rel.x) * fall * uPointerInfluence;
    clip.xy = ndc * clip.w;

    gl_PointSize = clamp(uSize * aScale * uPixelRatio * (10.0 / max(vViewZ, 0.001)), 0.0, 16.0);
    gl_Position = clip;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;     // sRGB; composited in the canvas's sRGB framebuffer
  uniform float uOpacity;
  uniform float uFogDensity;
  varying float vViewZ;
  varying float vEdgeFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float circle = smoothstep(0.5, 0.18, d);
    if (circle < 0.01) discard;
    float fog = 1.0 - exp(-uFogDensity * uFogDensity * vViewZ * vViewZ);
    float alpha = circle * uOpacity * (1.0 - fog) * vEdgeFade;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

type PointUniforms = {
  uTime: IUniform<number>;
  uSize: IUniform<number>;
  uOpacity: IUniform<number>;
  uPixelRatio: IUniform<number>;
  uFogDensity: IUniform<number>;
  uDriftSpeed: IUniform<number>;
  uFlowScale: IUniform<number>;
  uFlowSpeed: IUniform<number>;
  uFlowAmp: IUniform<number>;
  uPointerInfluence: IUniform<number>;
  uPointerRadius: IUniform<number>;
  uScrollInfluence: IUniform<number>;
  uVelocity: IUniform<number>;
  uAspect: IUniform<number>;
  uPointer: IUniform<Vector2>;
  uColor: IUniform<Vector3>;
};

function makePointUniforms(): PointUniforms {
  return {
    uTime: { value: 0 },
    uSize: { value: DEFAULTS.size },
    uOpacity: { value: DEFAULTS.opacity },
    uPixelRatio: { value: 1 },
    uFogDensity: { value: 0.05 },
    uDriftSpeed: { value: DEFAULTS.driftSpeed },
    uFlowScale: { value: DEFAULTS.flowScale },
    uFlowSpeed: { value: DEFAULTS.flowSpeed },
    uFlowAmp: { value: DEFAULTS.flowAmp },
    uPointerInfluence: { value: DEFAULTS.pointerInfluence },
    uPointerRadius: { value: DEFAULTS.pointerRadius },
    uScrollInfluence: { value: DEFAULTS.scrollInfluence },
    uVelocity: { value: 0 },
    uAspect: { value: 1 },
    uPointer: { value: new Vector2(0, 0) },
    uColor: { value: particleColor },
  };
}

// Scratch values reused each frame (no per-frame allocation).
const _target = new Vector2();
const _buf = new Vector2();

export function Particulate({ count }: { count: number }) {
  const matRef = useRef<ShaderMaterial>(null);
  const data = useMemo(() => buildData(count), [count]);

  const uniformsRef = useRef<PointUniforms | null>(null);
  const uniforms = (uniformsRef.current ??= makePointUniforms());

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    const p = particleParams;
    const dt = Math.min(delta, 0.05);
    const store = useDeepStore.getState();

    (mat.uniforms.uTime as IUniform<number>).value += dt;
    (mat.uniforms.uSize as IUniform<number>).value = p.size;
    (mat.uniforms.uOpacity as IUniform<number>).value = p.opacity;
    (mat.uniforms.uDriftSpeed as IUniform<number>).value = p.driftSpeed;
    (mat.uniforms.uFlowScale as IUniform<number>).value = p.flowScale;
    (mat.uniforms.uFlowSpeed as IUniform<number>).value = p.flowSpeed;
    (mat.uniforms.uFlowAmp as IUniform<number>).value = p.flowAmp;
    (mat.uniforms.uPointerInfluence as IUniform<number>).value =
      p.pointerInfluence;
    (mat.uniforms.uPointerRadius as IUniform<number>).value = p.pointerRadius;
    (mat.uniforms.uScrollInfluence as IUniform<number>).value =
      p.scrollInfluence;
    (mat.uniforms.uPixelRatio as IUniform<number>).value =
      state.gl.getPixelRatio();

    const fog = state.scene.fog;
    (mat.uniforms.uFogDensity as IUniform<number>).value =
      (fog instanceof FogExp2 ? fog.density : 0.01) * p.fogFade;

    // Pointer: lag toward the store target for a weighty, trailing swirl.
    _target.set(store.pointer.x, store.pointer.y);
    (mat.uniforms.uPointer.value as Vector2).lerp(_target, 0.06);

    // Scroll velocity: normalize + smooth (decays to 0 when scrolling stops).
    const tv = Math.max(-1, Math.min(1, store.velocity / 50));
    const cv = (mat.uniforms.uVelocity as IUniform<number>).value;
    (mat.uniforms.uVelocity as IUniform<number>).value = cv + (tv - cv) * 0.12;

    state.gl.getDrawingBufferSize(_buf);
    (mat.uniforms.uAspect as IUniform<number>).value =
      _buf.x / Math.max(_buf.y, 1);
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[data.scales, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[data.seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        depthTest
        blending={NormalBlending}
        toneMapped={false}
      />
    </points>
  );
}
