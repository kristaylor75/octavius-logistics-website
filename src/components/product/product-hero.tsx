import { Container } from "@/components/container";
import { RegistrationMark } from "@/components/registration-mark";
import { AmbientSignature } from "./ambient-signature";
import type { Product } from "@/data/products";

/**
 * Product hero — Server Component. The product name is set as an instrument
 * label (mono nameplate); the one-line concrete promise is the headline; an
 * ambient signature animates behind, in the product's accent hue.
 */
export function ProductHero({ product }: { product: Product }) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
    >
      <AmbientSignature />
      <Container className="relative py-28 sm:py-36">
        {/* instrument nameplate — name as label */}
        <div
          className="inline-flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-1.5"
          style={{ boxShadow: "inset 0 0 0 var(--rule-width) var(--accent)" }}
        >
          <RegistrationMark color="var(--accent)" size={14} />
          <span
            className="font-mono text-[0.6875rem] uppercase tracking-[0.1em]"
            style={{ color: "var(--accent)" }}
          >
            {product.name}
          </span>
          <span
            aria-hidden
            className="self-stretch"
            style={{ width: "var(--rule-width)", backgroundColor: "var(--accent)", opacity: 0.5 }}
          />
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-faint">
            {product.instrumentType}
          </span>
        </div>

        <h1
          className="mt-8 max-w-[22ch] font-semibold text-balance"
          style={{
            fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
            lineHeight: 1.04,
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          {product.promise}
        </h1>

        <p className="mono-label mt-8">Reads · {product.reads}</p>
      </Container>
    </section>
  );
}
