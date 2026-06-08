import { Container } from "@/components/container";
import type { Product } from "@/data/products";

/**
 * The Problem — Server Component. A precise, domain-specific problem statement
 * (no vague benefits). Pulled from products.ts.
 */
export function ProductProblem({ product }: { product: Product }) {
  return (
    <section style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
      <Container className="py-24">
        <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:gap-16">
          <span className="mono-label whitespace-nowrap">§ 01 / The problem</span>
          <div>
            <span
              aria-hidden
              className="mb-8 block h-6 w-px"
              style={{ backgroundColor: "var(--accent)" }}
            />
            <p
              className="max-w-[58ch] text-ink"
              style={{ fontSize: "var(--text-2xl)", lineHeight: 1.4 }}
            >
              {product.problem}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
