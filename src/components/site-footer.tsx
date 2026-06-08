import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/container";
import { RegistrationMark } from "@/components/registration-mark";
import { products } from "@/data/products";

/** One labelled cell of the title block: a mono micro-label over its value. */
function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="p-3" style={{ backgroundColor: "var(--surface-1)" }}>
      <div
        className="font-mono uppercase tracking-[0.1em] text-ink-ghost"
        style={{ fontSize: "0.5625rem" }}
      >
        {label}
      </div>
      <div className="mt-1 font-mono text-[0.6875rem] text-ink-muted">
        {children}
      </div>
    </div>
  );
}

/**
 * Site footer — Server Component.
 * Styled as the title block in the corner of an engineering drawing: a boxed
 * metadata block of hairline-separated cells with mono micro-labels.
 */
export function SiteFooter() {
  return (
    <footer
      className="mt-24"
      style={{ borderTop: "var(--rule-width) solid var(--rule)" }}
    >
      <Container className="py-16">
        <div className="hairframe overflow-hidden rounded-[2px]">
          {/* Upper band — company / instruments / company links */}
          <div
            className="grid gap-px md:grid-cols-[1.5fr_1fr_1fr]"
            style={{ backgroundColor: "var(--rule)" }}
          >
            {/* Company cell */}
            <section
              className="flex flex-col justify-between gap-6 p-6"
              style={{ backgroundColor: "var(--surface-1)" }}
            >
              <div>
                <div className="font-mono text-sm uppercase tracking-[0.1em] text-ink">
                  Octavius Logistics
                </div>
                <p className="mt-2 max-w-[34ch] text-sm text-ink-muted">
                  Instruments for the invisible. We make logistics&rsquo; hidden
                  structure legible.
                </p>
              </div>
              {/* signature-hue legend */}
              <div className="flex items-center gap-3">
                {products.map((p) => (
                  <RegistrationMark
                    key={p.slug}
                    color={`var(--${p.accentHue})`}
                    size={14}
                  />
                ))}
              </div>
            </section>

            {/* Instruments index */}
            <nav
              aria-label="Instruments"
              className="flex flex-col gap-3 p-6"
              style={{ backgroundColor: "var(--surface-1)" }}
            >
              <span
                className="font-mono uppercase tracking-[0.1em] text-ink-ghost"
                style={{ fontSize: "0.5625rem" }}
              >
                Instruments
              </span>
              <ul className="flex flex-col gap-2">
                {products.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/${p.slug}`}
                      className="group flex items-center gap-2 rounded-[2px] text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--cortex)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
                    >
                      <RegistrationMark
                        color={`var(--${p.accentHue})`}
                        size={12}
                        className="shrink-0"
                      />
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Company links + contact */}
            <nav
              aria-label="Company"
              className="flex flex-col gap-3 p-6"
              style={{ backgroundColor: "var(--surface-1)" }}
            >
              <span
                className="font-mono uppercase tracking-[0.1em] text-ink-ghost"
                style={{ fontSize: "0.5625rem" }}
              >
                Company
              </span>
              <ul className="flex flex-col gap-2">
                <li>
                  <Link
                    href="/thesis"
                    className="rounded-[2px] text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--cortex)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
                  >
                    Thesis
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="rounded-[2px] text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--cortex)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
                  >
                    Contact
                  </Link>
                </li>
                <li className="mt-2">
                  <a
                    href="mailto:hello@octaviuslogistics.com"
                    className="rounded-[2px] font-mono text-[0.6875rem] text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--cortex)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
                  >
                    hello@octaviuslogistics.com
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          {/* Lower band — drawing metadata strip */}
          <div
            className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-6"
            style={{
              backgroundColor: "var(--rule)",
              borderTop: "var(--rule-width) solid var(--rule)",
            }}
          >
            <Field label="Title">Site chrome</Field>
            <Field label="Scale">1:1</Field>
            <Field label="Sheet">01 of 01</Field>
            <Field label="Rev">2026.06</Field>
            <Field label="Datum">LAT 0.000 · LON 0.000</Field>
            <Field label="Drawn">Octavius</Field>
          </div>
        </div>

        <p className="mono-label mt-4 text-ink-ghost">
          © 2026 Octavius Logistics · Instruments for the Invisible
        </p>
      </Container>
    </footer>
  );
}
