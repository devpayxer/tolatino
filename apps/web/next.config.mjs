/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export → deployable to Cloudflare Pages (free tier) as plain files.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
