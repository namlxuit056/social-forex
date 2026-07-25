import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const BASE = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/messages/",
          "/profile",
          "/positions",
          "/journal",
          "/dashboard",
          "/alerts",
          "/mt5",
          "/upgrade-vip",
          "/vi/positions",
          "/vi/journal",
          "/vi/dashboard",
          "/vi/alerts",
          "/vi/mt5",
          "/vi/upgrade-vip",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
