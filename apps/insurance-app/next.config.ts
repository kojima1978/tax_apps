import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/insurance',
  trailingSlash: true,
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
