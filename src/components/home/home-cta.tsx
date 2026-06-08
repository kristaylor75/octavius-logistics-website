import Link from "next/link";
import { Container } from "@/components/container";

/**
 * Home CTA — a single, clear invitation styled as an instrument control rather
 * than a generic gradient button (CLAUDE.md §3). Server Component.
 */
export function HomeCta() {
  return (
    <section style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
      <Container className="py-24">
        <div className="hairframe relative overflow-hidden rounded-[var(--radius-md)] px-8 py-16 sm:px-16">
          {/* corner registration marks */}
          {(
            [
              "left-4 top-4",
              "right-4 top-4",
              "left-4 bottom-4",
              "right-4 bottom-4",
            ] as const
          ).map((pos) => (
            <span
              key={pos}
              aria-hidden
              className={`pointer-events-none absolute ${pos} h-3 w-3`}
              style={{
                backgroundImage:
                  "linear-gradient(var(--rule-strong), var(--rule-strong)), linear-gradient(var(--rule-strong), var(--rule-strong))",
                backgroundSize: "100% var(--rule-width), var(--rule-width) 100%",
                backgroundPosition: "center, center",
                backgroundRepeat: "no-repeat",
              }}
            />
          ))}

          <div className="relative mx-auto max-w-[44ch] text-center">
            <span className="mono-label">§ 04 / Request access</span>
            <h2
              className="mt-6 font-semibold"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                lineHeight: 1.08,
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              See what your supply chain has been hiding.
            </h2>
            <p className="mx-auto mt-6 max-w-[40ch] text-ink-muted">
              Tell us the quantity you need to read. We&rsquo;ll point you at the
              instrument and get you access.
            </p>

            {/* the control */}
            <div className="mt-10 flex justify-center">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-3 rounded-[var(--radius-sm)] px-6 py-3 transition-colors duration-300 [transition-timing-function:var(--ease-instrument)] hover:bg-cortex focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--cortex)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]"
                style={{
                  boxShadow: "inset 0 0 0 var(--rule-width) var(--cortex)",
                }}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full transition-colors duration-300 group-hover:bg-bg"
                  style={{ backgroundColor: "var(--cortex)" }}
                />
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink transition-colors duration-300 group-hover:text-bg">
                  Request access
                </span>
                <span className="font-mono text-xs text-ink-faint transition-colors duration-300 group-hover:text-bg">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
