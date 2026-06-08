import { Container } from "@/components/container";

/**
 * Thesis statement — large editorial section, Server Component.
 * DM Sans display scale, generous negative space, a couple of mono
 * coordinate-annotations in the margins. No imagery (CLAUDE.md §3).
 */
export function ThesisStatement() {
  return (
    <section style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
      <Container className="relative py-32 sm:py-40">
        {/* margin coordinate-annotations */}
        <span className="mono-label absolute left-6 top-12 sm:left-8">
          § 01 / Thesis
        </span>
        <span className="mono-label absolute right-6 top-12 text-ink-ghost sm:right-8">
          LAT 0.000 · LON 0.000
        </span>
        <span className="mono-label absolute bottom-12 right-6 text-ink-ghost sm:right-8">
          Fig. 01 / Legibility
        </span>

        <div className="mx-auto max-w-[44rem] text-center">
          <p
            className="font-semibold"
            style={{
              fontSize: "clamp(2.25rem, 5.2vw, 3.5rem)",
              lineHeight: 1.06,
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            Logistics runs on structure no one can see.
          </p>
          <p
            className="mx-auto mt-8 max-w-[34ch] text-ink-muted"
            style={{ fontSize: "clamp(1.125rem, 2vw, 1.375rem)", lineHeight: 1.45 }}
          >
            Cost mechanics, network state, demand, the lifecycle of every unit,
            the logic behind every decision — none of it visible, all of it
            deciding whether a supply chain holds or bleeds.
          </p>
          <p
            className="mt-12 font-semibold"
            style={{
              fontSize: "clamp(2.25rem, 5.2vw, 3.5rem)",
              lineHeight: 1.06,
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            Octavius builds the instruments that make it legible.
          </p>
        </div>
      </Container>
    </section>
  );
}
