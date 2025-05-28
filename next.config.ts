import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next.js 15の新しい設定名
  serverExternalPackages: ['leaflet'],
  // 静的アセットの最適化
  images: {
    unoptimized: true
  },
  // CORS設定を追加
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          }
        ]
      }
    ]
  }
}

export default nextConfig