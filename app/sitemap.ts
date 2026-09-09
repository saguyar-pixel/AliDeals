import { MetadataRoute } from "next";
import { jsonDb, PageRecord } from "@/lib/db";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";

  let allPages: PageRecord[] = [];
  try {
    allPages = jsonDb.getPages();
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
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/accessibility`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = allPages.map((page) => ({
    url: `${baseUrl}/${page.type === "top5" ? "top5" : "reviews"}/${page.slug}`,
    lastModified: new Date(page.updatedAt),
    changeFrequency: page.type === "deal" ? "daily" : "weekly",
    priority: page.type === "review" ? 0.9 : 0.8,
  }));

  return [...staticRoutes, ...dynamicRoutes];
}
