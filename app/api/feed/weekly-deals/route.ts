import { NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * RSS-to-Email Feed for Brevo & Automated Weekly Campaigns
 * Generates valid RSS 2.0 XML with the top 10 products of the week,
 * verified affiliate links, and sub_id=email_newsletter tracking.
 */
export async function GET() {
  try {
    const products = await supabaseDb.getProducts();

    // Select top 10 active products sorted by rating and orders count
    const topProducts = products
      .filter((p) => p.status !== "inactive")
      .sort((a, b) => {
        const scoreA = (a.rating || 4.5) * 1000 + (a.ordersCount || 0);
        const scoreB = (b.rating || 4.5) * 1000 + (b.ordersCount || 0);
        return scoreB - scoreA;
      })
      .slice(0, 10);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";
    const nowRfc822 = new Date().toUTCString();

    const rssItems = topProducts
      .map((p) => {
        const title = (p.titleHe || p.originalTitle || "דיל באלי אקספרס").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const description = (p.descriptionHe || p.originalTitle || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        
        let affiliateUrl = p.affiliateUrl || p.aliUrl || `${siteUrl}/go/${p.aliId || p.id}`;
        const separator = affiliateUrl.includes("?") ? "&" : "?";
        if (!affiliateUrl.includes("sub_id=")) {
          affiliateUrl = `${affiliateUrl}${separator}sub_id=email_newsletter`;
        }

        const pubDate = p.updatedAt ? new Date(p.updatedAt).toUTCString() : nowRfc822;
        const mainImage = p.mainImage || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800";

        return `
    <item>
      <title><![CDATA[${title} - רק ₪${p.priceIls} ($${p.priceUsd})]]></title>
      <link>${affiliateUrl}</link>
      <guid isPermaLink="false">alideals-${p.aliId || p.id}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[
        <p><img src="${mainImage}" alt="${title}" style="max-width: 100%; height: auto; border-radius: 8px;" /></p>
        <p>${description}</p>
        <p><strong>מחיר מבצע:</strong> ₪${p.priceIls} ($${p.priceUsd}) | <strong>דירוג:</strong> ⭐ ${p.rating} (${p.ordersCount}+ הזמנות)</p>
        <p><a href="${affiliateUrl}" style="background-color: #ea580c; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">לרכישה באלי אקספרס &larr;</a></p>
      ]]></description>
      <enclosure url="${mainImage}" length="0" type="image/jpeg" />
      <category><![CDATA[${p.category || "דילים"}]]></category>
    </item>`;
      })
      .join("\n");

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AliDeals - 10 הדילים השבועיים הטובים ביותר באלי אקספרס</title>
    <link>${siteUrl}</link>
    <description>פיד הדילים השבועי הרשמי של AliDeals ישראל. המוצרים הנמכרים ביותר עם תאימות לישראל ופטור ממכס.</description>
    <language>he</language>
    <lastBuildDate>${nowRfc822}</lastBuildDate>
    <atom:link href="${siteUrl}/api/feed/weekly-deals" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

    return new Response(rssXml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: any) {
    console.error("[RSS Feed] Generation error:", err);
    return new Response("<error>Failed to generate weekly deals feed</error>", {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
