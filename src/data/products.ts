/**
 * Product data for the Octavius portfolio.
 *
 * Each product is an *instrument* (CLAUDE.md §7): describe the hidden quantity it
 * makes legible, not a generic feature list. Copy here is SEED placeholder —
 * concrete promises and steps to be refined with real positioning.
 */

/** The five signature hues. Maps 1:1 to the --{hue} CSS variables in globals.css. */
export type AccentHue =
  | "cortex"
  | "reflex"
  | "imagine"
  | "odyssey"
  | "traderoute";

/** Convenience: the CSS custom-property references for a product's hue set. */
export interface HueTokens {
  base: string;
  vivid: string;
  subtle: string;
}

export interface HowItWorksStep {
  /** Short mono label, e.g. "01" / "INGEST". */
  marker: string;
  title: string;
  description: string;
}

export interface Product {
  /** URL slug — drives /[product] generateStaticParams. */
  slug: string;
  /** Display name. */
  name: string;
  /** Instrument-framing label, e.g. "Reasoning instrument". */
  instrumentType: string;
  /** Signature hue token key. */
  accentHue: AccentHue;
  /** Short, evocative line for cards and the hero eyebrow. */
  tagline: string;
  /** One concrete, measurable promise — what you can now read. */
  promise: string;
  /** The invisible quantity this instrument reveals (CLAUDE.md §7). */
  reads: string;
  /** The problem / what was invisible before. */
  problem: string;
  /** The mechanism, shown not claimed (CLAUDE.md §1: earned, not magic). */
  howItWorks: HowItWorksStep[];
  /** What sets this instrument apart. */
  differentiators: string[];
}

/** Resolve a product's hue token references for inline styling. */
export function hueTokens(hue: AccentHue): HueTokens {
  return {
    base: `var(--${hue})`,
    vivid: `var(--${hue}-vivid)`,
    subtle: `var(--${hue}-subtle)`,
  };
}

export const products: Product[] = [
  {
    slug: "cortex",
    name: "Cortex",
    instrumentType: "Reasoning instrument",
    accentHue: "cortex",
    tagline: "Deterministic-first reasoning",
    promise:
      "Every decision returns with the rule it followed and the inputs it read — auditable end to end.",
    reads: "Decision logic, made auditable.",
    problem:
      "Operational decisions are made by opaque models or buried heuristics. When one is wrong, no one can say why — so no one can trust it or fix it.",
    howItWorks: [
      {
        marker: "01",
        title: "Ground in rules",
        description:
          "Encode the deterministic policy first — the constraints, thresholds, and logic that must always hold.",
      },
      {
        marker: "02",
        title: "Reason within bounds",
        description:
          "Probabilistic inference is consulted only where rules leave genuine ambiguity, never to override them.",
      },
      {
        marker: "03",
        title: "Return the audit",
        description:
          "Each output ships with the path taken: the rule applied, the inputs read, the alternatives ruled out.",
      },
    ],
    differentiators: [
      "Deterministic policy precedes probabilistic inference, by design",
      "Every decision is replayable from its recorded inputs",
      "Explanations are the output, not a bolt-on",
    ],
  },
  {
    slug: "reflex",
    name: "Reflex",
    instrumentType: "Judgment instrument",
    accentHue: "reflex",
    tagline: "Expertise automation",
    promise:
      "Capture an expert's call once; replay that exact judgment across thousands of cases at machine speed.",
    reads: "Encoded operator judgment, at speed.",
    problem:
      "Scarce expertise is a bottleneck. The best operators can only be in one place at a time, and their reasoning leaves with them.",
    howItWorks: [
      {
        marker: "01",
        title: "Observe the expert",
        description:
          "Record the decisions a skilled operator makes and the signals they weigh while making them.",
      },
      {
        marker: "02",
        title: "Encode the judgment",
        description:
          "Distill those calls into a reviewable model of how the expert actually decides — not a black box.",
      },
      {
        marker: "03",
        title: "Replay at scale",
        description:
          "Apply that judgment consistently across the full case volume, flagging the edges for human review.",
      },
    ],
    differentiators: [
      "Scales judgment, not just throughput",
      "Captured decisions stay reviewable and editable",
      "Routes genuine edge cases back to a human",
    ],
  },
  {
    slug: "imagine",
    name: "Imagine",
    instrumentType: "Cost instrument",
    accentHue: "imagine",
    tagline: "Parcel invoice audit & cost optimization",
    promise:
      "Audit every parcel invoice line against contract and service level — recovered margin made visible.",
    reads: "Hidden cost leaks in parcel spend.",
    problem:
      "Carriers bury overcharges where no one audits — DIM rounding, accessorials applied by default, surcharges that trigger on technicalities. Most shippers never review a single invoice, so the leak compounds, parcel after parcel.",
    howItWorks: [
      {
        marker: "01",
        title: "Ingest invoices",
        description:
          "Pull every line item from carrier invoices and normalize them against your negotiated contract.",
      },
      {
        marker: "02",
        title: "Audit each charge",
        description:
          "Check surcharges, dimensional weight, and service guarantees line by line against what was owed.",
      },
      {
        marker: "03",
        title: "Surface the recovery",
        description:
          "Quantify overcharges and service failures as recoverable dollars, with the evidence attached.",
      },
    ],
    differentiators: [
      "Line-level audit, not sampled estimates",
      "Frames findings as recovered margin, with proof",
      "Surfaces optimization, not just refunds",
    ],
  },
  {
    slug: "odyssey",
    name: "Odyssey",
    instrumentType: "Cartographic instrument",
    accentHue: "odyssey",
    tagline: "Fulfillment & demand visualization",
    promise:
      "See fulfillment flow and demand as a living surface — network state legible at a glance.",
    reads: "Network state & demand, as cartography.",
    problem:
      "Demand and fulfillment are tracked in tables and dashboards that obscure shape and movement — you see numbers, not the terrain.",
    howItWorks: [
      {
        marker: "01",
        title: "Plot the network",
        description:
          "Map nodes, lanes, and flow as a navigational chart rather than a list of rows.",
      },
      {
        marker: "02",
        title: "Contour the demand",
        description:
          "Render demand as level curves so density, gradients, and hotspots read instantly.",
      },
      {
        marker: "03",
        title: "Watch it move",
        description:
          "Animate state over time so shifts in demand and fulfillment are visible before they bite.",
      },
    ],
    differentiators: [
      "Cartographic, not tabular — shape over rows",
      "Demand rendered as contour, not guesswork",
      "Reads network state at a glance",
    ],
  },
  {
    slug: "traderoute",
    name: "TradeRoute",
    instrumentType: "Lifecycle instrument",
    accentHue: "traderoute",
    tagline: "Reseller inventory lifecycle",
    promise:
      "Track every unit of reseller inventory through its full lifecycle — stock as it moves through time.",
    reads: "Stock as it moves through its lifecycle.",
    problem:
      "Reseller inventory changes hands and state constantly. Snapshots miss the transitions, so aging, shrink, and stranded stock go unseen until they cost money.",
    howItWorks: [
      {
        marker: "01",
        title: "Track state transitions",
        description:
          "Record each move a unit makes — received, listed, sold, returned — as a timestamped event.",
      },
      {
        marker: "02",
        title: "Build the time-series",
        description:
          "Assemble events into a continuous lifecycle per unit and per cohort, not a single snapshot.",
      },
      {
        marker: "03",
        title: "Read the lifecycle",
        description:
          "Surface aging, velocity, and stranded inventory while there is still time to act on them.",
      },
    ],
    differentiators: [
      "Lifecycle and transitions, not point-in-time snapshots",
      "Per-unit and per-cohort time-series",
      "Surfaces aging and shrink before they settle into loss",
    ],
  },
];

/** All product slugs — used for static generation. */
export const productSlugs = products.map((p) => p.slug);

/** Look up a product by slug (undefined if not found). */
export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
