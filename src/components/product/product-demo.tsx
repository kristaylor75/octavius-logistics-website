"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentType } from "react";

/** Static, legible fallback shown before a demo chunk loads / without JS. */
function DemoSkeleton({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      className="hairframe rounded-[var(--radius-md)] p-8"
      style={{ minHeight: 360 }}
    >
      <span className="mono-label">Interactive demo · {title}</span>
      <p className="mt-4 max-w-[56ch] text-ink-muted">{desc}</p>
      <p className="mono-label mt-6 text-ink-ghost">
        Loading… enable JavaScript to run it step by step.
      </p>
    </div>
  );
}

// Per-product skeleton copy — used both for the pre-viewport placeholder and the
// dynamic loading fallback, so the markup matches (no layout jump / hydration
// mismatch) and doubles as the no-JS content for that product.
const SKELETON: Record<string, { title: string; desc: string }> = {
  imagine: {
    title: "Invoice audit",
    desc: "A sample carrier invoice with three buried overcharges — DIM rounding, a misapplied residential accessorial, and a peak surcharge triggered on cubic volume — each with a plain-English explanation and a running recovered tally.",
  },
  cortex: {
    title: "Decision replay",
    desc: "A sample order-routing decision, traced through its deterministic rules. Each rule fires in order on the input it read — narrowing the candidate nodes — before any probabilistic step, ending in an auditable verdict.",
  },
  reflex: {
    title: "Exception queue",
    desc: "A backlog of returns-disposition exceptions that normally need an expert. Encoded judgment clears each case on the signals it weighs — restock, refurbish, liquidate, deny — and routes the few genuine edges to a human.",
  },
  odyssey: {
    title: "Demand map",
    desc: "A fulfillment network rendered as a demand surface. Scrub a 12-step horizon and watch the contours shift as demand builds — one node tips from nominal into strain, forecast a horizon before it breaches.",
  },
  traderoute: {
    title: "Inventory lifecycle",
    desc: "A cohort of 48 reseller units over a 12-week horizon. Scrub the timeline and watch stock move received → listed → sold → returned, while slow movers age and strand — accruing a running capital-at-risk a snapshot would miss.",
  },
};

// Each demo is its own code-split chunk; ssr:false keeps it out of the server
// render entirely. The chunk only downloads once <Demo/> first mounts, which we
// gate on proximity to the viewport below.
const DEMOS: Record<string, ComponentType> = {
  imagine: dynamic(() => import("./demos/imagine-invoice-demo"), {
    ssr: false,
    loading: () => <DemoSkeleton {...SKELETON.imagine} />,
  }),
  cortex: dynamic(() => import("./demos/cortex-decision-demo"), {
    ssr: false,
    loading: () => <DemoSkeleton {...SKELETON.cortex} />,
  }),
  reflex: dynamic(() => import("./demos/reflex-queue-demo"), {
    ssr: false,
    loading: () => <DemoSkeleton {...SKELETON.reflex} />,
  }),
  odyssey: dynamic(() => import("./demos/odyssey-demand-demo"), {
    ssr: false,
    loading: () => <DemoSkeleton {...SKELETON.odyssey} />,
  }),
  traderoute: dynamic(() => import("./demos/traderoute-lifecycle-demo"), {
    ssr: false,
    loading: () => <DemoSkeleton {...SKELETON.traderoute} />,
  }),
};

/**
 * ProductDemo — client loader. Renders the static skeleton until the section is
 * within ~400px of the viewport, then mounts the dynamic demo (triggering its
 * chunk download). So the demo's JS loads only when scrolled near.
 */
export function ProductDemo({ slug }: { slug: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // Start false on BOTH server and first client render so the SSR'd skeleton and
  // the first hydration render produce identical DOM (no #418 hydration
  // mismatch). The effect below mounts the demo once it scrolls near.
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el) return;
    // No IntersectionObserver support: mount eagerly (next frame, so the
    // setState isn't called directly inside the effect body).
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setNear(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setNear(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  const Demo = DEMOS[slug];
  const skel = SKELETON[slug];
  if (!Demo || !skel) return null;

  return <div ref={ref}>{near ? <Demo /> : <DemoSkeleton {...skel} />}</div>;
}
