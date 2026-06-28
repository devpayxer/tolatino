/** @type {import('next').NextConfig} */

// When building for GitHub Pages (a project page served under /tolatino/),
// the workflow sets GITHUB_PAGES=true so we emit the right base path + static export.
// Local `pnpm dev` / `pnpm build` are unaffected (no base path).
const isPages = process.env.GITHUB_PAGES === "true";
const repo = "tolatino";

const nextConfig = {
  reactStrictMode: true,
  output: "export", // static HTML/JS export — no server needed (free static hosting)
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: isPages ? `/${repo}` : "",
  assetPrefix: isPages ? `/${repo}/` : "",
};

export default nextConfig;
