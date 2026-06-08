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
   Canned, deterministic invoice. No backend.
   ============================================================ */
type Line = {
  id: string;
  label: string;
  detail: string;
  amount: number;
  flag?: { recoverable: number; title: string; plain: string };
};

const INVOICE = {
  carrier: "Meridian Parcel",
  number: "MP-4471-0293",
  service: "Ground · Zone 5",
  parcel: { weight: "7.2 lb", dims: "14 × 11 × 9 in", cubic: "1,386 in³" },
};

const LINES: Line[] = [
  { id: "base", label: "Base transportation", detail: "Ground · Zone 5", amount: 14.2 },
  { id: "fuel", label: "Fuel surcharge", detail: "14.5% of base", amount: 2.06 },
  {
    id: "dim",
    label: "Dimensional weight adjustment",
    detail: "Billed at 8 lb",
    amount: 5.3,
    flag: {
      recoverable: 3.4,
      title: "DIM rounding",
      plain:
        "Actual weight was 7.2 lb, rounded up to 8 lb before the dimensional calculation. The rounding alone added $3.40 — and it repeats on every parcel you ship.",
    },
  },
  {
    id: "resi",
    label: "Residential delivery",
    detail: "Accessorial",
    amount: 5.95,
    flag: {
      recoverable: 5.95,
      title: "Residential accessorial",
      plain:
        "A residential surcharge was applied to a commercial ship-to address. Under your contract this charge does not apply — $5.95 billed in error.",
    },
  },
  {
    id: "peak",
    label: "Peak demand surcharge",
    detail: "Cubic-volume tier",
    amount: 4.5,
    flag: {
      recoverable: 4.5,
      title: "Peak surcharge on cubic volume",
      plain:
        "The peak surcharge triggered on the 1,728 in³ tier — but this parcel is 1,386 in³. The threshold was misread; the full $4.50 is recoverable.",
    },
  },
];

const FLAGS = LINES.filter((l) => l.flag);
const TOTAL_AUDITED = LINES.reduce((s, l) => s + l.amount, 0);
const TOTAL_RECOVERABLE = FLAGS.reduce((s, f) => s + (f.flag?.recoverable ?? 0), 0);

const money = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ImagineInvoiceDemo() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // how many flags have been surfaced (monotonic; scroll or hover advances it)
  const [revealed, setRevealed] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  // running recovered tally (animated count-up)
  const tally = useMotionValue(0);
  const tallyText = useTransform(tally, (v) => money(v));

  // scroll-linked reveal
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "start 0.25"],
  });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduced) return;
    const count = FLAGS.filter((_, i) => p >= 0.12 + i * 0.26).length;
    setRevealed((r) => (count > r ? count : r));
  });

  // Under reduced motion, the finished audit is shown immediately (CLAUDE.md §4).
  const effectiveRevealed = reduced ? FLAGS.length : revealed;

  // animate the tally toward the sum of revealed flags
  useEffect(() => {
    const target = FLAGS.slice(0, effectiveRevealed).reduce(
      (s, f) => s + (f.flag?.recoverable ?? 0),
      0,
    );
    const controls = animate(tally, target, {
      duration: reduced ? 0 : 0.6,
      ease: [0.2, 0, 0, 1],
    });
    return () => controls.stop();
  }, [effectiveRevealed, reduced, tally]);

  const flagIndex = (id: string) => FLAGS.findIndex((f) => f.id === id);
  const isLit = (id: string) => flagIndex(id) < effectiveRevealed;

  // surface a flag on hover/focus (and light everything up to it)
  const surface = (id: string) => {
    setActiveId(id);
    setRevealed((r) => Math.max(r, flagIndex(id) + 1));
  };

  const activeFlag =
    (activeId && FLAGS.find((f) => f.id === activeId)) ||
    (effectiveRevealed > 0 ? FLAGS[effectiveRevealed - 1] : null);

  return (
    <div
      ref={ref}
      className="grid gap-px overflow-hidden rounded-[var(--radius-md)] lg:grid-cols-[1.55fr_1fr]"
      style={{ backgroundColor: "var(--rule)" }}
    >
      {/* ---- Invoice ---- */}
      <div className="p-6 sm:p-8" style={{ backgroundColor: "var(--surface-1)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <div className="font-mono text-sm uppercase tracking-[0.1em] text-ink">
              {INVOICE.carrier}
            </div>
            <div className="mono-label mt-1">
              Invoice {INVOICE.number} · {INVOICE.service}
            </div>
          </div>
          <div className="mono-label text-right text-ink-ghost">
            {INVOICE.parcel.weight} · {INVOICE.parcel.dims}
            <br />
            {INVOICE.parcel.cubic} cubic
          </div>
        </div>

        {/* column captions */}
        <div
          className="mt-6 grid grid-cols-[1fr_auto] gap-4 pb-2"
          style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
        >
          <span className="mono-label">Charge</span>
          <span className="mono-label">Amount</span>
        </div>

        <div>
          {LINES.map((line) => {
            if (!line.flag) {
              return (
                <div
                  key={line.id}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-3"
                  style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
                >
                  <span>
                    <span className="text-ink">{line.label}</span>
                    <span className="mono-label ml-3">{line.detail}</span>
                  </span>
                  <span className="font-mono tabular-nums text-ink-muted">
                    {money(line.amount)}
                  </span>
                </div>
              );
            }

            const lit = isLit(line.id);
            const active = activeId === line.id;
            return (
              <button
                key={line.id}
                type="button"
                onMouseEnter={() => surface(line.id)}
                onFocus={() => surface(line.id)}
                onMouseLeave={() => setActiveId(null)}
                onBlur={() => setActiveId(null)}
                aria-pressed={lit}
                aria-label={`${line.label}: ${money(line.amount)}. ${
                  line.flag.title
                } — ${money(line.flag.recoverable)} recoverable. ${line.flag.plain}`}
                className="relative grid w-full grid-cols-[1fr_auto] items-baseline gap-4 py-3 text-left transition-colors duration-300 [transition-timing-function:var(--ease-instrument)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
                style={{
                  borderBottom: "var(--rule-width) solid var(--rule)",
                  backgroundColor: lit
                    ? `color-mix(in oklab, var(--accent) ${active ? 14 : 8}%, transparent)`
                    : "transparent",
                }}
              >
                {/* accent edge */}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-[-1.5rem] top-0 w-[2px] origin-top transition-transform duration-300 [transition-timing-function:var(--ease-instrument)]"
                  style={{
                    backgroundColor: "var(--accent)",
                    transform: lit ? "scaleY(1)" : "scaleY(0)",
                  }}
                />
                <span className="min-w-0">
                  <span className="text-ink">{line.label}</span>
                  <span className="mono-label ml-3">{line.detail}</span>
                  {lit && (
                    <span
                      className="mono-label ml-3"
                      style={{ color: "var(--accent)" }}
                    >
                      ● Overcharge
                    </span>
                  )}
                </span>
                <span className="flex items-baseline gap-3 whitespace-nowrap">
                  {lit && (
                    <span
                      className="font-mono text-sm tabular-nums"
                      style={{ color: "var(--accent)" }}
                    >
                      −{money(line.flag.recoverable)}
                    </span>
                  )}
                  <span className="font-mono tabular-nums text-ink">
                    {money(line.amount)}
                  </span>
                </span>
              </button>
            );
          })}

          {/* total */}
          <div className="grid grid-cols-[1fr_auto] items-baseline gap-4 pt-4">
            <span className="mono-label">Invoice total</span>
            <span className="font-mono font-medium tabular-nums text-ink">
              {money(TOTAL_AUDITED)}
            </span>
          </div>
        </div>
      </div>

      {/* ---- Readout ---- */}
      <aside className="p-6 sm:p-8" style={{ backgroundColor: "var(--surface-1)" }}>
        <div className="lg:sticky lg:top-20">
          <span className="mono-label">Recovered</span>
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
          </div>
          <p className="mono-label mt-2 text-ink-ghost">
            of {money(TOTAL_AUDITED)} audited · {effectiveRevealed} of{" "}
            {FLAGS.length} issues
          </p>

          {/* active explanation */}
          <div
            className="mt-8 min-h-[8.5rem]"
            style={{ borderTop: "var(--rule-width) solid var(--rule)", paddingTop: "1.5rem" }}
          >
            {activeFlag?.flag ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span
                    className="font-mono text-sm tabular-nums"
                    style={{ color: "var(--accent)" }}
                  >
                    +{money(activeFlag.flag.recoverable)}
                  </span>
                  <h4 className="font-semibold" style={{ fontSize: "var(--text-xl)" }}>
                    {activeFlag.flag.title}
                  </h4>
                </div>
                <p className="mt-3 text-sm text-ink-muted">{activeFlag.flag.plain}</p>
              </>
            ) : (
              <p className="text-sm text-ink-faint">
                Scroll through the invoice — or hover a line — to surface what the
                carrier buried.
              </p>
            )}
          </div>

          {/* reveal-all affordance (keyboard / no-scroll) */}
          {effectiveRevealed < FLAGS.length && (
            <button
              type="button"
              onClick={() => setRevealed(FLAGS.length)}
              className="mono-label mt-8 inline-flex items-center gap-2 text-ink-faint transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
            >
              ▸ Reveal all overcharges
            </button>
          )}
          {effectiveRevealed >= FLAGS.length && (
            <p className="mono-label mt-8" style={{ color: "var(--accent)" }}>
              ▸ {money(TOTAL_RECOVERABLE)} recoverable on one parcel
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
