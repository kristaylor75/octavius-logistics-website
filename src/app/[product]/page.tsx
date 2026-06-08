import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getProduct, productSlugs } from "@/data/products";
import { ProductHero } from "@/components/product/product-hero";
import { ProductProblem } from "@/components/product/product-problem";
import { ProductDemo } from "@/components/product/product-demo";
import { HowItWorks } from "@/components/product/how-it-works";
import { ProductDifferentiators } from "@/components/product/product-differentiators";
import { ProductCta } from "@/components/product/product-cta";
import { hasDemo, getDemoMeta } from "@/components/product/demo-registry";

// Static generation: pre-render exactly the five product slugs, nothing else.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return productSlugs.map((product) => ({ product }));
}

type ProductParams = { params: Promise<{ product: string }> };

export async function generateMetadata({
  params,
}: ProductParams): Promise<Metadata> {
  const { product: slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name} — ${product.instrumentType}`,
    description: product.promise,
  };
}

export default async function ProductPage({ params }: ProductParams) {
  const { product: slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  // Adopt the product's signature hue throughout via a scoped --accent.
  const hue = product.accentHue;
  const accentScope = {
    "--accent": `var(--${hue})`,
    "--accent-vivid": `var(--${hue}-vivid)`,
    "--accent-subtle": `var(--${hue}-subtle)`,
  } as CSSProperties;

  return (
    <div style={accentScope}>
      <ProductHero product={product} />
      <ProductProblem product={product} />

      {hasDemo(slug) && (
        <section style={{ borderTop: "var(--rule-width) solid var(--rule)" }}>
          <Container className="py-24">
            <div className="mb-10 flex flex-wrap items-baseline gap-x-6 gap-y-3">
              <span className="mono-label whitespace-nowrap">
                § 02 / {getDemoMeta(slug)?.eyebrow}
              </span>
              <h2
                className="font-semibold"
                style={{
                  fontSize: "var(--text-3xl)",
                  letterSpacing: "var(--tracking-tight)",
                }}
              >
                {getDemoMeta(slug)?.title}
              </h2>
            </div>
            <ProductDemo slug={slug} />
          </Container>
        </section>
      )}

      <HowItWorks steps={product.howItWorks} />
      <ProductDifferentiators product={product} />
      <ProductCta product={product} />
    </div>
  );
}
