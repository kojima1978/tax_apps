import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/gift-tax-simulator',
  trailingSlash: true,
  output: "standalone",
};

export default nextConfig;
