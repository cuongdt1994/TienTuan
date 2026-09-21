import type { NextConfig } from "next";

const imageOrigin = (() => {
  try {
    return new URL(process.env.PUBLIC_IMAGE_BASE_URL ?? "http://10.100.101.22:9010/photography").origin;
  } catch {
    return "http://10.100.101.22:9010";
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${imageOrigin}`,
  `connect-src 'self' ${imageOrigin}`,
  "font-src 'self' data:",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }] : []),
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
      { protocol: "http", hostname: "10.100.101.22", port: "9010", pathname: "/photography/**" },
      { protocol: "https", hostname: "10.100.101.22", port: "9010", pathname: "/photography/**" },
    ],
    // The production MinIO endpoint is a private IP by design. Keep the exception
    // scoped to that exact endpoint and bucket path; do not allow arbitrary local IPs.
    dangerouslyAllowLocalIP: true,
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
