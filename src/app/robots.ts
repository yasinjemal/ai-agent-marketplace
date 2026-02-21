// =============================================================
// robots.txt — Search engine crawling rules
// =============================================================

import type { MetadataRoute } from "next";
import { env } from "@/lib/env.mjs";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/agents", "/agents/*", "/pricing"],
        disallow: [
          "/dashboard/",
          "/admin/",
          "/onboarding",
          "/api/",
          "/sign-in",
          "/sign-up",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
