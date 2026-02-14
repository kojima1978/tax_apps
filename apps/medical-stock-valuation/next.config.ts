import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: '/medical',
  trailingSlash: true,
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
