"use client";

import { useEffect } from "react";
import { trackCalculatorUsed } from "@/lib/analytics/ga4";

/**
 * WebMCP (Web Model Context Protocol) In-Page Agent Bridge
 *
 * Registers structured, read-only client-side tools on `navigator.modelContext`
 * (W3C / Chrome Agentic Browsing specification) so browser-native AI agents
 * (e.g., Gemini in Chrome, Copilot, autonomous shopping assistants) can search
 * verified Israeli deals, calculate $75 customs/VAT, fetch active coupons,
 * and read the current page's structured verdict without brittle DOM scraping.
 */
export default function WebMcpBridge() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    const modelContext =
      (navigator as any).modelContext || (document as any).modelContext;
    if (!modelContext || typeof modelContext.registerTool !== "function") {
      return;
    }

    const registeredCleanups: Array<() => void> = [];

    const safeRegister = (toolDef: {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      execute: (input: any) => Promise<unknown>;
    }) => {
      try {
        const res = modelContext.registerTool(toolDef);
        if (typeof res === "function") {
          registeredCleanups.push(res);
        } else if (res && typeof res.unregister === "function") {
          registeredCleanups.push(() => res.unregister());
        } else if (typeof modelContext.unregisterTool === "function") {
          registeredCleanups.push(() => modelContext.unregisterTool(toolDef.name));
        }
      } catch {
        // Ignore duplicate registration or experimental browser differences
      }
    };

    // Tool 1: Search AliDeals catalog & live AliExpress deals with Israeli customs status
    safeRegister({
      name: "search_israeli_deals",
      description:
        "Search AliDeals Israel for verified AliExpress products, prices in ILS (₪) and USD ($), ratings, and $75 Israeli customs/VAT exemption status.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search keywords in Hebrew or English (e.g. 'mini projector', 'שואב רובוטי')",
          },
          onlyTaxExemptUnder75Usd: {
            type: "boolean",
            description: "If true, return only items priced at or under $75 USD (exempt from 18% Israeli VAT)",
          },
        },
        required: ["query"],
      },
      execute: async (input: { query: string; onlyTaxExemptUnder75Usd?: boolean }) => {
        const q = String(input?.query || "").trim();
        if (!q) {
          return { content: [{ type: "text", text: JSON.stringify({ error: "Missing query" }) }] };
        }
        const res = await fetch(`/api/live-search?q=${encodeURIComponent(q)}&sub_id=webmcp_agent`);
        const data = await res.json();
        let items = Array.isArray(data?.results) ? data.results : [];
        if (input?.onlyTaxExemptUnder75Usd) {
          items = items.filter((i: any) => i.underCustomsLimit);
        }
        const compact = items.slice(0, 10).map((i: any) => ({
          aliId: i.aliId,
          title: i.title,
          priceIls: i.priceIls,
          priceUsd: i.priceUsd,
          rating: i.rating,
          ordersCount: i.ordersCount,
          isTaxExemptIsrael: i.underCustomsLimit,
          dealUrl: `${window.location.origin}/go/${i.aliId}?sub_id=webmcp_agent`,
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ query: q, count: compact.length, results: compact }),
            },
          ],
        };
      },
    });

    // Tool 2: Calculate Israeli $75 Customs & 18% VAT with live exchange rate
    safeRegister({
      name: "calculate_israel_customs",
      description:
        "Calculate whether an AliExpress order price (in USD or ILS) is exempt from Israeli customs and 18% VAT under the $75 threshold using the live USD/ILS rate.",
      inputSchema: {
        type: "object",
        properties: {
          amount: {
            type: "number",
            description: "Order amount before shipping",
          },
          currency: {
            type: "string",
            enum: ["USD", "ILS"],
            description: "Currency of the amount ('USD' or 'ILS')",
          },
        },
        required: ["amount"],
      },
      execute: async (input: { amount: number; currency?: "USD" | "ILS" }) => {
        let rate = 3.65;
        try {
          const r = await fetch("/api/currency").then((res) => res.json());
          if (typeof r?.rate === "number") rate = r.rate;
        } catch {}

        const currency = (input?.currency || "USD").toUpperCase();
        const raw = Number(input?.amount) || 0;
        const priceUsd = currency === "ILS" ? Math.round((raw / rate) * 100) / 100 : raw;
        const priceIls = currency === "USD" ? Math.round(raw * rate * 10) / 10 : raw;
        const isExempt = priceUsd <= 75;
        const isBufferWarning = priceUsd > 73 && priceUsd <= 75;
        const estimatedVatIls = isExempt ? 0 : Math.round(priceIls * 0.18);

        trackCalculatorUsed({
          calculator_name: "israel_customs_vat",
          input_amount: raw,
          currency: currency as "USD" | "ILS",
          is_tax_exempt: isExempt,
          buffer_warning_triggered: isBufferWarning,
          estimated_vat_ils: estimatedVatIls,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                priceUsd,
                priceIls,
                usdToIlsRate: rate,
                thresholdUsd: 75,
                thresholdIls: Math.round(75 * rate),
                isTaxExempt: isExempt,
                exchangeRateBufferWarning: isBufferWarning,
                estimatedVatIls,
                totalEstimatedCostIls: Math.round(priceIls + estimatedVatIls),
              }),
            },
          ],
        };
      },
    });

    // Tool 3: Read Current Page Structured Consumer Verdict (0ms DOM JSON read)
    safeRegister({
      name: "get_current_page_verdict",
      description:
        "Get the structured consumer summary of the currently open AliDeals review, comparison, or guide (price in ILS/USD, pros, cons, EU 220V compatibility, customs status, and markdown endpoint).",
      inputSchema: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        const el = document.getElementById("alideals-agent-context");
        if (el?.textContent) {
          return { content: [{ type: "text", text: el.textContent }] };
        }
        const directAnswer = document.getElementById("geo-direct-answer")?.textContent?.trim() || "";
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                title: document.title,
                url: window.location.href,
                directAnswerSummary: directAnswer,
                llmsIndexUrl: `${window.location.origin}/llms.txt`,
              }),
            },
          ],
        };
      },
    });

    return () => {
      for (const cleanup of registeredCleanups) {
        try {
          cleanup();
        } catch {}
      }
    };
  }, []);

  return null;
}
