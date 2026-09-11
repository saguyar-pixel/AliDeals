"use client";

import { ShoppingCart } from "lucide-react";
import { useCtaVariant } from "@/lib/cro/ab-testing";

interface PurchaseCtaButtonProps {
  productId: string;
  productTitle: string;
  priceUsd: number;
  priceIls: number;
  pageSlug?: string;
  source?: string;
  className?: string;
  fallbackUrl?: string;
}

export default function PurchaseCtaButton({
  productId,
  productTitle,
  priceUsd,
  priceIls,
  pageSlug = "unknown",
  source = "product_review_cta",
  className = "",
  fallbackUrl,
}: PurchaseCtaButtonProps) {
  const { variantId, variant } = useCtaVariant();

  // Internal cloaked redirect URL with standardized SubID and CTA variant
  const outboundUrl = `/go/${productId}?sub_id=${encodeURIComponent(source)}&cta=${encodeURIComponent(variantId)}&page=${encodeURIComponent(pageSlug)}`;

  const handleClick = () => {
    if (typeof window !== "undefined" && window.trackAliExpressClick) {
      window.trackAliExpressClick({
        productId,
        productTitle,
        priceUsd,
        priceIls,
        linkType: `cta_${variantId}`,
        destinationUrl: outboundUrl,
      });
    }
  };

  return (
    <a
      href={outboundUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={handleClick}
      data-affiliate="true"
      data-product-id={productId}
      data-product-title={productTitle}
      data-price-usd={priceUsd}
      data-price-ils={priceIls}
      data-cta-variant={variantId}
      className={
        className ||
        "w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white font-bold text-base shadow-lg shadow-ali-500/25 hover:shadow-ali-500/40 transition-all hover:scale-[1.01] active:scale-[0.99]"
      }
    >
      <ShoppingCart className="w-5 h-5 shrink-0" />
      <span>{variant.labelHe}</span>
    </a>
  );
}
