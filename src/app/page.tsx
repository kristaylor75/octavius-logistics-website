import nextDynamic from "next/dynamic";
import { ThesisStatement } from "@/components/home/thesis-statement";
import { InstrumentsIndex } from "@/components/home/instruments-index";
import { ProofOfDepth } from "@/components/home/proof-of-depth";
import { HomeCta } from "@/components/home/home-cta";
import { products } from "@/data/products";

// Interactive hero — lazy-loaded (code-split) but still server-rendered so the
// static diagram is the legible fallback before/without JS.
const InstrumentConstellation = nextDynamic(
  () => import("@/components/hero/instrument-constellation"),
);

// Marketing pages are statically generated.
export const dynamic = "force-static";

const heroNodes = products.map((p) => ({
  slug: p.slug,
  name: p.name,
  reads: p.reads,
  hue: p.accentHue,
}));

export default function Home() {
  return (
    <>
      <InstrumentConstellation
        nodes={heroNodes}
        headline="We build the instruments that make logistics' invisible structure legible."
      />

      <ThesisStatement />
      <InstrumentsIndex />
      <ProofOfDepth />
      <HomeCta />
    </>
  );
}
