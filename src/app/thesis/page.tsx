import type { Metadata } from "next";
import { Container } from "@/components/container";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Thesis — Instruments for the Invisible",
  description:
    "Logistics runs on hidden structure. Octavius builds the instruments that make it legible — earned, not magic.",
};

export default function ThesisPage() {
  return (
    <>
      <section
        style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
      >
        <Container className="py-24">
          <p className="mono-label mb-6" style={{ color: "var(--cortex)" }}>
            § 00 / Thesis
          </p>
          <h1
            className="max-w-[18ch] font-semibold"
            style={{
              fontSize: "var(--text-6xl)",
              lineHeight: 1.05,
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            An instrument reveals what was already there.
          </h1>
        </Container>
      </section>

      <section>
        <Container className="py-20">
          <div className="grid gap-12 sm:grid-cols-[auto_1fr] sm:gap-16">
            <span className="mono-label whitespace-nowrap">§ 01 / The hidden structure</span>
            <div className="max-w-[62ch] space-y-6 text-ink-muted" style={{ fontSize: "var(--text-xl)" }}>
              <p>
                Logistics runs on hidden structure: cost mechanics, network
                states, demand signals, inventory lifecycle, decision logic. None
                of it is visible to the naked eye, yet all of it determines
                whether a supply chain is healthy or bleeding.
              </p>
              <p className="text-ink">
                Octavius builds the instruments that make that hidden structure
                legible.
              </p>
              <p>
                The governing metaphor is the instrument — the sextant, the
                theodolite, the oscilloscope, the navigational chart. An
                instrument does not generate the world; it reveals something
                already there with precision and trust.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
        <Container className="py-20">
          <div className="grid gap-12 sm:grid-cols-[auto_1fr] sm:gap-16">
            <span className="mono-label whitespace-nowrap">§ 02 / Earned, not magic</span>
            <div className="max-w-[62ch] space-y-6 text-ink-muted" style={{ fontSize: "var(--text-xl)" }}>
              <p>
                We show the mechanism. We prefer &ldquo;here is the measurement
                and how it was taken&rdquo; over &ldquo;AI does it for you.&rdquo;
                Trust is the product.
              </p>
              <p>
                Legibility is the verb. Our job is to render the invisible
                readable — charts, gauges, contour maps of cost and demand, not
                decoration.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
