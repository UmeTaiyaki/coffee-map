// app/layout.tsx - 高さ管理を追加
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './animations.css'
import ClientProviders from '@/components/ClientProviders'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Coffee Map - コーヒー豆に出会う',
  description: '最高のコーヒー体験を見つけよう。コーヒー豆が購入できるお店のマップアプリ。',
  keywords: 'コーヒー,カフェ,珈琲,豆,焙煎,マップ,地図',
  authors: [{ name: 'Coffee Map Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#FF8C42',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={inter.variable} style={{ height: '100%' }}>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <script
          src="https://cdn.geolonia.com/community-geocoder.js"
          async
        />
      </head>
      <body style={{ height: '100%', margin: 0 }}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}