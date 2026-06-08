import { Container } from "@/components/container";
import type { Product } from "@/data/products";

/**
 * Differentiators — Server Component. What makes this instrument unlike generic
 * competitors. Pulled from products.ts.
 */
export function ProductDifferentiators({ product }: { product: Product }) {
  return (
    <section style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
      <Container className="py-24">
        <div className="mb-10 flex flex-wrap items-baseline gap-x-6 gap-y-3">
          <span className="mono-label whitespace-nowrap">
            § 04 / What sets it apart
          </span>
          <h2
            className="max-w-[22ch] font-semibold"
            style={{ fontSize: "var(--text-3xl)", letterSpacing: "var(--tracking-tight)" }}
          >
            Not a generic tool with {product.name} painted on.
          </h2>
        </div>

        <ul style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
          {product.differentiators.map((d, i) => (
            <li
              key={d}
              className="grid grid-cols-[auto_1fr] items-start gap-5 py-5"
              style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
            >
              <span className="flex items-center gap-3 pt-1">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-ghost">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--accent)" }}
                />
              </span>
              <span className="text-ink" style={{ fontSize: "var(--text-xl)" }}>
                {d}
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
