"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/* ============================================================
   Canned, deterministic demand field. No backend.
   A region with three demand centers whose intensity changes
   over a 12-step horizon. Demand is rendered as contour lines;
   three fulfillment nodes sample the field, and one tips from
   nominal into strain — forecast a couple of steps before.
   ============================================================ */
const VW = 1000;
const VH = 600;
const T_END = 12;
const LEAD = 2; // forecast lead, in steps
const WATCH = 0.55;
const STRAIN = 0.8;
const STRAIN_T = 8; // where the reduced-motion / auto-sweep settles

type Center = { x: number; y: number; sigma: number; amps: number[] };
const CENTERS: Center[] = [
  // established western market — steady
  { x: 280, y: 330, sigma: 150, amps: [0.45, 0.45, 0.46, 0.45, 0.46, 0.46, 0.45, 0.45, 0.46, 0.46, 0.45, 0.45, 0.45] },
  // eastern surge — rises and peaks mid-horizon
  { x: 720, y: 250, sigma: 160, amps: [0.25, 0.3, 0.38, 0.46, 0.55, 0.66, 0.78, 0.9, 1.0, 1.05, 1.02, 0.98, 0.95] },
  // southern bump — slow build
  { x: 520, y: 470, sigma: 130, amps: [0.2, 0.2, 0.22, 0.24, 0.26, 0.3, 0.34, 0.38, 0.42, 0.46, 0.48, 0.5, 0.5] },
];

type Node = { id: string; name: string; x: number; y: number };
const NODES: Node[] = [
  { id: "west", name: "DC-West", x: 300, y: 300 },
  { id: "east", name: "DC-East", x: 700, y: 290 },
  { id: "south", name: "DC-South", x: 520, y: 450 },
];

const CONTOUR_LEVELS = [0.25, 0.4, 0.55, 0.7, 0.85];

const ampAt = (amps: number[], t: number) => {
  const i = Math.floor(t);
  if (i >= amps.length - 1) return amps[amps.length - 1];
  const f = t - i;
  return amps[i] * (1 - f) + amps[i + 1] * f;
};

const fieldAt = (x: number, y: number, t: number) =>
  CENTERS.reduce((sum, c) => {
    const a = ampAt(c.amps, t);
    const d2 = (x - c.x) ** 2 + (y - c.y) ** 2;
    return sum + a * Math.exp(-d2 / (2 * c.sigma * c.sigma));
  }, 0);

const stateOf = (u: number) =>
  u >= STRAIN ? "strain" : u >= WATCH ? "watch" : "nominal";

export default function OdysseyDemandDemo() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });

  // Reduced motion settles straight to the strain moment on first paint (no
  // sweep) — read synchronously so there's no flash and no scroll dependency.
  const [t, setT] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? STRAIN_T
      : 0,
  );
  const [activeId, setActiveId] = useState<string>("east");
  const controls = useRef<ReturnType<typeof animate> | null>(null);

  // Auto-sweep once when scrolled into view (assembly); skipped under reduced motion.
  useEffect(() => {
    if (reduced || !inView) return;
    controls.current = animate(0, STRAIN_T, {
      duration: 2.6,
      ease: [0.2, 0, 0, 1],
      onUpdate: (v) => setT(v),
    });
    return () => controls.current?.stop();
  }, [inView, reduced]);

  // derive state at time t
  const nodes = NODES.map((n) => {
    const util = fieldAt(n.x, n.y, t);
    const forecast = fieldAt(n.x, n.y, Math.min(T_END, t + LEAD));
    return { ...n, util, forecast, state: stateOf(util) };
  });
  const active = nodes.find((n) => n.id === activeId) ?? nodes[0];

  const anyStrain = nodes.some((n) => n.state === "strain");
  const anyWatch = nodes.some((n) => n.state === "watch");
  const networkState = anyStrain ? "Strain" : anyWatch ? "Watch" : "Nominal";

  // alert: current strain, else earliest forecast breach
  const strained = nodes.find((n) => n.state === "strain");
  const forecastBreach = nodes.find(
    (n) => n.state !== "strain" && n.forecast >= STRAIN,
  );
  const alert = strained
    ? { node: strained.name, text: `in strain at T+${Math.round(t)}` }
    : forecastBreach
      ? { node: forecastBreach.name, text: `forecast to breach at T+${Math.round(t) + LEAD}` }
      : null;

  const onScrub = (value: number) => {
    controls.current?.stop();
    setT(value);
  };

  const accent = "var(--accent)";

  return (
    <div
      ref={ref}
      className="grid gap-px overflow-hidden rounded-[var(--radius-md)] lg:grid-cols-[1.55fr_1fr]"
      style={{ backgroundColor: "var(--rule)" }}
    >
      {/* ---- Map ---- */}
      <div className="p-6 sm:p-8" style={{ backgroundColor: "var(--surface-1)" }}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <div className="font-mono text-sm uppercase tracking-[0.1em] text-ink">
              Demand surface
            </div>
            <div className="mono-label mt-1">Fulfillment network · 12-step horizon</div>
          </div>
          <div className="mono-label text-right text-ink-ghost">
            T + {Math.round(t)} · {networkState}
          </div>
        </div>

        <div
          className="datum-grid relative w-full overflow-hidden rounded-[var(--radius-sm)]"
          style={{ aspectRatio: `${VW} / ${VH}`, boxShadow: "inset 0 0 0 var(--rule-width) var(--rule)" }}
        >
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={`Demand contour map at step T+${Math.round(t)}. Network state: ${networkState}.${
              alert ? ` ${alert.node} ${alert.text}.` : ""
            }`}
          >
            {/* corner coordinate annotations */}
            <text x="12" y="22" className="font-mono" fontSize="11" fill="var(--ink-ghost)">
              N 41.0°
            </text>
            <text x={VW - 12} y="22" textAnchor="end" className="font-mono" fontSize="11" fill="var(--ink-ghost)">
              W 087.0°
            </text>

            {/* contours */}
            {CENTERS.map((c, ci) => {
              const a = ampAt(c.amps, t);
              return (
                <g key={ci}>
                  {CONTOUR_LEVELS.map((lvl, li) => {
                    if (a <= lvl) return null;
                    const r = c.sigma * Math.sqrt(2 * Math.log(a / lvl));
                    return (
                      <circle
                        key={li}
                        cx={c.x}
                        cy={c.y}
                        r={r}
                        fill="none"
                        stroke={accent}
                        strokeWidth={1}
                        opacity={0.12 + li * 0.06}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* nodes */}
            {nodes.map((n) => {
              const isActive = n.id === activeId;
              const tone =
                n.state === "strain"
                  ? "var(--accent-vivid)"
                  : n.state === "watch"
                    ? accent
                    : "var(--ink-muted)";
              return (
                <g
                  key={n.id}
                  onMouseEnter={() => setActiveId(n.id)}
                  style={{ cursor: "pointer" }}
                >
                  {n.state === "strain" && (
                    <circle cx={n.x} cy={n.y} r={16} fill="none" stroke={tone} strokeWidth={1} opacity={0.6} />
                  )}
                  <line x1={n.x - 7} y1={n.y} x2={n.x + 7} y2={n.y} stroke={tone} strokeWidth={1} />
                  <line x1={n.x} y1={n.y - 7} x2={n.x} y2={n.y + 7} stroke={tone} strokeWidth={1} />
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.state === "strain" ? 4 : 3}
                    fill={n.state === "nominal" ? "var(--bg)" : tone}
                    stroke={tone}
                    strokeWidth={1}
                  />
                  <text
                    x={n.x + 12}
                    y={n.y + 4}
                    className="font-mono"
                    fontSize="12"
                    letterSpacing="0.06em"
                    fill={isActive ? "var(--ink)" : "var(--ink-faint)"}
                  >
                    {n.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* time scrubber */}
        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="mono-label">Time · scrub the horizon</span>
            <span className="mono-label" style={{ color: accent }}>
              T + {Math.round(t)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={T_END}
            step={0.5}
            value={t}
            onChange={(e) => onScrub(parseFloat(e.target.value))}
            aria-label="Demand horizon time"
            className="w-full"
            style={{ accentColor: "var(--accent)" }}
          />
          <div className="mt-1 flex justify-between">
            <span className="mono-label text-ink-ghost">T+0</span>
            <span className="mono-label text-ink-ghost">T+{T_END}</span>
          </div>
        </div>
      </div>

      {/* ---- Readout ---- */}
      <aside className="p-6 sm:p-8" style={{ backgroundColor: "var(--surface-1)" }}>
        <div className="lg:sticky lg:top-20">
          <span className="mono-label">Network state</span>
          <div className="mt-2">
            <span
              className="font-semibold uppercase"
              style={{
                color: networkState === "Nominal" ? "var(--ink)" : accent,
                fontSize: "2.5rem",
                lineHeight: 1,
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              {networkState}
            </span>
          </div>
          <p className="mono-label mt-2 text-ink-ghost">at T+{Math.round(t)} of {T_END}</p>

          {/* node list */}
          <ul className="mt-6" style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
            {nodes.map((n) => {
              const tone =
                n.state === "strain"
                  ? "var(--accent-vivid)"
                  : n.state === "watch"
                    ? accent
                    : "var(--ink-muted)";
              return (
                <li key={n.id} style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveId(n.id)}
                    onFocus={() => setActiveId(n.id)}
                    aria-pressed={n.id === activeId}
                    className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
                  >
                    <span className="text-sm" style={{ color: n.id === activeId ? "var(--ink)" : "var(--ink-muted)" }}>
                      {n.name}
                    </span>
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-sm tabular-nums" style={{ color: tone }}>
                        {Math.round(n.util * 100)}%
                      </span>
                      <span className="mono-label" style={{ color: tone, minWidth: "3.5rem", textAlign: "right" }}>
                        {n.state}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* alert / forecast */}
          <div
            className="mt-8 min-h-[7.5rem]"
            style={{ borderTop: "var(--rule-width) solid var(--rule)", paddingTop: "1.5rem" }}
          >
            {alert ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-sm" style={{ color: accent }}>
                    {strained ? "STRAIN" : "FORECAST"}
                  </span>
                  <h4 className="font-semibold" style={{ fontSize: "var(--text-xl)" }}>
                    {alert.node}
                  </h4>
                </div>
                <p className="mt-3 text-sm text-ink-muted">
                  {alert.node} is {alert.text}. {active.name} reads{" "}
                  {Math.round(active.util * 100)}% of capacity — the contour shift
                  is legible a horizon ahead of the breach.
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-faint">
                Scrub the horizon to watch demand contours shift — and a node tip
                from nominal into strain before it happens.
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
