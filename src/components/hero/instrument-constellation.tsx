"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/container";
import { useDeepStore } from "@/scene/store";
import type { HueKey } from "@/scene/palette";

/**
 * Instrument Constellation — the home hero. Client component, lazy-loaded.
 *
 * The five products are nodes on a living technical diagram, connected by
 * route-like hairlines over the coordinate grid. Each node wears a bespoke glyph
 * for what its instrument reads. Routes plot in on load, faint pulses travel
 * them, nodes drift, a cursor crosshair tracks the pointer, and hovering/
 * focusing a node highlights its connections and reveals its one-line read.
 *
 * Built as SVG so the markup is identical whether or not JS runs: the server
 * render (and the reduced-motion path) shows the finished, legible diagram at
 * the nodes' base positions. A single requestAnimationFrame loop mutates the DOM
 * directly (transforms, line endpoints, pulses) — nothing re-renders per frame.
 *
 * NOT a globe, NOT arcing flight paths — a precision instrument panel.
 */
export interface ConstellationNode {
  slug: string;
  name: string;
  reads: string;
  hue: string; // accent token key, e.g. "cortex"
}

const VW = 1200;
const VH = 720;
const TWO_PI = Math.PI * 2;

type Layout = { x: number; y: number; amp: number; freq: number; phase: number };
const LAYOUT: Record<string, Layout> = {
  cortex: { x: 600, y: 250, amp: 13, freq: 0.05, phase: 0.0 },
  reflex: { x: 845, y: 178, amp: 11, freq: 0.045, phase: 1.3 },
  imagine: { x: 1008, y: 338, amp: 12, freq: 0.06, phase: 2.2 },
  odyssey: { x: 668, y: 478, amp: 12, freq: 0.052, phase: 3.5 },
  traderoute: { x: 892, y: 558, amp: 11, freq: 0.048, phase: 4.6 },
};

const EDGES: [string, string][] = [
  ["cortex", "reflex"],
  ["reflex", "imagine"],
  ["imagine", "traderoute"],
  ["traderoute", "odyssey"],
  ["odyssey", "cortex"],
  ["reflex", "odyssey"],
];

// Cortex axon centreline — the impulse travels this. MUST stay identical to the
// `offset-path` in globals.css (.glyph.is-hot .neuron-spark) or the spark drifts
// off the wire.
const NEURON_AXON = "M -3 -2.6 C 2 0.5, 5.5 3.5, 10.6 9";

/** Per-product glyph — drawn around (0,0), within ~r14, in the node's hue.
 *  Stroked by the wrapping <g>; filled parts set fill explicitly. Sub-elements
 *  carry class names the globals.css hover animations key off (.is-hot). */
function glyphFor(slug: string, hue: string, hueKey: string): ReactNode {
  const vivid = `var(--${hueKey}-vivid)`;
  switch (slug) {
    case "cortex": // a neuron — a signal resolves along one path and fires
      return (
        <>
          {/* dendrites */}
          <path
            d="M -5.6 -5 L -11.6 -8.2 M -8.8 -6.5 L -10.7 -10.9 M -6.6 -3.2 L -12.7 -2.4 M -5 -6.6 L -6.2 -11.6"
            fill="none"
          />
          {/* axon + terminal branches */}
          <path d={NEURON_AXON} fill="none" />
          <path
            d="M 10.6 9 L 13.6 7.2 M 10.6 9 L 12.4 12 M 10.6 9 L 8.2 12.4"
            fill="none"
          />
          {/* synaptic boutons (fire when the impulse arrives) */}
          <circle className="neuron-terminal" cx={13.6} cy={7.2} r={1.5} fill={hue} stroke="none" />
          <circle className="neuron-terminal" cx={12.4} cy={12} r={1.5} fill={hue} stroke="none" />
          <circle className="neuron-terminal" cx={8.2} cy={12.4} r={1.5} fill={hue} stroke="none" />
          {/* soma (cell body) */}
          <circle className="neuron-soma" cx={-4.4} cy={-4} r={3} fill={hue} stroke="none" />
          {/* travelling impulse */}
          <circle className="neuron-spark" r={2.1} fill={vivid} stroke="none" />
        </>
      );
    case "reflex": // an encoded judgment firing — a reflex spike
      return (
        <>
          <polyline
            className="reflex-trace"
            points="-13,4 -4,4 -1.5,4 0,-9 1.8,8 3.4,4 13,4"
            fill="none"
            pathLength={1}
          />
          <circle className="reflex-flash" cx={0} cy={-9} r={2.3} fill={vivid} stroke="none" />
        </>
      );
    case "imagine": // a light bulb — the hidden cost lit up
      return (
        <>
          {/* glow (off until lit) */}
          <circle className="bulb-glow bulb-glow-outer" cx={0} cy={-3.5} r={8.5} fill={hue} stroke="none" />
          <circle className="bulb-glow bulb-glow-inner" cx={0} cy={-3.5} r={4.5} fill={vivid} stroke="none" />
          {/* glass envelope */}
          <circle cx={0} cy={-3.5} r={7.5} fill="none" />
          {/* screw base */}
          <path d="M -3.4 4 L 3.4 4 M -3 6 L 3 6 M -2.3 8 L 2.3 8 M -3.4 4 L -2.3 8 M 3.4 4 L 2.3 8" fill="none" />
          {/* filament + support wires */}
          <path className="bulb-filament" d="M -1.6 4 L -3.4 -1 L -1.2 -4 L 1.2 -1 L 3.4 -4.5 L 1.6 4" fill="none" />
          {/* light rays (burst out when lit) */}
          <g className="bulb-rays" fill="none">
            <line x1={0} y1={-13.5} x2={0} y2={-16.5} />
            <line x1={8.8} y1={-9} x2={11} y2={-11.2} />
            <line x1={-8.8} y1={-9} x2={-11} y2={-11.2} />
            <line x1={11} y1={-1.5} x2={14} y2={-1.5} />
            <line x1={-11} y1={-1.5} x2={-14} y2={-1.5} />
          </g>
        </>
      );
    case "odyssey": // a ship under sail on the sea — fulfilment underway
      return (
        <>
          <defs>
            <clipPath id="odyssey-sea">
              <circle cx={0} cy={0} r={14} />
            </clipPath>
          </defs>
          {/* drifting sea, clipped to the icon disc */}
          <g clipPath="url(#odyssey-sea)" fill="none">
            <path className="sea-wave sea-wave-1" d="M -24 6 q 3 -2.4 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0" />
            <path className="sea-wave sea-wave-2" d="M -24 9 q 3 -2 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0 t 6 0" />
          </g>
          {/* ship (bobs on the swell) */}
          <g className="ship">
            <path d="M -6.6 1 L 6.6 1 Q 0 7 -6.6 1 Z" fill="none" />
            <line x1={0} y1={1} x2={0} y2={-11} />
            <path className="ship-sail" d="M 0.9 -10 L 0.9 -1.4 L 6.6 -1.4 Q 3.6 -5.6 0.9 -10 Z" fill="none" />
            <path d="M 0 -11 L 3 -10 L 0 -9" fill="none" />
          </g>
          {/* plotted position */}
          <circle cx={0} cy={1} r={1.4} fill={hue} stroke="none" />
        </>
      );
    case "traderoute": // a compass — inventory finding its bearing
      return (
        <>
          {/* bezel */}
          <circle cx={0} cy={0} r={13} fill="none" />
          {/* cardinal + minor ticks */}
          <g fill="none">
            <line x1={0} y1={-13} x2={0} y2={-8.5} />
            <line x1={13} y1={0} x2={9.8} y2={0} />
            <line x1={0} y1={13} x2={0} y2={9.8} />
            <line x1={-13} y1={0} x2={-9.8} y2={0} />
            <line x1={9.2} y1={-9.2} x2={7.6} y2={-7.6} />
            <line x1={9.2} y1={9.2} x2={7.6} y2={7.6} />
            <line x1={-9.2} y1={9.2} x2={-7.6} y2={7.6} />
            <line x1={-9.2} y1={-9.2} x2={-7.6} y2={-7.6} />
          </g>
          {/* magnetic needle (spins up + settles to north on hover) */}
          <g className="compass-needle">
            <path d="M 0 -9 L 2.3 0 L -2.3 0 Z" fill={hue} stroke="none" />
            <path d="M 0 9 L 2.3 0 L -2.3 0 Z" fill="var(--bg)" stroke={hue} strokeWidth={1} />
          </g>
          {/* pivot */}
          <circle className="compass-pivot" cx={0} cy={0} r={1.7} fill={vivid} stroke="none" />
        </>
      );
    default:
      return <circle r={3} fill={hue} stroke="none" />;
  }
}

export default function InstrumentConstellation({
  nodes,
  headline,
  sub,
}: {
  nodes: ConstellationNode[];
  headline: string;
  sub: string;
}) {
  const router = useRouter();
  const bySlug = Object.fromEntries(nodes.map((n) => [n.slug, n]));
  const hueOf = (slug: string) => `var(--${bySlug[slug]?.hue})`;

  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const setHover = (s: string | null) => {
    hoveredRef.current = s;
    setHovered(s);
  };

  const [reduced, setReduced] = useState(false);

  // refs the rAF loop / pointer handler mutate directly
  const sectionRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeRefs = useRef<Record<string, SVGGElement | null>>({});
  const edgeRefs = useRef<Array<SVGLineElement | null>>([]);
  const pulseRefs = useRef<Array<SVGCircleElement | null>>([]);
  const readoutHtmlRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<SVGGElement>(null);
  const vLineRef = useRef<SVGLineElement>(null);
  const hLineRef = useRef<SVGLineElement>(null);
  const cursorRef = useRef<SVGCircleElement>(null);
  const coordWrapRef = useRef<SVGGElement>(null);
  const coordTextRef = useRef<SVGTextElement>(null);

  // reduced-motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // deep-link / screenshot aid: ?focus=<slug> pre-highlights an instrument
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("focus");
    if (f && bySlug[f]) {
      const id = requestAnimationFrame(() => setHover(f));
      return () => cancelAnimationFrame(id);
    }
    // bySlug derives from the stable nodes prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Position the HTML readout card at the hovered node's live *screen* position,
  // clamped to stay on-screen and flipped above the node if it would overflow.
  // It lives above the headline/scrim, so it can never be occluded.
  const positionReadout = useCallback(
    (slug: string | null, live?: Record<string, { x: number; y: number }>) => {
      const el = readoutHtmlRef.current;
      const svg = svgRef.current;
      const section = sectionRef.current;
      if (!slug || !el || !svg || !section) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const p = live?.[slug] ?? LAYOUT[slug];
      const pt = svg.createSVGPoint();
      pt.x = p.x;
      pt.y = p.y;
      const sp = pt.matrixTransform(ctm);
      const rect = section.getBoundingClientRect();
      const W = 244;
      const H = el.offsetHeight || 64;
      const GAP = 30;
      let left = sp.x - rect.left - W / 2;
      let top = sp.y - rect.top + GAP;
      left = Math.min(Math.max(left, 12), rect.width - W - 12);
      if (top + H > rect.height - 12) top = sp.y - rect.top - GAP - H;
      top = Math.max(top, 12);
      el.style.transform = `translate(${left}px, ${top}px)`;
    },
    [],
  );

  // drift + pulses
  useEffect(() => {
    if (reduced) {
      // static: set pulses to edge midpoints, position any active readout
      EDGES.forEach(([a, b], i) => {
        const pa = LAYOUT[a];
        const pb = LAYOUT[b];
        const c = pulseRefs.current[i];
        if (c) {
          c.setAttribute("cx", String((pa.x + pb.x) / 2));
          c.setAttribute("cy", String((pa.y + pb.y) / 2));
        }
      });
      positionReadout(hoveredRef.current);
      return;
    }

    let start = 0;
    let raf = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = (now - start) / 1000;
      const live: Record<string, { x: number; y: number }> = {};
      for (const n of nodes) {
        const L = LAYOUT[n.slug];
        const x = L.x + Math.sin(TWO_PI * L.freq * t + L.phase) * L.amp;
        const y = L.y + Math.cos(TWO_PI * L.freq * 1.13 * t + L.phase) * L.amp * 0.7;
        live[n.slug] = { x, y };
        const g = nodeRefs.current[n.slug];
        if (g) {
          const s = hoveredRef.current === n.slug ? 1.15 : 1;
          g.setAttribute(
            "transform",
            `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s})`,
          );
        }
      }
      EDGES.forEach(([a, b], i) => {
        const pa = live[a];
        const pb = live[b];
        const ln = edgeRefs.current[i];
        if (pa && pb && ln) {
          ln.setAttribute("x1", pa.x.toFixed(2));
          ln.setAttribute("y1", pa.y.toFixed(2));
          ln.setAttribute("x2", pb.x.toFixed(2));
          ln.setAttribute("y2", pb.y.toFixed(2));
        }
        const c = pulseRefs.current[i];
        if (pa && pb && c) {
          const speed = 0.085 + (i % 3) * 0.035;
          const frac = (t * speed + i * 0.17) % 1;
          c.setAttribute("cx", (pa.x + (pb.x - pa.x) * frac).toFixed(2));
          c.setAttribute("cy", (pa.y + (pb.y - pa.y) * frac).toFixed(2));
        }
      });
      // Publish live node screen-positions (client px) for the WebGL
      // Bioluminescence layer (Phase 7). Uses the same getScreenCTM transform as
      // the readout; updates every frame so glows track drift/scroll/resize.
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (svg && ctm) {
        const pt = svg.createSVGPoint();
        useDeepStore.getState().setAnchors(
          "hero",
          nodes.map((n) => {
            const p = live[n.slug];
            pt.x = p.x;
            pt.y = p.y;
            const sp = pt.matrixTransform(ctm);
            return {
              id: `hero-${n.slug}`,
              x: sp.x,
              y: sp.y,
              hue: n.hue as HueKey,
              strength: 1,
            };
          }),
        );
      }
      positionReadout(hoveredRef.current, live);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      useDeepStore.getState().setAnchors("hero", []);
    };
  }, [reduced, nodes, positionReadout]);

  // position the readout on hover (covers the reduced-motion / no-loop case)
  useEffect(() => {
    if (!hovered) return;
    const id = requestAnimationFrame(() => positionReadout(hovered));
    return () => cancelAnimationFrame(id);
  }, [hovered, positionReadout]);

  // cursor crosshair
  const onPointerMove = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const u = pt.matrixTransform(ctm.inverse());
    vLineRef.current?.setAttribute("x1", String(u.x));
    vLineRef.current?.setAttribute("x2", String(u.x));
    hLineRef.current?.setAttribute("y1", String(u.y));
    hLineRef.current?.setAttribute("y2", String(u.y));
    cursorRef.current?.setAttribute("cx", String(u.x));
    cursorRef.current?.setAttribute("cy", String(u.y));
    const tx = Math.min(Math.max(u.x + 14, 8), VW - 168);
    const ty = Math.min(Math.max(u.y - 14, 26), VH - 12);
    coordWrapRef.current?.setAttribute("transform", `translate(${tx} ${ty})`);
    if (coordTextRef.current) {
      coordTextRef.current.textContent = `X ${(u.x / VW).toFixed(3)}  Y ${(u.y / VH).toFixed(3)}`;
    }
  };
  const showCross = (v: boolean) =>
    crossRef.current?.setAttribute("opacity", v ? "1" : "0");

  const goto = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    router.push(`/${slug}`);
  };

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{
        borderBottom: "var(--rule-width) solid var(--rule)",
        minHeight: "clamp(560px, 84vh, 820px)",
      }}
    >
      {/* the diagram */}
      <div
        className="absolute inset-0"
        onPointerMove={onPointerMove}
        onPointerEnter={() => showCross(true)}
        onPointerLeave={() => showCross(false)}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full"
          aria-label="The Octavius instrument constellation: five products as connected nodes. Each links to its page."
        >
          {/* corner registration marks + coordinate annotations */}
          <g stroke="var(--ink-ghost)" strokeWidth={0.75} opacity={0.7}>
            <line x1={24} y1={24} x2={44} y2={24} />
            <line x1={24} y1={24} x2={24} y2={44} />
            <line x1={VW - 24} y1={VH - 24} x2={VW - 44} y2={VH - 24} />
            <line x1={VW - 24} y1={VH - 24} x2={VW - 24} y2={VH - 44} />
          </g>
          <text x={24} y={VH - 22} fontSize={11} letterSpacing="1.2" fill="var(--ink-faint)" style={{ fontFamily: "var(--font-mono)" }}>
            FIG. 00 / PORTFOLIO
          </text>
          <text x={VW - 24} y={34} fontSize={11} letterSpacing="1.2" textAnchor="end" fill="var(--ink-faint)" style={{ fontFamily: "var(--font-mono)" }}>
            N 5 · INSTRUMENTS
          </text>

          {/* cursor crosshair (hidden until pointer enters) */}
          <g ref={crossRef} opacity={0} pointerEvents="none">
            <line ref={vLineRef} x1={VW / 2} y1={0} x2={VW / 2} y2={VH} stroke="var(--rule-strong)" strokeWidth={0.5} />
            <line ref={hLineRef} x1={0} y1={VH / 2} x2={VW} y2={VH / 2} stroke="var(--rule-strong)" strokeWidth={0.5} />
            <circle ref={cursorRef} cx={VW / 2} cy={VH / 2} r={2.5} fill="var(--ink-faint)" />
            <g ref={coordWrapRef} transform={`translate(${VW / 2 + 14} ${VH / 2 - 14})`}>
              <text ref={coordTextRef} fontSize={11} letterSpacing="0.8" fill="var(--ink-faint)" style={{ fontFamily: "var(--font-mono)" }}>
                X 0.500  Y 0.500
              </text>
            </g>
          </g>

          {/* route-like connections */}
          {EDGES.map(([a, b], i) => {
            const active = hovered != null && (a === hovered || b === hovered);
            return (
              <line
                key={`${a}-${b}`}
                ref={(el) => {
                  edgeRefs.current[i] = el;
                }}
                className="hero-edge"
                pathLength={1}
                style={{ animationDelay: `${0.1 + i * 0.07}s` }}
                x1={LAYOUT[a].x}
                y1={LAYOUT[a].y}
                x2={LAYOUT[b].x}
                y2={LAYOUT[b].y}
                stroke={active ? hueOf(hovered as string) : "var(--rule)"}
                strokeWidth={1}
                strokeOpacity={hovered ? (active ? 0.85 : 0.16) : 0.42}
                pointerEvents="none"
              />
            );
          })}

          {/* data pulses traveling the routes */}
          {EDGES.map(([a, b], i) => {
            const active = hovered != null && (a === hovered || b === hovered);
            return (
              <circle
                key={`pulse-${a}-${b}`}
                ref={(el) => {
                  pulseRefs.current[i] = el;
                }}
                cx={(LAYOUT[a].x + LAYOUT[b].x) / 2}
                cy={(LAYOUT[a].y + LAYOUT[b].y) / 2}
                r={active ? 2.2 : 1.6}
                fill={active ? hueOf(hovered as string) : "var(--ink-faint)"}
                opacity={hovered ? (active ? 0.95 : 0.25) : 0.5}
                pointerEvents="none"
              />
            );
          })}

          {/* nodes */}
          {nodes.map((n, i) => {
            const L = LAYOUT[n.slug];
            const isHot = hovered === n.slug;
            const dim = hovered != null && !isHot;
            return (
              <a
                key={n.slug}
                href={`/${n.slug}`}
                onClick={(e) => goto(e, n.slug)}
                onMouseEnter={() => setHover(n.slug)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(n.slug)}
                onBlur={() => setHover(null)}
                aria-label={`${n.name} — ${n.reads}`}
                className="hero-node"
                style={{ cursor: "pointer", animationDelay: `${0.35 + i * 0.09}s` }}
              >
                <g
                  ref={(el) => {
                    nodeRefs.current[n.slug] = el;
                  }}
                  transform={`translate(${L.x} ${L.y})`}
                  opacity={dim ? 0.45 : 1}
                  style={{ transition: "opacity 220ms var(--ease-instrument)" }}
                >
                  {/* hit area + backing disc (clips the routes cleanly) */}
                  <circle r={34} fill="transparent" />
                  <circle r={15} fill="var(--bg)" />
                  {/* hover ping + dial */}
                  {isHot && (
                    <circle className="hero-ping" r={16} fill="none" stroke={hueOf(n.slug)} strokeWidth={1} />
                  )}
                  {isHot && (
                    <circle r={20} fill="none" stroke={hueOf(n.slug)} strokeWidth={0.75} strokeOpacity={0.4} />
                  )}
                  {/* bespoke instrument glyph */}
                  <g
                    className={isHot ? "glyph is-hot" : "glyph"}
                    stroke={hueOf(n.slug)}
                    strokeWidth={1.3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isHot ? 1 : 0.82}
                  >
                    {glyphFor(n.slug, hueOf(n.slug), n.hue)}
                  </g>
                  {/* label */}
                  <text
                    x={28}
                    y={5}
                    fontSize={15}
                    letterSpacing="1.4"
                    fill={isHot ? "var(--ink)" : "var(--ink-faint)"}
                    style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase" }}
                  >
                    {n.name}
                  </text>
                </g>
              </a>
            );
          })}

        </svg>
      </div>

      {/* depth — deepen the panel toward the edges (no glow) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(115% 95% at 72% 42%, transparent 46%, oklch(13% 0.015 255 / 0.55) 100%)",
        }}
      />

      {/* left-edge scrim so the headline reads over the diagram */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, var(--bg) 0%, color-mix(in oklab, var(--bg) 70%, transparent) 34%, transparent 56%)",
        }}
      />

      {/* headline overlay */}
      <Container className="pointer-events-none relative flex min-h-[inherit] items-center">
        <div className="max-w-[34rem] py-24">
          <p className="mono-label mb-6" style={{ color: "var(--cortex)" }}>
            Instruments for the Invisible
          </p>
          <h1
            className="font-semibold text-balance"
            style={{
              fontSize: "clamp(1.9rem, 4vw, 3rem)",
              lineHeight: 1.08,
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            {headline}
          </h1>
          <p
            className="mt-6 max-w-[40ch] text-ink-muted"
            style={{ fontSize: "var(--text-xl)", lineHeight: 1.5 }}
          >
            {sub}
          </p>
          <div className="pointer-events-auto mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/thesis"
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-5 py-3 font-medium text-bg"
              style={{ backgroundColor: "var(--cortex)" }}
            >
              Read the thesis
              <span className="font-mono text-[0.6875rem]">→</span>
            </Link>
            <span className="mono-label text-ink-faint">Hover an instrument ↗</span>
          </div>
        </div>
      </Container>

      {/* hover readout — HTML overlay above the headline/scrim, positioned by the
          loop at the node's live screen coords (so it's never occluded/clipped) */}
      <div
        ref={readoutHtmlRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-20"
        style={{ width: 244, transform: "translate(-9999px, -9999px)" }}
      >
        {hovered && bySlug[hovered] && (
          <div
            className="rounded-[3px]"
            style={{
              backgroundColor: "var(--surface-1)",
              boxShadow: `inset 0 0 0 var(--rule-width) color-mix(in oklab, ${hueOf(hovered)} 55%, transparent)`,
              padding: "12px 14px",
            }}
          >
            <div
              className="font-mono text-[0.6875rem] uppercase tracking-[0.1em]"
              style={{ color: hueOf(hovered) }}
            >
              {bySlug[hovered].name}
            </div>
            <div className="mt-1 font-mono text-[0.75rem] text-ink-muted">
              {bySlug[hovered].reads}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
