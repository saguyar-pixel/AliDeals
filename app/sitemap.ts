import { MetadataRoute } from "next";
import { supabaseDb, PageRecord } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";

  let allPages: PageRecord[] = [];
  try {
    allPages = await supabaseDb.getPages();
  } catch (err) {
    console.warn("Sitemap DB query error:", err);
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/accessibility`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Zero ghost pages in sitemap: only published pages
  const publishedPages = allPages.filter((p) => p.status === "published");

  const dynamicRoutes: MetadataRoute.Sitemap = publishedPages.map((page) => {
    let routePath = `reviews/${page.slug}`;
    if (page.type === "top5") {
      routePath = `top5/${page.slug}`;
    } else if (page.type === "deal") {
      routePath = `deals/${page.slug}`;
    }

    return {
      url: `${baseUrl}/${routePath}`,
      lastModified: new Date(page.updatedAt || Date.now()),
      changeFrequency: page.type === "deal" ? "daily" : "weekly",
      priority: page.type === "top5" ? 0.9 : page.type === "review" ? 0.85 : 0.7,
    };
  });

  return [...staticRoutes, ...dynamicRoutes];
}
