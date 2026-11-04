
import type { MetadataRoute } from "next";
import { TECHNOLOGIES, CONCEPTS, COMPARISONS } from "@/content/catalog";
import { ARCHITECTURES } from "@/sim/architectures";

const BASE = "https://simcademy.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/playground",
    "/technologies",
    "/concepts",
    "/architectures",
    "/comparisons",
    "/about",
    "/contact",
    "/terms",
    "/privacy",
  ];

  const dynamic = [
    ...TECHNOLOGIES.map((t) => `/technologies/${t.slug}`),
    ...CONCEPTS.map((c) => `/concepts/${c.slug}`),
    ...COMPARISONS.map((c) => `/comparisons/${c.slug}`),
    ...ARCHITECTURES.map((a) => `/architectures/${a.slug}`),
  ];

  // Remove duplicate routes
  const allRoutes = [...new Set([...staticRoutes, ...dynamic])];

  return allRoutes.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.7,
  }));
}
