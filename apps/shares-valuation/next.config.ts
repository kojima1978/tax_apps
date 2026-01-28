import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: '/shares',
  trailingSlash: true,
};

export default nextConfig;
