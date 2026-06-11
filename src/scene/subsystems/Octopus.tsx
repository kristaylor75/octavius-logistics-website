"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { type Mesh, ShaderMaterial, Vector2, Vector3, type IUniform } from "three";
import { useDeepStore } from "../store";

/**
 * Octopus (Phase 9) — a faint, dark octopus silhouette glimpsed deep in the
 * gloom behind the home hero. Felt more than seen: low opacity, soft edges,
 * arm tips dissolving into the fog, slow parallax. Never a mascot — no face, no
 * performance; just a slow silhouette and ONE arm-curl as you cross the
 * hero→thesis depth band.
 *
 * Drawn procedurally (a polar mantle + 8 tapering arms) on ONE small plane deep
 * in the scene (renderOrder behind the particulate/glows), so cost is just the
 * plane's pixels. Output is LINEAR (the composer owns the sRGB encode) and dark
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
  uniform float uArmCurl;
  uniform float uRim;
  uniform vec3 uColor;
  uniform vec3 uRimColor;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;          // [-1, 1] over the plane
    vec2 q = p - vec2(0.0, 0.18);        // body sits a little above centre
    float r = length(q);
    float breathe = 1.0 + 0.03 * sin(uTime * 0.5);

    // Mantle — a soft, slightly tall ellipse.
    vec2 bp = q / (vec2(0.34, 0.44) * breathe);
    float body = 1.0 - smoothstep(0.82, 1.04, length(bp));

    // Eight tapering arms fanning below, curling at the tips.
    float ang = atan(q.x, -q.y);         // 0 = straight down
    float tw = uArmCurl * smoothstep(0.30, 1.0, r) + 0.05 * sin(uTime * 0.3);
    float lobe = pow(abs(cos(4.0 * (ang + tw))), 0.8); // 8 lobes
    float down = clamp(-q.y / max(r, 1e-3), -1.0, 1.0); // 1 = pointing down
    float downMask = smoothstep(-0.5, 0.45, down);
    float reach = 0.30 + 0.52 * lobe * downMask;
    float arms = 1.0 - smoothstep(reach - 0.09, reach + 0.05, r);
    arms *= 1.0 - smoothstep(0.55, 1.0, r); // tips dissolve into the fog

    float m = max(body, arms * 0.92);
    m *= 1.0 - smoothstep(0.88, 1.06, r);   // dissolve before the plane edge
    m = clamp(m, 0.0, 1.0);

    float alpha = m * uPresence;
    if (alpha < 0.002) discard;

    // Faint cool rim at the soft edge so the form is just legible.
    float edge = clamp(m * (1.0 - m) * 4.0, 0.0, 1.0);
    vec3 col = mix(uColor, uRimColor, edge * uRim);
    gl_FragColor = vec4(col, alpha);
  }
`;

type OctoUniforms = {
  uTime: IUniform<number>;
  uPresence: IUniform<number>;
  uArmCurl: IUniform<number>;
  uRim: IUniform<number>;
  uColor: IUniform<Vector3>;
  uRimColor: IUniform<Vector3>;
};

function makeUniforms(): OctoUniforms {
  return {
    uTime: { value: 0 },
    uPresence: { value: 0 },
    uArmCurl: { value: 0 },
    uRim: { value: 0.5 },
    // Dark, low-chroma, faintly cool (LINEAR). Rim is a touch lighter.
    uColor: { value: new Vector3(0.01, 0.014, 0.022) },
    uRimColor: { value: new Vector3(0.05, 0.07, 0.1) },
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

    // Home gate: only behind the hero (the constellation publishes hero-* anchors).
    const onHero = store.anchors.some((a) => a.id.startsWith("hero-")) ? 1 : 0;
    home.current += (onHero - home.current) * 0.06;

    // Fade into the fog as the descent deepens.
    const depth = store.depth;
    const depthFade = 1 - Math.min(1, Math.max(0, depth / DEPTH_FADE_END));
    u.uPresence.value = p.presence * home.current * depthFade;

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
