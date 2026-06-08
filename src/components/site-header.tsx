import Link from "next/link";
import { Container } from "@/components/container";
import { RegistrationMark } from "@/components/registration-mark";
import { products } from "@/data/products";

/**
 * Site header — Server Component, zero client JS.
 * Wordmark left · product nav center as an "instrument index" (each product
 * tagged by a signature-hue registration mark) · contact CTA right.
 * Sticky, hairline bottom border, full keyboard focus states.
 */
export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{
        borderBottom: "var(--rule-width) solid var(--rule)",
        backgroundColor: "oklch(16% 0.015 255 / 0.82)",
      }}
    >
      <Container className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Wordmark — left */}
        <Link
          href="/"
          className="justify-self-start rounded-[2px] font-mono text-xs uppercase tracking-[0.1em] text-ink whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--cortex)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]"
        >
          Octavius<span className="text-ink-faint"> Logistics</span>
        </Link>

        {/* Instrument index — center */}
        <nav
          aria-label="Instruments"
          className="hidden items-center gap-5 justify-self-center md:flex"
        >
          {products.map((p) => (
            <Link
              key={p.slug}
              href={`/${p.slug}`}
              className="group flex items-center gap-1.5 rounded-[2px] py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--cortex)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]"
            >
              <RegistrationMark
                color={`var(--${p.accentHue})`}
                size={13}
                className="shrink-0"
              />
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-ink-faint transition-colors duration-150 group-hover:text-ink group-focus-visible:text-ink">
                {p.name}
              </span>
            </Link>
          ))}
        </nav>

        {/* Contact CTA — right */}
        <div className="flex items-center justify-end gap-4 justify-self-end">
          <Link
            href="/thesis"
            className="hidden rounded-[2px] font-mono text-[0.625rem] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--cortex)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] sm:inline"
          >
            Thesis
          </Link>
          <Link
            href="/contact"
            className="hairframe inline-flex items-center gap-2 rounded-[2px] px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--cortex)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]"
          >
            Contact
            <span aria-hidden className="text-ink-faint">
              →
            </span>
          </Link>
        </div>
      </Container>
    </header>
  );
}
