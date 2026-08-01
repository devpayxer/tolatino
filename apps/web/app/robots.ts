import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';
import { SITE_URL } from '@/lib/site';

// Let crawlers in (SEO = free acquisition, per CLAUDE.md). The business dashboard
// is private/app-only, so keep it out of the index.
export default function robots(): MetadataRoute.Robots {
  // En el sitio de PRUEBAS se prohíbe TODO. Sin esto, Google podría indexar la
  // versión de pruebas y mostrarla en resultados junto al sitio real — con datos
  // sembrados y precios que no existen. (2026-07-29)
  if (process.env.NEXT_PUBLIC_TOLATINO_ENV === 'staging') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/negocio', '/negocio/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
