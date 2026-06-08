import Link from "next/link";
import { Container } from "@/components/container";
import type { Product } from "@/data/products";

/**
 * Product CTA — Server Component. A single invitation styled as an instrument
 * control in the product's accent hue (no gradient button).
 */
export function ProductCta({ product }: { product: Product }) {
  return (
    <section style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
      <Container className="py-24">
        <div className="hairframe relative overflow-hidden rounded-[var(--radius-md)] px-8 py-16 sm:px-16">
          {/* corner registration marks */}
          {(
            ["left-4 top-4", "right-4 top-4", "left-4 bottom-4", "right-4 bottom-4"] as const
          ).map((pos) => (
            <span
              key={pos}
              aria-hidden
              className={`pointer-events-none absolute ${pos} h-3 w-3`}
              style={{
                backgroundImage:
                  "linear-gradient(var(--accent), var(--accent)), linear-gradient(var(--accent), var(--accent))",
                backgroundSize: "100% var(--rule-width), var(--rule-width) 100%",
                backgroundPosition: "center, center",
                backgroundRepeat: "no-repeat",
                opacity: 0.7,
              }}
            />
          ))}

          <div className="relative mx-auto max-w-[46ch] text-center">
            <span className="mono-label">§ 05 / Request access</span>
            <h2
              className="mt-6 font-semibold text-balance"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                lineHeight: 1.08,
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              Put {product.name} on your numbers.
            </h2>
            <p className="mx-auto mt-6 max-w-[42ch] text-ink-muted">
              {product.reads} See it on your own data — we&rsquo;ll get you
              access.
            </p>

            <div className="mt-10 flex justify-center">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-3 rounded-[var(--radius-sm)] px-6 py-3 transition-colors duration-300 [transition-timing-function:var(--ease-instrument)] hover:[background-color:var(--accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]"
                style={{
                  boxShadow: "inset 0 0 0 var(--rule-width) var(--accent)",
                }}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full transition-colors duration-300 group-hover:bg-bg"
                  style={{ backgroundColor: "var(--accent)" }}
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
