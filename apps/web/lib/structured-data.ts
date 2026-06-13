import { homeFallbackContent } from "./cms-fallback";
import { SITE_URL } from "./site";

/**
 * Schema.org structured data for the landing page (spec 015).
 *
 * Built from the canonical bundled content (`homeFallbackContent`) — the same
 * source the page renders without a CMS token — so the FAQ rich-result data and
 * the on-page FAQ never disagree. Product + FAQPage are the two Google
 * rich-result types the landing qualifies for.
 */
export interface JsonLd {
  "@context": "https://schema.org";
  "@type": string;
  [key: string]: unknown;
}

/** FAQPage rich result from the landing's FAQ section. */
export function faqJsonLd(locale: string): JsonLd {
  const faq = homeFallbackContent(locale).body.find((blok) => blok.component === "faq_section");
  const items = faq?.component === "faq_section" ? faq.items : [];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** Product rich result for the subscription. Price mirrors the advertised entry
 *  point ("from £1.60/day") on the page — consistent, not invented. */
export function productJsonLd(locale: string): JsonLd {
  const hero = homeFallbackContent(locale).body.find((blok) => blok.component === "hero");
  const description =
    hero?.component === "hero" ? hero.subcopy : "Fresh food, tailored to your cat.";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Sorrel fresh cat food",
    brand: { "@type": "Brand", name: "Sorrel" },
    description,
    category: "Pet food",
    url: locale === "en" ? SITE_URL : `${SITE_URL}/${locale}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      price: "1.60",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "1.60",
        priceCurrency: "GBP",
        referenceQuantity: { "@type": "QuantitativeValue", value: "1", unitCode: "DAY" },
      },
      availability: "https://schema.org/InStock",
    },
  };
}
