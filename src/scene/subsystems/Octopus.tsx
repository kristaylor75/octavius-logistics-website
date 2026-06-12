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
  contourSpacing: number; // SDF spacing between bathymetric isolines
  lineWidth: number; // contour line weight (in screen-derivative units → ~px)
  fillAmount: number; // faint fill under the lines (0 = pure contour)
};

export const OCTO_DEFAULTS: OctopusParams = {
  presence: 0.15,
  parallaxDepth: 0.35,
  posX: 6.9,
  posY: 1.8,
  armCurlStrength: 0,
  contourSpacing: 0.6,
  lineWidth: 0.8,
  fillAmount: 0.1,
};

export const octopusParams: OctopusParams = { ...OCTO_DEFAULTS };

// Selectable fill colour (dev colour picker). sRGB hex → LINEAR for the shader
// (the composer owns the sRGB encode), mirroring the caustic-tint pattern. The
// silhouette is filled with this; the edge gets a fainter, brighter outline.
const _toLinear = converter("lrgb");
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const OCTO_FILL_HEX = "#893b1a";
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
  uniform float uContourSpacing;
  uniform float uLineWidth;
  uniform float uFillAmount;
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

  // Rotated almond/lens distance (<1 inside) for an eye — wider than tall, with
  // an inward tilt so the pair reads fierce but still faces straight ahead.
  float eyeDist(vec2 e, float tilt, vec2 rad){
    float c = cos(tilt), s = sin(tilt);
    vec2 r = vec2(c * e.x - s * e.y, s * e.x + c * e.y);
    return length(r / rad);
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
              - 0.03 * smoothstep(0.72, 1.0, ty)              // pinch the crown → egg
              + 0.022 * exp(-pow((q.y + 0.02) / 0.075, 2.0)); // brow ridge at eye level
    float body = length(vec2(q.x / (w * breathe), q.y / (0.30 * breathe))) - 1.0;
    // Mantle fold: a soft notch splits the crown into two lobes (octopus head).
    body += 0.05 * smoothstep(0.16, 0.31, q.y) * smoothstep(0.07, 0.0, abs(q.x));

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

    // Interior mask (for the faint fill + brow), dissolving before the plane edge.
    float m = smoothstep(0.05, -0.03, d);
    m *= 1.0 - smoothstep(0.86, 1.06, length(p));

    // Fierce almond eyes (NOT round): wider than tall, tilted INWARD-down and
    // mirrored, so the pair glares forward. A bright electric-blue core glows;
    // a brow shadow above broods. Gated by uEyeAlpha (home × slow depth fade),
    // never by the faint body presence — they hold their glow and catch the
    // selective bloom. Inspired by the reference's slit-eyed, sculpted head.
    float dR = eyeDist(q - vec2( 0.118, -0.01), -0.40, vec2(0.060, 0.024) * breathe);
    float dL = eyeDist(q - vec2(-0.118, -0.01),  0.40, vec2(0.060, 0.024) * breathe);
    float ealmond = min(dR, dL);
    float eye = smoothstep(1.04, 0.5, ealmond);   // almond glow
    float pupil = smoothstep(0.5, 0.04, ealmond);  // intense pupil core
    // Brow shadow just above each eye — a brooding ridge.
    float brow = smoothstep(1.25, 0.45, min(
      length((q - vec2( 0.118, 0.055)) / vec2(0.085, 0.020)),
      length((q - vec2(-0.118, 0.055)) / vec2(0.085, 0.020))));

    // Contour-line rendering — crisp bathymetric isolines of the body's distance
    // field, like a depth chart of the creature. fwidth() makes each line ~1px in
    // SCREEN space (resolution-independent, genuinely sharp — never the soft blur
    // of an alpha-faded blob), matching the site's hairline + contour idiom: the
    // octopus reads as something *measured and plotted*, not a lurking ghost.
    // Contour basis: the DEPTH below the silhouette, log-remapped so isolines are
    // spaced evenly across BOTH the deep mantle and the thin tapering arms. (Raw
    // SDF depth crowds every interior line into the thick head and leaves the arms
    // with only their outline; the log lifts the shallow arm interior to match, so
    // the inner-line treatment continues out along every tentacle.)
    float depthIn = max(-d, 0.0);
    float field = log(1.0 + depthIn * 40.0);
    float cd = field / max(uContourSpacing, 1e-4);
    float contour = 1.0 - smoothstep(
      0.0, uLineWidth, abs(fract(cd - 0.5) - 0.5) / max(fwidth(cd), 1e-5));
    contour *= 1.0 - smoothstep(0.0, 0.02, d);          // interior lines only within the silhouette
    contour *= 1.0 - smoothstep(0.86, 1.06, length(p)); // dissolve before the plane edge
    // The d≈0 isoline IS the silhouette — a crisp outline everywhere (head + arms).
    float outline = 1.0 - smoothstep(0.0, max(fwidth(d), 1e-5) * 1.6, abs(d));
    contour = max(contour, outline);

    float fillA = m * uFillAmount;                  // optional faint wash under the lines
    float bodyA = max(contour, fillA) * uPresence;

    float eyeA = eye * uEyeAlpha;
    float alpha = max(bodyA, eyeA);
    if (alpha < 0.003) discard;

    // Lines read a touch brighter than the faint wash; the brow broods in the fill.
    vec3 col = mix(uFillColor * 0.6, uFillColor * 1.55 + 0.01, contour);
    col = mix(col, col * 0.4, brow * 0.5 * fillA);
    // Electric blue, far brighter at the pupil so it blooms into a glowing eye.
    vec3 eyeCol = vec3(0.10, 0.45, 1.5) * (0.65 + 0.8 * pupil);
    col = mix(col, eyeCol, eye);
    gl_FragColor = vec4(col, alpha);
  }
`;

type OctoUniforms = {
  uTime: IUniform<number>;
  uPresence: IUniform<number>;
  uEyeAlpha: IUniform<number>;
  uArmCurl: IUniform<number>;
  uRim: IUniform<number>;
  uContourSpacing: IUniform<number>;
  uLineWidth: IUniform<number>;
  uFillAmount: IUniform<number>;
  uFillColor: IUniform<Vector3>;
};

function makeUniforms(): OctoUniforms {
  return {
    uTime: { value: 0 },
    uPresence: { value: 0 },
    uEyeAlpha: { value: 0 },
    uArmCurl: { value: 0 },
    uRim: { value: 0.5 },
    uContourSpacing: { value: OCTO_DEFAULTS.contourSpacing },
    uLineWidth: { value: OCTO_DEFAULTS.lineWidth },
    uFillAmount: { value: OCTO_DEFAULTS.fillAmount },
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
    u.uContourSpacing.value = p.contourSpacing;
    u.uLineWidth.value = p.lineWidth;
    u.uFillAmount.value = p.fillAmount;

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
