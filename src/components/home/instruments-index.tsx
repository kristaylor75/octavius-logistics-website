import type { CSSProperties } from "react";
import Link from "next/link";
import { Container } from "@/components/container";
import { RegistrationMark } from "@/components/registration-mark";
import { products } from "@/data/products";

/**
 * Instruments index — the five products as rows in a technical register, not a
 * card grid (CLAUDE.md §3). Reads like the contents page of a precision-
 * instrument catalog. Server Component; hover behaviour is pure CSS.
 *
 * Each row carries its signature hue via CSS custom properties (--rh / --rh-vivid)
 * so a single set of group-hover utilities can "raise" that hue.
 */
export function InstrumentsIndex() {
  return (
    <section style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
      <Container className="py-24">
        <div className="mb-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <span className="mono-label whitespace-nowrap">
              § 02 / Instruments index
            </span>
            <h2
              className="font-semibold"
              style={{
                fontSize: "var(--text-4xl)",
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              The register
            </h2>
          </div>
          <span className="mono-label text-ink-ghost">05 entries · scale 1:1</span>
        </div>

        {/* column captions */}
        <div
          className="hidden grid-cols-[2.5rem_2rem_15rem_1fr_2.5rem] items-center gap-6 pb-3 md:grid"
          style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
        >
          <span className="mono-label">No.</span>
          <span aria-hidden />
          <span className="mono-label">Instrument</span>
          <span className="mono-label">Promise</span>
          <span aria-hidden />
        </div>

        <ul>
          {products.map((p, i) => (
            <li
              key={p.slug}
              style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
            >
              <Link
                href={`/${p.slug}`}
                aria-label={`${p.name} — ${p.instrumentType}: ${p.promise}`}
                className="group relative flex flex-col gap-3 py-6 pl-4 transition-colors md:grid md:grid-cols-[2.5rem_2rem_15rem_1fr_2.5rem] md:items-center md:gap-6 md:py-7 group-hover:[background-color:color-mix(in_oklab,var(--rh)_7%,transparent)] md:[&:hover]:[background-color:color-mix(in_oklab,var(--rh)_7%,transparent)]"
                style={
                  {
                    "--rh": `var(--${p.accentHue})`,
                    "--rh-vivid": `var(--${p.accentHue}-vivid)`,
                  } as CSSProperties
                }
              >
                {/* left accent bar — plots in on hover */}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 top-0 w-[2px] origin-top scale-y-0 transition-transform duration-300 [transition-timing-function:var(--ease-instrument)] group-hover:scale-y-100"
                  style={{ backgroundColor: "var(--rh)" }}
                />

                {/* index + registration mark (flatten into the grid on md) */}
                <div className="flex items-center gap-4 md:contents">
                  <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-ghost md:self-center md:justify-self-start">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="text-[color:var(--rh)] transition-colors duration-300 group-hover:text-[color:var(--rh-vivid)] md:justify-self-start"
                    style={{ lineHeight: 0 }}
                  >
                    <RegistrationMark color="currentColor" size={16} />
                  </span>
                </div>

                {/* name + instrument-type */}
                <div className="min-w-0">
                  <h3
                    className="font-semibold"
                    style={{ fontSize: "var(--text-2xl)" }}
                  >
                    {p.name}
                  </h3>
                  <span className="mono-label">{p.instrumentType}</span>
                </div>

                {/* one-line promise */}
                <p className="min-w-0 text-ink-muted transition-colors duration-300 group-hover:text-ink md:line-clamp-2">
                  {p.promise}
                </p>

                {/* view affordance */}
                <span className="hidden font-mono text-sm text-ink-faint transition-colors duration-300 group-hover:text-[color:var(--rh-vivid)] md:inline md:justify-self-end">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
