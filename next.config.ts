/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15の新しい設定名
  serverExternalPackages: ['leaflet'],
  // 静的アセットの最適化
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig