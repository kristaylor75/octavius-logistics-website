"use client";

import { useRef, useState } from "react";
import {
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";

/* ============================================================
   Canned, deterministic decision. No backend.
   Scenario: where should this order ship from? Deterministic
   rules fire in order and narrow the candidate nodes; the
   probabilistic step is withheld because the rules already
   resolved a unique, auditable answer.
   ============================================================ */
type Candidate = {
  id: string;
  name: string;
  loc: string;
  stock: number;
  transit: number; // days
  cost: number; // landed $
};

const CANDIDATES: Candidate[] = [
  { id: "west", name: "DC-West", loc: "Reno, NV", stock: 220, transit: 2, cost: 7.4 },
  { id: "central", name: "DC-Central", loc: "Dallas, TX", stock: 64, transit: 1, cost: 6.1 },
  { id: "east", name: "DC-East", loc: "Atlanta, GA", stock: 0, transit: 3, cost: 9.2 },
];

const ORDER = {
  id: "ORD-58213",
  dest: "Austin, TX 78701",
  sku: "AX-1180",
  qty: 3,
  sla: "2-day",
  tier: "Gold",
};

type Rule = {
  id: string;
  name: string;
  kind: "Hard constraint" | "Policy" | "Optimization" | "Inference";
  reads: string;
  effect: string;
  eliminates?: string[];
  selects?: string;
  withheld?: boolean;
};

const RULES: Rule[] = [
  {
    id: "R-01",
    name: "Availability",
    kind: "Hard constraint",
    reads: "On-hand units of AX-1180 by node",
    effect: "DC-East holds 0 units — eliminated.",
    eliminates: ["east"],
  },
  {
    id: "R-02",
    name: "SLA feasibility",
    kind: "Hard constraint",
    reads: "Transit days vs the 2-day commitment",
    effect: "DC-West (2d) and DC-Central (1d) both meet the SLA — both kept.",
    eliminates: [],
  },
  {
    id: "R-03",
    name: "Compliance",
    kind: "Policy",
    reads: "SKU handling class against node licensing",
    effect: "AX-1180 is unrestricted — both remaining nodes clear.",
    eliminates: [],
  },
  {
    id: "R-04",
    name: "Landed-cost minimization",
    kind: "Optimization",
    reads: "Landed cost of the remaining nodes",
    effect: "DC-Central $6.10 < DC-West $7.40 — selected.",
    selects: "central",
  },
  {
    id: "R-05",
    name: "Probabilistic inference",
    kind: "Inference",
    reads: "—",
    effect:
      "Rules resolved a unique route, so inference is withheld. The deterministic path is sufficient and fully auditable.",
    withheld: true,
  },
];

const money = (v: number) => `$${v.toFixed(2)}`;

export default function CortexDecisionDemo() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const [revealed, setRevealed] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "start 0.2"],
  });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduced) return;
    const count = RULES.filter((_, i) => p >= 0.08 + i * 0.17).length;
    setRevealed((r) => (count > r ? count : r));
  });

  // Under reduced motion, the finished trace is shown immediately (CLAUDE.md §4).
  const effectiveRevealed = reduced ? RULES.length : revealed;

  const ruleIndex = (id: string) => RULES.findIndex((r) => r.id === id);
  const isFired = (id: string) => ruleIndex(id) < effectiveRevealed;
  const surface = (id: string) => {
    setActiveId(id);
    setRevealed((r) => Math.max(r, ruleIndex(id) + 1));
  };

  const activeRule =
    (activeId && RULES.find((r) => r.id === activeId)) ||
    (effectiveRevealed > 0 ? RULES[effectiveRevealed - 1] : null);

  // derive decision state from fired rules
  const firedRules = RULES.slice(0, effectiveRevealed);
  const eliminated = new Set<string>();
  firedRules.forEach((r) => r.eliminates?.forEach((e) => eliminated.add(e)));
  const selectedId = firedRules.find((r) => r.selects)?.selects ?? null;
  const inferenceWithheld = firedRules.some((r) => r.withheld);
  const chosen = CANDIDATES.find((c) => c.id === selectedId) ?? null;
  const hardRuleCount = firedRules.filter((r) => r.kind !== "Inference").length;

  const status = (id: string) =>
    id === selectedId ? "route" : eliminated.has(id) ? "eliminated" : "eligible";

  return (
    <div
      ref={ref}
      className="grid gap-px overflow-hidden rounded-[var(--radius-md)] lg:grid-cols-[1.55fr_1fr]"
      style={{ backgroundColor: "var(--rule)" }}
    >
      {/* ---- Decision flow ---- */}
      <div className="p-6 sm:p-8" style={{ backgroundColor: "var(--surface-1)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <div className="font-mono text-sm uppercase tracking-[0.1em] text-ink">
              Order {ORDER.id}
            </div>
            <div className="mono-label mt-1">
              Ship to {ORDER.dest} · {ORDER.tier}
            </div>
          </div>
          <div className="mono-label text-right text-ink-ghost">
            {ORDER.sku} × {ORDER.qty}
            <br />
            SLA {ORDER.sla}
          </div>
        </div>

        <p className="mt-6 text-ink" style={{ fontSize: "var(--text-xl)" }}>
          Decision: which node should fulfill this order?
        </p>

        {/* rule nodes */}
        <div className="mt-6">
          {RULES.map((rule) => {
            const fired = isFired(rule.id);
            const active = activeId === rule.id;
            return (
              <button
                key={rule.id}
                type="button"
                onMouseEnter={() => surface(rule.id)}
                onFocus={() => surface(rule.id)}
                onMouseLeave={() => setActiveId(null)}
                onBlur={() => setActiveId(null)}
                aria-pressed={fired}
                aria-label={`${rule.id} ${rule.name}, ${rule.kind}. Reads ${rule.reads}. ${rule.effect}`}
                className="relative block w-full py-4 pl-6 text-left transition-colors duration-300 [transition-timing-function:var(--ease-instrument)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
                style={{
                  borderBottom: "var(--rule-width) solid var(--rule)",
                  backgroundColor: fired
                    ? `color-mix(in oklab, var(--accent) ${active ? 12 : 7}%, transparent)`
                    : "transparent",
                }}
              >
                {/* accent edge / flow rail */}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-[7px] top-0 w-[2px] origin-top transition-transform duration-300 [transition-timing-function:var(--ease-instrument)]"
                  style={{
                    backgroundColor: "var(--accent)",
                    transform: fired ? "scaleY(1)" : "scaleY(0)",
                  }}
                />
                <span
                  aria-hidden
                  className="absolute left-[2px] top-5 h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: fired ? "var(--accent)" : "var(--surface-1)",
                    boxShadow: "inset 0 0 0 var(--rule-width) var(--rule)",
                  }}
                />

                <div className="flex flex-wrap items-baseline gap-3">
                  <span
                    className="font-mono text-sm"
                    style={{ color: fired ? "var(--accent)" : "var(--ink-ghost)" }}
                  >
                    {rule.id}
                  </span>
                  <span className="font-medium text-ink">{rule.name}</span>
                  <span className="mono-label">{rule.kind}</span>
                  {fired && rule.eliminates && rule.eliminates.length > 0 && (
                    <span className="mono-label" style={{ color: "var(--accent)" }}>
                      ● {rule.eliminates.length} eliminated
                    </span>
                  )}
                  {fired && rule.selects && (
                    <span className="mono-label" style={{ color: "var(--accent)" }}>
                      ● route selected
                    </span>
                  )}
                  {fired && rule.withheld && (
                    <span className="mono-label" style={{ color: "var(--accent)" }}>
                      ● inference withheld
                    </span>
                  )}
                </div>

                <div
                  className="mt-2 grid gap-1 text-sm transition-opacity duration-300"
                  style={{ opacity: fired ? 1 : 0.4 }}
                >
                  <div>
                    <span className="mono-label mr-2">Reads</span>
                    <span className="text-ink-muted">{rule.reads}</span>
                  </div>
                  {fired && (
                    <div>
                      <span
                        className="mono-label mr-2"
                        style={{ color: "var(--accent)" }}
                      >
                        Effect
                      </span>
                      <span className="text-ink">{rule.effect}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Verdict readout ---- */}
      <aside className="p-6 sm:p-8" style={{ backgroundColor: "var(--surface-1)" }}>
        <div className="lg:sticky lg:top-20">
          <span className="mono-label">Decision</span>
          <div className="mt-2">
            <span
              className="font-semibold"
              style={{
                color: chosen ? "var(--accent)" : "var(--ink-faint)",
                fontSize: "2.5rem",
                lineHeight: 1,
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              {chosen ? chosen.name : "—"}
            </span>
          </div>
          <p className="mono-label mt-2 text-ink-ghost">
            {chosen
              ? `${chosen.loc} · meets ${ORDER.sla} · landed ${money(chosen.cost)}`
              : "evaluating rules…"}
          </p>

          {/* candidate narrowing */}
          <ul className="mt-6" style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
            {CANDIDATES.map((c) => {
              const s = status(c.id);
              const tone =
                s === "route"
                  ? "var(--accent)"
                  : s === "eliminated"
                    ? "var(--ink-ghost)"
                    : "var(--ink-muted)";
              return (
                <li
                  key={c.id}
                  className="flex items-baseline justify-between gap-3 py-2"
                  style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
                >
                  <span
                    className="text-sm"
                    style={{
                      color: tone,
                      textDecoration: s === "eliminated" ? "line-through" : "none",
                    }}
                  >
                    {c.name} · {c.loc}
                  </span>
                  <span className="mono-label" style={{ color: tone }}>
                    {s === "route" ? "route" : s === "eliminated" ? "out" : "eligible"}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mono-label mt-4 text-ink-ghost">
            {hardRuleCount} deterministic rule{hardRuleCount === 1 ? "" : "s"} applied ·
            inference {inferenceWithheld ? "withheld" : "—"}
          </p>

          {/* active rule explanation */}
          <div
            className="mt-8 min-h-[8.5rem]"
            style={{
              borderTop: "var(--rule-width) solid var(--rule)",
              paddingTop: "1.5rem",
            }}
          >
            {activeRule ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span
                    className="font-mono text-sm"
                    style={{ color: "var(--accent)" }}
                  >
                    {activeRule.id}
                  </span>
                  <h4 className="font-semibold" style={{ fontSize: "var(--text-xl)" }}>
                    {activeRule.name}
                  </h4>
                </div>
                <p className="mt-3 text-sm text-ink-muted">{activeRule.effect}</p>
              </>
            ) : (
              <p className="text-sm text-ink-faint">
                Scroll through the rules — or hover one — to replay how the route
                was decided.
              </p>
            )}
          </div>

          {effectiveRevealed < RULES.length ? (
            <button
              type="button"
              onClick={() => setRevealed(RULES.length)}
              className="mono-label mt-8 inline-flex items-center gap-2 text-ink-faint transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
            >
              ▸ Replay the full decision
            </button>
          ) : (
            <p className="mono-label mt-8" style={{ color: "var(--accent)" }}>
              ▸ Decided by rules — every step on the record
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
