import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "@/constants/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route || "/"}`,
    lastModified,
    changeFrequency: route === "" ? "weekly" : "yearly",
    priority: route === "" ? 1 : 0.3,
  }));
}
