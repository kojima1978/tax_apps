import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: '/shares',
  trailingSlash: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
