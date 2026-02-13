import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: '/medical',
  trailingSlash: true,
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
