import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "https", hostname: "localhost", port: "9000" },
    ],
  },
  typedRoutes: true,
};

export default nextConfig;
