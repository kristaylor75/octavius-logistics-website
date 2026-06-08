import { Container } from "@/components/container";

/**
 * Proof of depth — earned authority stated concretely (CLAUDE.md tone: measured,
 * exact, quietly confident). Framed as the reason the instruments are precise.
 * Server Component.
 *
 * NOTE: the secondary facts are SEED placeholders phrased around the real product
 * domains rather than invented hard metrics — replace with verified specifics.
 */
const FACTS: { value: string; label: string }[] = [
  { value: "5", label: "Instruments, one discipline — legibility" },
  { value: "4", label: "Domains: parcel cost, fulfillment, inventory, decisioning" },
  { value: "0", label: "Stock photos. Every figure is measured, not decorated" },
];

export function ProofOfDepth() {
  return (
    <section style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
      <Container className="py-24">
        <div className="grid items-end gap-12 lg:grid-cols-[1fr_24rem] lg:gap-20">
          {/* statement */}
          <div>
            <span className="mono-label">§ 03 / Proof of depth</span>
            <h2
              className="mt-6 max-w-[18ch] font-semibold"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                lineHeight: 1.08,
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              The instruments are precise because the expertise is.
            </h2>
            <p
              className="mt-8 max-w-[58ch] text-ink-muted"
              style={{ fontSize: "var(--text-xl)", lineHeight: 1.5 }}
            >
              Twenty-five years inside logistics operations — pricing carrier
              contracts, auditing parcel invoices line by line, mapping
              fulfillment networks, and tracking inventory across its full
              lifecycle. We have read these systems by hand for decades. The
              instruments encode that judgment; that is why their readings hold.
            </p>
          </div>

          {/* instrument readout — the headline figure plus supporting facts */}
          <div className="hairframe relative rounded-[var(--radius-md)] p-8">
            {/* corner registration ticks */}
            <span
              aria-hidden
              className="absolute right-4 top-4 font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-ink-ghost"
            >
              Fig. 02
            </span>

            <div className="flex items-baseline gap-4">
              <span
                className="font-semibold tabular-nums"
                style={{ fontSize: "5.5rem", lineHeight: 0.9, letterSpacing: "var(--tracking-tight)" }}
              >
                25
              </span>
              <span className="mono-label max-w-[12ch] leading-relaxed">
                Years in logistics operations
              </span>
            </div>

            <ul
              className="mt-8"
              style={{ borderTop: "var(--rule-width) solid var(--rule)" }}
            >
              {FACTS.map((f) => (
                <li
                  key={f.label}
                  className="flex items-baseline gap-4 py-3"
                  style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
                >
                  <span
                    className="font-mono font-medium tabular-nums text-ink"
                    style={{ fontSize: "var(--text-xl)" }}
                  >
                    {f.value}
                  </span>
                  <span className="text-sm text-ink-muted">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
