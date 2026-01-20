import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/gift-tax-docs',
  trailingSlash: true,
  output: "standalone",
};

export default nextConfig;
