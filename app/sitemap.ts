import { MetadataRoute } from "next";
import { getProjectsData } from "@/services/projects";
import { routing } from "@/i18n/routing";

export const revalidate = 86400; // Revalidate sitemap daily

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.DOMAIN || "https://satriabahari.my.id").replace(/\/+$/, "");
  const staticPaths = ["", "/about", "/projects", "/dashboard", "/chat", "/contact", "/smart-talk"];

  const routes: MetadataRoute.Sitemap = [];

  // Static routes for each locale
  for (const locale of routing.locales) {
    for (const path of staticPaths) {
      routes.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: path === "" ? "daily" : "weekly",
        priority: path === "" ? 1.0 : 0.8,
      });
    }
  }

  // Dynamic project routes
  try {
    const projects = await getProjectsData();
    for (const project of projects) {
      if (!project.slug) continue;
      for (const locale of routing.locales) {
        routes.push({
          url: `${baseUrl}/${locale}/projects/${project.slug}`,
          lastModified: project.updated_at ? new Date(project.updated_at) : new Date(),
          changeFrequency: "weekly",
          priority: project.is_featured ? 0.9 : 0.7,
        });
      }
    }
  } catch (err) {
    console.error("[sitemap] Failed fetching projects for sitemap:", err);
  }

  return routes;
}
