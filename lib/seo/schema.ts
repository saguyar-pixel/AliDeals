export interface SchemaProductInput {
  name: string;
  description: string;
  image: string;
  sku: string;
  price: number;
  priceCurrency?: string;
  ratingValue: number;
  reviewCount: number;
  url: string;
}

export function generateProductJsonLd(input: SchemaProductInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.image,
    sku: input.sku,
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: input.priceCurrency || "USD",
      price: input.price,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "AliExpress",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: input.ratingValue,
      reviewCount: input.reviewCount || 10,
      bestRating: 5,
      worstRating: 1,
    },
  };
}

export function generateFaqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function generateItemListJsonLd(
  items: Array<{ name: string; url: string; image: string; position: number }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      name: item.name,
      url: item.url,
      image: item.image,
    })),
  };
}

export function generateBreadcrumbJsonLd(
  crumbs: Array<{ name: string; item: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: c.name,
      item: c.item,
    })),
  };
}
