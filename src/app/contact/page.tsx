import type { Metadata } from "next";
import { Container } from "@/components/container";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to Octavius Logistics about the instruments.",
};

export default function ContactPage() {
  return (
    <>
      <section
        style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
      >
        <Container className="py-24">
          <p className="mono-label mb-6" style={{ color: "var(--odyssey)" }}>
            § 00 / Contact
          </p>
          <h1
            className="max-w-[16ch] font-semibold"
            style={{
              fontSize: "var(--text-6xl)",
              lineHeight: 1.05,
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            Tell us what you need to read.
          </h1>
          <p className="mt-8 max-w-[48ch] text-ink-muted" style={{ fontSize: "var(--text-xl)" }}>
            Whether it&rsquo;s cost leaks, demand shape, decision logic, or
            inventory lifecycle — describe the invisible quantity and we&rsquo;ll
            point you at the right instrument.
          </p>
        </Container>
      </section>

      <section>
        <Container className="py-20">
          <div className="grid gap-px sm:grid-cols-2" style={{ backgroundColor: "var(--rule)" }}>
            <div className="flex flex-col gap-2 p-8" style={{ backgroundColor: "var(--surface-1)" }}>
              <span className="mono-label">Email</span>
              <a
                href="mailto:hello@octaviuslogistics.com"
                className="text-ink transition-colors hover:text-cortex"
                style={{ fontSize: "var(--text-2xl)" }}
              >
                hello@octaviuslogistics.com
              </a>
            </div>
            <div className="flex flex-col gap-2 p-8" style={{ backgroundColor: "var(--surface-1)" }}>
              <span className="mono-label">Datum</span>
              <span className="text-ink" style={{ fontSize: "var(--text-2xl)" }}>
                LAT 0.000 · LON 0.000
              </span>
              <span className="text-sm text-ink-muted">
                Placeholder coordinates — replace with real office / contact data.
              </span>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
