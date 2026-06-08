"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { Container } from "@/components/container";
import type { HowItWorksStep } from "@/data/products";

/**
 * How it works — client component (Framer Motion useScroll/useTransform). Steps
 * draw themselves in as the section scrolls through, like a plotter assembling a
 * diagram. A vertical connecting line plots down alongside. Under reduced motion
 * every step is shown finished immediately (CLAUDE.md §4). Accent hue inherited.
 */
export function HowItWorks({ steps }: { steps: HowItWorksStep[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.5"],
  });

  // the connecting line draws from top to bottom as you scroll
  const lineScale = useTransform(scrollYProgress, [0, 0.85], [0, 1]);

  return (
    <section style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
      <Container className="py-24">
        <div className="mb-12 flex flex-wrap items-baseline gap-x-6 gap-y-3">
          <span className="mono-label whitespace-nowrap">§ 03 / How it works</span>
          <h2
            className="font-semibold"
            style={{ fontSize: "var(--text-3xl)", letterSpacing: "var(--tracking-tight)" }}
          >
            The mechanism, shown
          </h2>
        </div>

        <ol ref={ref} className="relative pl-10">
          {/* baseline rail */}
          <span
            aria-hidden
            className="absolute bottom-2 left-[7px] top-2 w-px"
            style={{ backgroundColor: "var(--rule)" }}
          />
          {/* plotted line in accent */}
          <motion.span
            aria-hidden
            className="absolute bottom-2 left-[7px] top-2 w-px origin-top"
            style={{
              backgroundColor: "var(--accent)",
              scaleY: reduced ? 1 : lineScale,
            }}
          />

          {steps.map((step, i) => (
            <AssemblyStep
              key={step.marker}
              progress={scrollYProgress}
              index={i}
              total={steps.length}
              step={step}
              reduced={!!reduced}
            />
          ))}
        </ol>
      </Container>
    </section>
  );
}

function AssemblyStep({
  progress,
  index,
  total,
  step,
  reduced,
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  step: HowItWorksStep;
  reduced: boolean;
}) {
  const seg = 0.7 / total;
  const start = index * seg;
  const end = start + 0.4;

  const opacity = useTransform(progress, [start, end], [0.12, 1]);
  const y = useTransform(progress, [start, end], [26, 0]);
  const markerScale = useTransform(progress, [start, start + 0.18], [0.5, 1]);

  return (
    <motion.li
      className="relative pb-12 last:pb-0"
      style={reduced ? undefined : { opacity, y }}
    >
      {/* marker */}
      <motion.span
        aria-hidden
        className="absolute -left-10 top-1 flex h-4 w-4 items-center justify-center rounded-full"
        style={{
          backgroundColor: "var(--bg)",
          boxShadow: "inset 0 0 0 var(--rule-width) var(--accent)",
          scale: reduced ? 1 : markerScale,
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "var(--accent)" }}
        />
      </motion.span>

      <div className="flex flex-wrap items-baseline gap-3">
        <span
          className="font-mono text-sm"
          style={{ color: "var(--accent)" }}
        >
          {step.marker}
        </span>
        <h3 className="font-semibold" style={{ fontSize: "var(--text-2xl)" }}>
          {step.title}
        </h3>
      </div>
      <p className="mt-3 max-w-[60ch] text-ink-muted">{step.description}</p>
    </motion.li>
  );
}
