import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/retirement-tax-calc',
  trailingSlash: true,
  output: "standalone",
};

export default nextConfig;
