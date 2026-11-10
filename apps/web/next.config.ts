import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@tolatino/ui"],
  poweredByHeader: false,
  reactStrictMode: true,
  headers: async () => [
    // 6h · Los service workers propios: siempre la última versión, y el de la Puerta con alcance /puerta (el archivo vive en /puerta/).
    { source: "/puerta/sw.js", headers: [{ key: "Service-Worker-Allowed", value: "/puerta" }, { key: "Cache-Control", value: "no-cache" }] },
    { source: "/sw-boletos.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
      ],
    },
  ],
};

export default nextConfig;
