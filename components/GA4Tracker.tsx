"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    trackAliExpressClick?: (params: {
      productId?: string;
      productTitle?: string;
      priceUsd?: number;
      priceIls?: number;
      linkType?: string;
      destinationUrl?: string;
    }) => void;
  }
}

export default function GA4Tracker() {
  const [activeGaId, setActiveGaId] = useState<string>(process.env.NEXT_PUBLIC_GA_ID || "");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Check for dynamic GA4 ID saved via CMS Settings if not in env
  useEffect(() => {
    if (!activeGaId) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data?.settings?.gaMeasurementId) {
            setActiveGaId(data.settings.gaMeasurementId);
          }
        })
        .catch(() => {});
    }
  }, [activeGaId]);

  // 2. Track Route Changes
  useEffect(() => {
    if (!activeGaId || typeof window === "undefined") return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    if (window.gtag) {
      window.gtag("config", activeGaId, {
        page_path: url,
      });
    }
  }, [pathname, searchParams, activeGaId]);

  // 3. Setup Universal Click Listener & Expose Global Tracker
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Global explicit tracker function
    window.trackAliExpressClick = (params) => {
      const {
        productId = "unknown",
        productTitle = document.title,
        priceUsd = 0,
        priceIls = priceUsd * 3.65,
        linkType = "cta_button",
        destinationUrl = "",
      } = params;

      const estimatedCommissionUsd = Math.round(priceUsd * 0.08 * 100) / 100;

      // 1. Send MAIN CONVERSION EVENT to GA4
      if (window.gtag) {
        window.gtag("event", "click_out_to_aliexpress", {
          event_category: "Affiliate Outbound",
          product_id: productId,
          product_name: productTitle,
          product_price_usd: priceUsd,
          product_price_ils: priceIls,
          link_type: linkType,
          page_path: window.location.pathname,
          destination_url: destinationUrl,
          currency: "USD",
          value: estimatedCommissionUsd, // Revenue value for GA4 conversion attribution!
        });
      }

      // 2. Send to Internal Analytics DB for Dana's RPC Engine
      const payload = JSON.stringify({
        productId,
        productTitle,
        priceUsd,
        priceIls,
        pageSlug: window.location.pathname.replace(/^\/reviews\/|^\/top5\//, "") || "home",
        linkType,
        destinationUrl,
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/analytics/track-click", blob);
      } else {
        fetch("/api/analytics/track-click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    // Universal Document Click Interceptor
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Find closest anchor tag
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.href || "";
      const isAffiliateLink =
        href.includes("aliexpress.com") ||
        href.includes("s.click.aliexpress.com") ||
        href.includes("/go/") ||
        href.includes("ali-deals.co.il/go/") ||
        href.includes("ali-deals.co.il/r/") ||
        anchor.getAttribute("data-affiliate") === "true";

      if (!isAffiliateLink) return;

      // Detect Link Type
      let linkType: "sticky_bar" | "image" | "cta_button" | "table_row" | "text_link" = "text_link";
      if (anchor.closest("[data-sticky-bar]") || anchor.classList.contains("sticky") || anchor.closest(".fixed")) {
        linkType = "sticky_bar";
      } else if (target.tagName === "IMG" || anchor.querySelector("img") || anchor.classList.contains("aspect-video")) {
        linkType = "image";
      } else if (
        anchor.closest("table") ||
        anchor.closest("[data-table-row]") ||
        anchor.parentElement?.tagName === "TD"
      ) {
        linkType = "table_row";
      } else if (
        anchor.classList.contains("btn") ||
        anchor.innerText.includes("רכישה") ||
        anchor.innerText.includes("קנייה") ||
        anchor.innerText.includes("מבצע") ||
        anchor.querySelector("svg")
      ) {
        linkType = "cta_button";
      }

      // Extract item ID (supports /go/[id] and AliExpress standard URLs)
      const goIdMatch = href.match(/\/go\/([a-zA-Z0-9_-]+)/);
      const aliIdMatch = href.match(/\/item\/(\d+)\.html/) || href.match(/item[=/](\d+)/);
      const productId =
        anchor.getAttribute("data-product-id") ||
        anchor.getAttribute("data-ali-id") ||
        (goIdMatch ? goIdMatch[1] : (aliIdMatch ? aliIdMatch[1] : "affiliate_item"));

      const productTitle =
        anchor.getAttribute("data-product-title") ||
        anchor.getAttribute("title") ||
        anchor.querySelector("img")?.alt ||
        (anchor.innerText.trim().length > 3 && anchor.innerText.trim().length < 80 ? anchor.innerText.trim() : document.title);

      const priceUsd = parseFloat(anchor.getAttribute("data-price-usd") || "0") || 0;
      const priceIls = parseFloat(anchor.getAttribute("data-price-ils") || "0") || priceUsd * 3.65;

      window.trackAliExpressClick?.({
        productId,
        productTitle,
        priceUsd,
        priceIls,
        linkType,
        destinationUrl: href,
      });
    };

    document.addEventListener("click", handleGlobalClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleGlobalClick, { capture: true });
    };
  }, []);

  if (!activeGaId) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${activeGaId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${activeGaId}', {
              page_path: window.location.pathname,
              send_page_view: true
            });
          `,
        }}
      />
    </>
  );
}
