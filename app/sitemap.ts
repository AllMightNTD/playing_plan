import type { MetadataRoute } from "next";
import { getAllPublishedPlaces } from "@/server/services/user/places.service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://datemate.vn";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/match`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/memories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  try {
    const places = await getAllPublishedPlaces();
    const placeRoutes: MetadataRoute.Sitemap = places.map((place) => ({
      url: `${baseUrl}/places/${place.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: place.tier === "A" ? 0.9 : 0.7,
    }));

    return [...staticRoutes, ...placeRoutes];
  } catch {
    return staticRoutes;
  }
}
