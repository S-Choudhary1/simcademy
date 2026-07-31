import type { MetadataRoute } from "next";
import { TECHNOLOGIES, CONCEPTS, COMPARISONS } from "@/content/catalog";
import { ARCHITECTURES } from "@/sim/architectures";

const BASE = "https://simcademy.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/playground", "/technologies", "/concepts", "/architectures", "/comparisons", "/about", "/contact", "/terms", "/privacy"];
  const dynamic = [
    ...TECHNOLOGIES.map((t) => `/technologies/${t.slug}`),
    ...CONCEPTS.map((c) => `/concepts/${c.slug}`),
    ...COMPARISONS.map((c) => `/comparisons/${c.slug}`),
    ...ARCHITECTURES.map((a) => `/architectures/${a.slug}`),
  ];
  return [...staticRoutes, ...dynamic].map((path) => ({ url: `${BASE}${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : 0.7 }));
}
