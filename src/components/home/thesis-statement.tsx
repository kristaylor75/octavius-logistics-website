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
        <span className="mono-label absolute right-6 top-12 text-ink-faint sm:right-8">
          LAT 0.000 · LON 0.000
        </span>
        <span className="mono-label absolute bottom-12 right-6 text-ink-faint sm:right-8">
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
            The money leaks where no one is looking.
          </p>
          <p
            className="mx-auto mt-8 max-w-[40ch] text-ink-muted"
            style={{ fontSize: "clamp(1.125rem, 2vw, 1.375rem)", lineHeight: 1.45 }}
          >
            Overcharges no one audits. Stock that ages out of value. Demand you
            see a week too late. The structure that decides whether a supply
            chain holds or bleeds is invisible — and every blind spot has a
            price.
          </p>
          <p
            className="mt-12 font-semibold"
            style={{
              fontSize: "clamp(2.25rem, 5.2vw, 3.5rem)",
              lineHeight: 1.06,
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            Octavius makes it readable — and the leak recoverable.
          </p>
        </div>
      </Container>
    </section>
  );
}
