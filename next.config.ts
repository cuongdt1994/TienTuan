import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "https", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "10.100.101.22", port: "9010" },
    ],
  },
  typedRoutes: true,
};

export default nextConfig;
