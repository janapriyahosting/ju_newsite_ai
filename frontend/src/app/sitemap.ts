import { MetadataRoute } from 'next';

const API = 'http://173.168.0.81:8000/api/v1';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE = 'http://173.168.0.81:3000';
  
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/store`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/projects`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];
  
  try {
    // Only include available units in sitemap
    const units = await fetch(`${API}/units?status=available&page_size=200`).then(r => r.json());
    const unitPages: MetadataRoute.Sitemap = (units.items || []).map((u: any) => ({
      url: `${BASE}/units/${u.id}`,
      lastModified: new Date(u.updated_at || u.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Only include active projects
    const projects = await fetch(`${API}/projects`).then(r => r.json());
    const projectPages: MetadataRoute.Sitemap = ((projects.items || projects) as any[])
      .filter((p: any) => p.is_active)
      .map((p: any) => ({
        url: `${BASE}/projects/${p.id}`,
        lastModified: new Date(p.updated_at || p.created_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));

    return [...staticPages, ...projectPages, ...unitPages];
  } catch {
    return staticPages;
  }
}
