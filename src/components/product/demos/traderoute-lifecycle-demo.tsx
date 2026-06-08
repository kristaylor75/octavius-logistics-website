"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

/* ============================================================
   Canned, deterministic reseller cohort. No backend.
   48 units received together; each has a fixed lifecycle
   schedule. Scrub the horizon and watch stock move through
   received → listed → sold → returned — while slow movers age
   and strand, accruing capital at risk.
   ============================================================ */
const N = 48;
const T_END = 12;
const AGING = 4; // weeks on market before "aging"
const STRAND = 7; // weeks on market before "stranded"
const SETTLE_T = 10; // reduced-motion / auto-sweep settle point

type Unit = {
  id: number;
  listWeek: number;
  sellWeek: number | null;
  returnWeek: number | null;
  reSellWeek: number | null;
  value: number;
};

const UNITS: Unit[] = Array.from({ length: N }, (_, i) => {
  const listWeek = 1 + (i % 3);
  const neverSells = i % 7 === 0;
  const sellWeek = neverSells ? null : listWeek + 1 + (i % 5);
  const returned = !neverSells && i % 9 === 0;
  const returnWeek = returned && sellWeek != null ? sellWeek + 2 : null;
  const reSells = returned && i % 18 === 0;
  const reSellWeek = reSells && returnWeek != null ? returnWeek + 2 : null;
  const value = 40 + (i % 6) * 18;
  return { id: i, listWeek, sellWeek, returnWeek, reSellWeek, value };
});

type State = "received" | "listed" | "sold" | "returned" | "aging" | "stranded";

const ageBucket = (age: number): State =>
  age >= STRAND ? "stranded" : age >= AGING ? "aging" : "listed";

function stateOf(u: Unit, t: number): State {
  if (t < u.listWeek) return "received";
  if (u.sellWeek == null) return ageBucket(t - u.listWeek);
  if (t < u.sellWeek) return ageBucket(t - u.listWeek);
  // sold at least once
  if (u.returnWeek == null || t < u.returnWeek) return "sold";
  if (t < u.returnWeek + 1) return "returned";
  if (u.reSellWeek != null && t >= u.reSellWeek) return "sold";
  return ageBucket(t - (u.returnWeek + 1));
}

const STATES: { key: State; label: string; risk?: boolean }[] = [
  { key: "received", label: "Received" },
  { key: "listed", label: "Listed" },
  { key: "sold", label: "Sold" },
  { key: "returned", label: "Returned" },
  { key: "aging", label: "Aging", risk: true },
  { key: "stranded", label: "Stranded", risk: true },
];

const money = (v: number) =>
  `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function dotStyle(state: State): CSSProperties {
  switch (state) {
    case "received":
      return { width: 8, height: 8, boxShadow: "inset 0 0 0 1px var(--ink-ghost)" };
    case "listed":
      return { width: 12, height: 12, boxShadow: "inset 0 0 0 1px var(--accent)" };
    case "returned":
      return {
        width: 12,
        height: 12,
        boxShadow: "inset 0 0 0 1px var(--accent)",
        backgroundColor: "color-mix(in oklab, var(--accent) 45%, transparent)",
      };
    case "sold":
      return {
        width: 12,
        height: 12,
        backgroundColor: "color-mix(in oklab, var(--accent) 30%, transparent)",
      };
    case "aging":
      return { width: 12, height: 12, border: "1px dashed var(--ink-faint)" };
    case "stranded":
      return { width: 13, height: 13, boxShadow: "inset 0 0 0 1.5px var(--accent-vivid)" };
  }
}

export default function TradeRouteLifecycleDemo() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });

  const [t, setT] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? SETTLE_T
      : 0,
  );
  const [activeState, setActiveState] = useState<State>("stranded");
  const controls = useRef<ReturnType<typeof animate> | null>(null);

  // capital at risk count-up
  const risk = useMotionValue(0);
  const riskText = useTransform(risk, (v) => money(v));

  useEffect(() => {
    if (reduced || !inView) return;
    controls.current = animate(0, SETTLE_T, {
      duration: 2.8,
      ease: [0.2, 0, 0, 1],
      onUpdate: (v) => setT(v),
    });
    return () => controls.current?.stop();
  }, [inView, reduced]);

  // derive cohort state at time t
  const states = UNITS.map((u) => stateOf(u, t));
  const counts = STATES.reduce(
    (acc, s) => ({ ...acc, [s.key]: states.filter((x) => x === s.key).length }),
    {} as Record<State, number>,
  );
  const capitalAtRisk = UNITS.reduce(
    (sum, u, i) =>
      states[i] === "aging" || states[i] === "stranded" ? sum + u.value : sum,
    0,
  );
  const soldThrough = Math.round((counts.sold / N) * 100);

  useEffect(() => {
    const c = animate(risk, capitalAtRisk, {
      duration: reduced ? 0 : 0.5,
      ease: [0.2, 0, 0, 1],
    });
    return () => c.stop();
  }, [capitalAtRisk, reduced, risk]);

  const onScrub = (value: number) => {
    controls.current?.stop();
    setT(value);
  };

  const RISK_COPY: Record<State, string> = {
    received: "Just received — not yet on the market.",
    listed: "On the market and selling within window.",
    sold: "Cleared — sold and gone from inventory.",
    returned: "Came back; re-listed and aging again from zero.",
    aging: `On the market past ${AGING} weeks — margin starting to erode.`,
    stranded: `Stuck past ${STRAND} weeks — capital tied up with no buyer. A snapshot would still call this "in stock."`,
  };

  return (
    <div
      ref={ref}
      className="grid gap-px overflow-hidden rounded-[var(--radius-md)] lg:grid-cols-[1.55fr_1fr]"
      style={{ backgroundColor: "var(--rule)" }}
    >
      {/* ---- Cohort ---- */}
      <div className="p-6 sm:p-8" style={{ backgroundColor: "var(--surface-1)" }}>
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <div className="font-mono text-sm uppercase tracking-[0.1em] text-ink">
              Cohort C-1180
            </div>
            <div className="mono-label mt-1">{N} units received · 12-week horizon</div>
          </div>
          <div className="mono-label text-right text-ink-ghost">
            T + {Math.round(t)}
            <br />
            {soldThrough}% sold-through
          </div>
        </div>

        {/* unit matrix */}
        <div
          className="grid grid-cols-8 gap-2"
          role="img"
          aria-label={`Cohort at T+${Math.round(t)}: ${counts.stranded} stranded, ${counts.aging} aging, ${counts.sold} sold of ${N} units. ${money(capitalAtRisk)} capital at risk.`}
        >
          {states.map((s, i) => {
            const emphasized =
              activeState === s ? 1 : s === "received" ? 0.5 : 0.28;
            return (
              <span
                key={i}
                aria-hidden
                className="flex aspect-square items-center justify-center"
              >
                <span
                  className="rounded-full transition-opacity duration-200"
                  style={{ ...dotStyle(s), opacity: emphasized }}
                />
              </span>
            );
          })}
        </div>

        {/* time scrubber */}
        <div className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="mono-label">Time · scrub the lifecycle</span>
            <span className="mono-label" style={{ color: "var(--accent)" }}>
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
            aria-label="Cohort lifecycle time"
            className="w-full"
            style={{ accentColor: "var(--accent)" }}
          />
          <div className="mt-1 flex justify-between">
            <span className="mono-label text-ink-ghost">Received</span>
            <span className="mono-label text-ink-ghost">T+{T_END}</span>
          </div>
        </div>
      </div>

      {/* ---- Readout ---- */}
      <aside className="p-6 sm:p-8" style={{ backgroundColor: "var(--surface-1)" }}>
        <div className="lg:sticky lg:top-20">
          <span className="mono-label">Capital at risk</span>
          <div className="mt-2 flex items-baseline gap-3">
            <motion.span
              className="font-semibold tabular-nums"
              style={{
                color: "var(--accent)",
                fontSize: "3rem",
                lineHeight: 0.95,
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              {riskText}
            </motion.span>
          </div>
          <p className="mono-label mt-2 text-ink-ghost">
            {counts.aging + counts.stranded} units aging or stranded · {soldThrough}%
            sold-through
          </p>

          {/* state breakdown (hover/focus to filter the matrix) */}
          <ul className="mt-6" style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
            {STATES.map((s) => {
              const isActive = activeState === s.key;
              const tone = s.risk ? "var(--accent)" : "var(--ink-muted)";
              return (
                <li key={s.key} style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveState(s.key)}
                    onFocus={() => setActiveState(s.key)}
                    aria-pressed={isActive}
                    className="flex w-full items-baseline justify-between gap-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
                  >
                    <span
                      className="text-sm"
                      style={{ color: isActive ? "var(--ink)" : "var(--ink-muted)" }}
                    >
                      {s.label}
                      {s.risk ? " ·  at risk" : ""}
                    </span>
                    <span
                      className="font-mono text-sm tabular-nums"
                      style={{ color: s.risk ? tone : "var(--ink)" }}
                    >
                      {counts[s.key]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div
            className="mt-8 min-h-[7rem]"
            style={{ borderTop: "var(--rule-width) solid var(--rule)", paddingTop: "1.5rem" }}
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm" style={{ color: "var(--accent)" }}>
                {STATES.find((s) => s.key === activeState)?.label}
              </span>
              <h4 className="font-semibold tabular-nums" style={{ fontSize: "var(--text-xl)" }}>
                {counts[activeState]} units
              </h4>
            </div>
            <p className="mt-3 text-sm text-ink-muted">{RISK_COPY[activeState]}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
