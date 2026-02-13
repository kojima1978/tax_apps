import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/itcm',
  trailingSlash: true,
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
