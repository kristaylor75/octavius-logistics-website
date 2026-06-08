/**
 * Demo metadata per product. Plain module so both Server Components (page) and
 * the client demo loader can import it. The actual demo component (a code-split
 * client chunk) is wired in product-demo.tsx, keyed by the same slug.
 */
export interface DemoMeta {
  /** Mono eyebrow after the section number, e.g. "Live audit". */
  eyebrow: string;
  /** Section heading, e.g. "See it on a real invoice". */
  title: string;
}

export const DEMO_META: Record<string, DemoMeta> = {
  imagine: { eyebrow: "Live audit", title: "See it on a real invoice" },
  cortex: { eyebrow: "Decision replay", title: "Trace a real decision" },
  reflex: { eyebrow: "Queue replay", title: "Clear an exception queue" },
  odyssey: { eyebrow: "Live map", title: "Read demand as it moves" },
  traderoute: { eyebrow: "Lifecycle replay", title: "Follow a cohort through time" },
};

export function hasDemo(slug: string): boolean {
  return slug in DEMO_META;
}

export function getDemoMeta(slug: string): DemoMeta | undefined {
  return DEMO_META[slug];
}
