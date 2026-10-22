import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { listPublicToilets } from "@/lib/db/toilets";
import { SITE_ORIGIN, toiletPageUrl } from "@/lib/toilet-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_ORIGIN,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  try {
    await connection();
    const toilets = await listPublicToilets();
    for (const toilet of toilets) {
      if (toilet.status !== "confirmat") continue;
      entries.push({
        url: toiletPageUrl(toilet.id),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    // Harta rămâne în sitemap chiar dacă baza nu răspunde.
  }

  return entries;
}
