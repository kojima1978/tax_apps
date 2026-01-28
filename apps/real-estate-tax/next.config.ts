import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: '/real-estate-tax',
  trailingSlash: true,
};

export default nextConfig;
