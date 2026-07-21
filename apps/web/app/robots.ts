import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';
import { SITE_URL } from '@/lib/site';

// Let crawlers in (SEO = free acquisition, per CLAUDE.md). The business dashboard
// is private/app-only, so keep it out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/negocio', '/negocio/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
