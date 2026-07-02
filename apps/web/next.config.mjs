// GITHUB_PAGES=true → serve under /tolatino (GitHub Pages live preview).
// Cloudflare Pages (production target) serves from the root, no basePath.
const onGitHubPages = process.env.GITHUB_PAGES === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export → deployable to Cloudflare Pages (free tier) as plain files.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: onGitHubPages ? '/tolatino' : '',
};

export default nextConfig;
