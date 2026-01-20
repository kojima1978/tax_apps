import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/tax-docs',
  trailingSlash: true,
  output: "standalone",
};

export default nextConfig;
