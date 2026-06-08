"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

/* ============================================================
   Canned, deterministic exception queue. No backend.
   Scenario: a backlog of returns-disposition exceptions that
   normally need an expert. Reflex replays that encoded judgment
   case by case, clearing most automatically and routing the few
   genuine edges to a human.
   ============================================================ */
type Disposition = "Restock" | "Refurbish" | "Liquidate" | "Deny" | "Escalate";

type ReturnCase = {
  id: string;
  item: string;
  signals: string;
  call: Disposition;
  escalate?: boolean;
  rationale: string;
};

const CASES: ReturnCase[] = [
  {
    id: "RX-2041",
    item: "Wireless earbuds · opened",
    signals: "Like-new · buyer remorse · high resale",
    call: "Restock",
    rationale:
      "Like-new condition, a buyer-remorse reason, and high resale value clear the A-stock threshold — restock.",
  },
  {
    id: "RX-2042",
    item: "Robot vacuum · used 40 days",
    signals: "Functional · cosmetic wear · moderate value",
    call: "Refurbish",
    rationale:
      "Functional but past the cosmetic-wear line for A-stock; value supports rework — refurbish and re-list as B-stock.",
  },
  {
    id: "RX-2043",
    item: "Phone case · transit damage",
    signals: "Item intact · packaging only · low value",
    call: "Restock",
    rationale:
      "Only the packaging was damaged; the item is intact — repackage and restock.",
  },
  {
    id: "RX-2044",
    item: "Designer handbag · disputed",
    signals: "High value · authenticity contested",
    call: "Escalate",
    escalate: true,
    rationale:
      "High value plus a contested-authenticity flag exceeds the auto-disposition policy — route to a human specialist.",
  },
  {
    id: "RX-2045",
    item: "Bulk apparel lot · opened",
    signals: "Mixed condition · low per-unit value",
    call: "Liquidate",
    rationale:
      "Low per-unit value against mixed condition makes individual processing uneconomic — liquidate the lot.",
  },
  {
    id: "RX-2046",
    item: "Power tool · missing parts",
    signals: "Incomplete vs manifest · moderate value",
    call: "Deny",
    rationale:
      "Components are missing against the manifest — deny the full refund per returns policy.",
  },
];

const TOTAL = CASES.length;
const AUTO_TOTAL = CASES.filter((c) => !c.escalate).length;

export default function ReflexQueueDemo() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const [revealed, setRevealed] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  // running count of cases cleared automatically (animated count-up)
  const tally = useMotionValue(0);
  const tallyText = useTransform(tally, (v) => String(Math.round(v)));

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "start 0.2"],
  });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduced) return;
    const count = CASES.filter((_, i) => p >= 0.06 + i * 0.15).length;
    setRevealed((r) => (count > r ? count : r));
  });

  // Under reduced motion, the cleared queue is shown immediately (CLAUDE.md §4).
  const effectiveRevealed = reduced ? TOTAL : revealed;

  const caseIndex = (id: string) => CASES.findIndex((c) => c.id === id);
  const isResolved = (id: string) => caseIndex(id) < effectiveRevealed;
  const surface = (id: string) => {
    setActiveId(id);
    setRevealed((r) => Math.max(r, caseIndex(id) + 1));
  };

  const resolved = CASES.slice(0, effectiveRevealed);
  const clearedCount = resolved.filter((c) => !c.escalate).length;
  const escalatedCount = resolved.filter((c) => c.escalate).length;

  // animate the cleared count toward the resolved-auto total
  useEffect(() => {
    const controls = animate(tally, clearedCount, {
      duration: reduced ? 0 : 0.5,
      ease: [0.2, 0, 0, 1],
    });
    return () => controls.stop();
  }, [clearedCount, reduced, tally]);

  const activeCase =
    (activeId && CASES.find((c) => c.id === activeId)) ||
    (effectiveRevealed > 0 ? CASES[effectiveRevealed - 1] : null);

  return (
    <div
      ref={ref}
      className="grid gap-px overflow-hidden rounded-[var(--radius-md)] lg:grid-cols-[1.55fr_1fr]"
      style={{ backgroundColor: "var(--rule)" }}
    >
      {/* ---- Queue ---- */}
      <div className="p-6 sm:p-8" style={{ backgroundColor: "var(--surface-1)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <div className="font-mono text-sm uppercase tracking-[0.1em] text-ink">
              Returns disposition
            </div>
            <div className="mono-label mt-1">
              Exception queue · {TOTAL} cases awaiting a call
            </div>
          </div>
          <div className="mono-label text-right text-ink-ghost">
            Encoded judgment
            <br />
            machine speed
          </div>
        </div>

        <div
          className="mt-6 grid grid-cols-[1fr_auto] gap-4 pb-2"
          style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
        >
          <span className="mono-label">Case</span>
          <span className="mono-label">Call</span>
        </div>

        <div>
          {CASES.map((c) => {
            const done = isResolved(c.id);
            const active = activeId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onMouseEnter={() => surface(c.id)}
                onFocus={() => surface(c.id)}
                onMouseLeave={() => setActiveId(null)}
                onBlur={() => setActiveId(null)}
                aria-pressed={done}
                aria-label={`${c.id} ${c.item}. Signals: ${c.signals}. Call: ${
                  c.escalate ? "escalate to human review" : c.call
                }. ${c.rationale}`}
                className="relative grid w-full grid-cols-[1fr_auto] items-baseline gap-4 py-4 pl-6 text-left transition-colors duration-300 [transition-timing-function:var(--ease-instrument)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
                style={{
                  borderBottom: "var(--rule-width) solid var(--rule)",
                  backgroundColor:
                    done && !c.escalate
                      ? `color-mix(in oklab, var(--accent) ${active ? 12 : 7}%, transparent)`
                      : "transparent",
                }}
              >
                {/* status edge */}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-[7px] top-0 w-[2px] origin-top transition-transform duration-300 [transition-timing-function:var(--ease-instrument)]"
                  style={{
                    backgroundColor: c.escalate ? "var(--ink-faint)" : "var(--accent)",
                    transform: done ? "scaleY(1)" : "scaleY(0)",
                  }}
                />

                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-3">
                    <span
                      className="font-mono text-sm"
                      style={{ color: done ? "var(--accent)" : "var(--ink-ghost)" }}
                    >
                      {c.id}
                    </span>
                    <span className="font-medium text-ink">{c.item}</span>
                  </span>
                  <span
                    className="mono-label mt-1 block transition-opacity duration-300"
                    style={{ opacity: done ? 1 : 0.5 }}
                  >
                    {c.signals}
                  </span>
                </span>

                <span className="whitespace-nowrap pt-0.5">
                  {!done ? (
                    <span className="mono-label text-ink-ghost">pending</span>
                  ) : c.escalate ? (
                    <span
                      className="rounded-[2px] px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-ink"
                      style={{ boxShadow: "inset 0 0 0 var(--rule-width) var(--ink-faint)" }}
                    >
                      → Human review
                    </span>
                  ) : (
                    <span
                      className="font-mono text-sm"
                      style={{ color: "var(--accent)" }}
                    >
                      ● {c.call}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Readout ---- */}
      <aside className="p-6 sm:p-8" style={{ backgroundColor: "var(--surface-1)" }}>
        <div className="lg:sticky lg:top-20">
          <span className="mono-label">Cleared automatically</span>
          <div className="mt-2 flex items-baseline gap-3">
            <motion.span
              className="font-semibold tabular-nums"
              style={{
                color: "var(--accent)",
                fontSize: "3.25rem",
                lineHeight: 0.95,
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              {tallyText}
            </motion.span>
            <span
              className="font-mono tabular-nums text-ink-faint"
              style={{ fontSize: "var(--text-2xl)" }}
            >
              / {TOTAL}
            </span>
          </div>
          <p className="mono-label mt-2 text-ink-ghost">
            {AUTO_TOTAL} clear on judgment · {escalatedCount} routed to a human
          </p>

          {/* active rationale */}
          <div
            className="mt-8 min-h-[8.5rem]"
            style={{
              borderTop: "var(--rule-width) solid var(--rule)",
              paddingTop: "1.5rem",
            }}
          >
            {activeCase ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span
                    className="font-mono text-sm"
                    style={{
                      color: activeCase.escalate ? "var(--ink-faint)" : "var(--accent)",
                    }}
                  >
                    {activeCase.escalate ? "→ Human" : activeCase.call}
                  </span>
                  <h4 className="font-semibold" style={{ fontSize: "var(--text-xl)" }}>
                    {activeCase.id}
                  </h4>
                </div>
                <p className="mt-3 text-sm text-ink-muted">{activeCase.rationale}</p>
              </>
            ) : (
              <p className="text-sm text-ink-faint">
                Scroll the queue — or hover a case — to watch encoded judgment
                clear the backlog.
              </p>
            )}
          </div>

          {effectiveRevealed < TOTAL ? (
            <button
              type="button"
              onClick={() => setRevealed(TOTAL)}
              className="mono-label mt-8 inline-flex items-center gap-2 text-ink-faint transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
            >
              ▸ Clear the whole queue
            </button>
          ) : (
            <p className="mono-label mt-8" style={{ color: "var(--accent)" }}>
              ▸ {AUTO_TOTAL} of {TOTAL} cleared without a human
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
