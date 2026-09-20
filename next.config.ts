import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "https", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "10.100.101.22", port: "9010" },
    ],
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  typedRoutes: true,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }, { key: "Pragma", value: "no-cache" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
