import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: '/inheritance-tax-docs',
  trailingSlash: true,
};

export default nextConfig;
