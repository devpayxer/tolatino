import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';
import { SITE_URL } from '@/lib/site';

// Static route sitemap so the public surfaces are discoverable. Per-business and
// per-event URLs need SSR/prerender (logged in LAUNCH-CHECKLIST) and can be added
// here once that lands.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '/', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/comunidad', priority: 0.9, changeFrequency: 'hourly' as const },
    { path: '/negocios', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/eventos', priority: 0.8, changeFrequency: 'daily' as const },
    { path: '/entrar', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/transporte', priority: 0.3, changeFrequency: 'monthly' as const },
    { path: '/bienes-raices', priority: 0.3, changeFrequency: 'monthly' as const },
    { path: '/autos', priority: 0.3, changeFrequency: 'monthly' as const },
    { path: '/trabajos', priority: 0.3, changeFrequency: 'monthly' as const },
  ];
  return routes.map((r) => ({ url: `${SITE_URL}${r.path}`, changeFrequency: r.changeFrequency, priority: r.priority }));
}
