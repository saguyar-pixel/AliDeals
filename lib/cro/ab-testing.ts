"use client";

import { useState, useEffect } from "react";

export type CtaVariantId = "direct" | "check" | "urgency";

export interface CtaVariant {
  id: CtaVariantId;
  labelHe: string;
  subTextHe: string;
  descriptionHe: string;
}

export const CTA_VARIANTS: Record<CtaVariantId, CtaVariant> = {
  direct: {
    id: "direct",
    labelHe: "לרכישה במחיר המבצע באלי אקספרס",
    subTextHe: "מעבר ישיר לעמוד המוצר המקורי",
    descriptionHe: "נוסח ישיר וממוקד מחיר מבצע",
  },
  check: {
    id: "check",
    labelHe: "בדוק זמינות ומחיר עדכני באלי אקספרס",
    subTextHe: "בדיקת מלאי ומשלוח לישראל בזמן אמת",
    descriptionHe: "נוסח מבוסס סקרנות ובדיקת מלאי",
  },
  urgency: {
    id: "urgency",
    labelHe: "קנה עכשיו עם פטור ממכס ומשלוח מבוטח",
    subTextHe: "משלוח רשמי AliExpress Standard",
    descriptionHe: "נוסח ביטחון ישראלי (פטור ממכס ומשלוח)",
  },
};

const STORAGE_KEY = "alideals_cta_variant_v1";

/**
 * Client-side React hook to deterministically assign and retrieve CTA variant
 */
export function useCtaVariant(): {
  variantId: CtaVariantId;
  variant: CtaVariant;
} {
  const [variantId, setVariantId] = useState<CtaVariantId>("direct");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let saved = localStorage.getItem(STORAGE_KEY) as CtaVariantId | null;
    if (!saved || !CTA_VARIANTS[saved]) {
      // 33% / 33% / 33% split
      const rand = Math.random();
      if (rand < 0.33) saved = "direct";
      else if (rand < 0.66) saved = "check";
      else saved = "urgency";

      try {
        localStorage.setItem(STORAGE_KEY, saved);
      } catch {}
    }

    setVariantId(saved);
  }, []);

  return {
    variantId,
    variant: CTA_VARIANTS[variantId],
  };
}
