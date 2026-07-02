import type { NextConfig } from 'next'

const isJsonDemoMode = process.env.NEXT_PUBLIC_STORAGE_MODE === 'json'

const nextConfig: NextConfig = {
  output: 'standalone',
  ...(isJsonDemoMode ? {} : { basePath: '/insurance' }),
  trailingSlash: true,
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
