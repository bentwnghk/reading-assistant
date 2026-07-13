import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Auth-gated app routes and APIs should not be indexed.
        userAgent: "*",
        allow: ["/", "/privacy-policy", "/terms-of-service"],
        disallow: [
          "/api/",
          "/vocabulary",
          "/leaderboard",
          "/assignments",
          "/image-viewer",
          "/unsubscribe",
          "/sw.js",
          "/_next/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
