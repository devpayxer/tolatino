// Canonical public origin for SEO tags, sitemap, robots and OG URLs. Override in
// production via NEXT_PUBLIC_SITE_URL once the custom domain is live; falls back
// to the current Vercel host. No trailing slash.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tolatino.vercel.app').replace(/\/$/, '');
