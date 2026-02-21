// =============================================================
// sitemap.xml — Dynamic sitemap for SEO
// Lists all public pages + published agent detail pages
// =============================================================

import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env.mjs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/agents`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Dynamic agent pages
  const agents = await db.agent.findMany({
    where: { status: "APPROVED", isPublished: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const agentPages: MetadataRoute.Sitemap = agents.map((agent: { slug: string; updatedAt: Date }) => ({
    url: `${baseUrl}/agents/${agent.slug}`,
    lastModified: agent.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...agentPages];
}
