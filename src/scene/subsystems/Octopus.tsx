"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { type Mesh, ShaderMaterial, Vector2, Vector3, type IUniform } from "three";
import { converter } from "culori";
import { useDeepStore } from "../store";

/**
 * Octopus (Phase 9) — a faint, dark octopus silhouette glimpsed deep in the
 * gloom behind the home hero. Felt more than seen: low opacity, soft edges,
 * arm tips dissolving into the fog, slow parallax. Never a mascot — no face, no
 * performance; just a slow silhouette and ONE arm-curl as you cross the
 * hero→thesis depth band.
 *
 * Drawn procedurally as an SDF (a bulbous mantle smooth-unioned with 8 long,
 * tapering, undulating tentacles) on ONE small plane deep in the scene
 * (renderOrder behind the particulate/glows), so cost is just the plane's pixels. Output is LINEAR (the composer owns the sRGB encode) and dark
 * enough to sit below the bloom threshold, so it never blooms. Gated to the home
 * hero via the presence of `hero-*` anchors — absent on product/thesis/contact,
 * with no page-file changes. Reduced-motion/low never mount the canvas.
 */

export type OctopusParams = {
  presence: number; // peak opacity
  parallaxDepth: number; // lateral pointer parallax (world units)
  posX: number;
  posY: number;
  armCurlStrength: number;
};

export const OCTO_DEFAULTS: OctopusParams = {
  presence: 0.16,
  parallaxDepth: 0.35,
  posX: 2.5,
  posY: 1.0,
  armCurlStrength: 0.5,
};

export const octopusParams: OctopusParams = { ...OCTO_DEFAULTS };

// Selectable fill colour (dev colour picker). sRGB hex → LINEAR for the shader
// (the composer owns the sRGB encode), mirroring the caustic-tint pattern. The
// silhouette is filled with this; the edge gets a fainter, brighter outline.
const _toLinear = converter("lrgb");
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const OCTO_FILL_HEX = "#35586a";
export const octoFill = (() => {
  const c = _toLinear(OCTO_FILL_HEX);
  return new Vector3(clamp01(c?.r ?? 0), clamp01(c?.g ?? 0), clamp01(c?.b ?? 0));
})();
export function setOctoFill(hex: string) {
  const c = _toLinear(hex);
  if (c) octoFill.set(clamp01(c.r), clamp01(c.g), clamp01(c.b));
}

// Placement: a large, soft plane deep in the gloom.
const PLANE_SIZE = 12;
const PLANE_Z = -9;
// Arm-curl fires once as scroll depth crosses the hero→thesis band.
const CURL_DEPTH = 0.12;
const CURL_WIDTH = 0.06;
// Fade out into the fog as you descend past the hero.
const DEPTH_FADE_END = 0.45;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uPresence;
  uniform float uEyeAlpha;  // eye gate: home × (slow) depth fade, NOT presence
  uniform float uArmCurl;
  uniform float uRim;
  uniform vec3 uFillColor;

  // smooth-union of two SDFs (organic blending — arms flow out of the mantle)
  float smin(float a, float b, float k){
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // hash for per-arm variation (asymmetry → natural, not mechanical)
  float h11(float n){ return fract(sin(n * 91.37) * 4372.13); }

  // One long, tapering, undulating, curling arm. Returns an SDF (neg inside).
  // The centreline runs from the base along ang, with a travelling-wave lateral
  // offset (amplitude growing to the tip) plus an inward curl; thickness tapers
  // to a point. Distance is approximated against the centreline point at the
  // clamped along-arm coordinate (rounded ends) — plenty for a soft silhouette.
  float armSDF(vec2 p, vec2 base, float ang, float len, float baseThick,
               float phase, float curl, float t){
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 nrm = vec2(-dir.y, dir.x);
    vec2 rel = p - base;
    float x = clamp(dot(rel, dir), 0.0, len);
    float u = x / len;                                   // 0 base .. 1 tip
    float wave = 0.13 * u * sin(x * 4.2 - t * 0.9 + phase); // travels down the arm
    float off = wave + curl * u * u;                    // + tip curl
    vec2 c = base + dir * x + nrm * off;
    float thick = baseThick * pow(1.0 - u, 0.8) + 0.004; // taper to a point
    return length(p - c) - thick;
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;                 // [-1, 1] over the plane
    float t = uTime;

    // Whole-creature drift: a slow sway + bob, so it hovers rather than sits.
    vec2 q = p - vec2(0.03 * sin(t * 0.33), 0.30 + 0.02 * sin(t * 0.5));

    // Mantle — an egg/teardrop head: a bulbous, slightly pointed crown tapering
    // to a narrower neck where the arms attach (not a plain round ellipse).
    float breathe = 1.0 + 0.025 * sin(t * 0.5);
    float ty = clamp((q.y / breathe + 0.30) / 0.60, 0.0, 1.0); // 0 neck .. 1 crown
    float w = mix(0.115, 0.215, smoothstep(0.0, 0.55, ty))
              - 0.03 * smoothstep(0.72, 1.0, ty);             // pinch the crown → egg
    float body = length(vec2(q.x / (w * breathe), q.y / (0.30 * breathe))) - 1.0;

    // Eight arms emanating from the lower mantle, fanned across the underside.
    vec2 base = vec2(0.0, -0.16);
    float arms = 1e3;
    for (int i = 0; i < 8; i++){
      float fi = float(i);
      float k = (fi / 7.0) * 2.0 - 1.0;          // -1 .. 1 across the fan
      float ang = -1.5708 + k * 1.42;            // straight-down ± ~81°
      float len = 0.92 * (0.80 + 0.34 * h11(fi));
      float baseThick = 0.075 * (0.8 + 0.45 * h11(fi + 13.0));
      float phase = fi * 0.9 + 6.28 * h11(fi + 31.0);
      // curl inward (toward the body's down-axis), varied per arm
      float curl = uArmCurl * (-k) * (0.5 + 0.5 * h11(fi + 7.0)) * 0.6;
      vec2 abase = base + vec2(k * 0.11, 0.0);
      arms = min(arms, armSDF(q, abase, ang, len, baseThick, phase, curl, t));
    }

    float d = smin(body, arms, 0.11);

    // Soft silhouette + dissolve before the plane edge.
    float m = smoothstep(0.05, -0.03, d);
    m *= 1.0 - smoothstep(0.86, 1.06, length(p));
    float bodyA = m * uPresence;          // faint body fill

    // Electric-blue eyes on the sides of the lower mantle. Their alpha is gated
    // by uEyeAlpha (home × slow depth fade) but NOT by the faint body presence —
    // so they keep their glow as the body dims, and the colour is bright enough
    // to catch the selective bloom (glowing eyes in the gloom).
    float ed = min(length(q - vec2(-0.115, -0.02)),
                   length(q - vec2( 0.115, -0.02)));
    float eye = smoothstep(0.030 * breathe, 0.010, ed);
    float eyeA = eye * uEyeAlpha;

    float alpha = max(bodyA, eyeA);
    if (alpha < 0.003) discard;

    // Outline: the silhouette edge catches a touch more of the dim light from
    // above — a brighter rim, but fainter than the fill (it rides the lower-
    // alpha edge, and only recolours, never adds opacity).
    float outline = 1.0 - smoothstep(0.0, 0.045, abs(d));
    vec3 col = mix(uFillColor, uFillColor * 1.7 + 0.012, outline * uRim);
    col = mix(col, vec3(0.10, 0.45, 1.5), eye); // electric blue where the eyes are
    gl_FragColor = vec4(col, alpha);
  }
`;

type OctoUniforms = {
  uTime: IUniform<number>;
  uPresence: IUniform<number>;
  uEyeAlpha: IUniform<number>;
  uArmCurl: IUniform<number>;
  uRim: IUniform<number>;
  uFillColor: IUniform<Vector3>;
};

function makeUniforms(): OctoUniforms {
  return {
    uTime: { value: 0 },
    uPresence: { value: 0 },
    uEyeAlpha: { value: 0 },
    uArmCurl: { value: 0 },
    uRim: { value: 0.5 },
    uFillColor: { value: octoFill.clone() },
  };
}

// Module scratch (no per-frame allocation).
const _pointer = new Vector2();

export function Octopus() {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const uniformsRef = useRef<OctoUniforms | null>(null);
  const uniforms = (uniformsRef.current ??= makeUniforms());
  const home = useRef(0); // smoothed home-hero gate

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    const u = mat.uniforms as unknown as OctoUniforms;
    const store = useDeepStore.getState();
    const dt = Math.min(delta, 0.05);
    const p = octopusParams;

    u.uTime.value += dt;
    u.uFillColor.value.copy(octoFill);

    // Home gate: only behind the hero (the constellation publishes hero-* anchors).
    const onHero = store.anchors.some((a) => a.id.startsWith("hero-")) ? 1 : 0;
    home.current += (onHero - home.current) * 0.06;

    // Fade into the fog as the descent deepens.
    const depth = store.depth;
    const depthFade = 1 - Math.min(1, Math.max(0, depth / DEPTH_FADE_END));
    u.uPresence.value = p.presence * home.current * depthFade;
    // Eyes hold their glow as the body dims — gated by home + a slower fade (so
    // they linger a beat into the fog), never by the faint body presence.
    const eyeFade = 1 - Math.min(1, Math.max(0, depth / 0.6));
    u.uEyeAlpha.value = home.current * eyeFade;

    // Arm-curl: a one-shot bell as scroll depth crosses the hero→thesis band.
    const bell = Math.exp(-(((depth - CURL_DEPTH) / CURL_WIDTH) ** 2));
    u.uArmCurl.value = p.armCurlStrength * bell;

    // Gentle parallax: lag toward the pointer, and sink with the descent.
    _pointer.set(store.pointer.x, store.pointer.y);
    const sm = mesh.position;
    const targetX = p.posX + _pointer.x * p.parallaxDepth;
    const targetY = p.posY + _pointer.y * p.parallaxDepth - depth * 2.5;
    sm.x += (targetX - sm.x) * 0.04;
    sm.y += (targetY - sm.y) * 0.04;
    sm.z = PLANE_Z;
  });

  return (
    <mesh
      ref={meshRef}
      position={[OCTO_DEFAULTS.posX, OCTO_DEFAULTS.posY, PLANE_Z]}
      renderOrder={-0.5}
      frustumCulled={false}
    >
      <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
