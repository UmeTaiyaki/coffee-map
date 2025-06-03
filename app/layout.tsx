import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from '@/components/ClientProviders'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Coffee Map - コーヒー豆に出会う',
  description: '最高のコーヒー体験を発見しよう。お気に入りのコーヒーショップを見つけて、レビューを共有し、新しい味を探求しましょう。',
  keywords: 'コーヒー, カフェ, コーヒーショップ, レビュー, 地図, コーヒー豆',
  authors: [{ name: 'Coffee Map Team' }],
  robots: 'index, follow',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  openGraph: {
    title: 'Coffee Map - コーヒー豆に出会う',
    description: '最高のコーヒー体験を発見しよう',
    type: 'website',
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coffee Map - コーヒー豆に出会う',
    description: '最高のコーヒー体験を発見しよう',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={inter.variable}>
      <head>
        {/* Preload critical resources */}
        <link
          rel="preload"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          as="style"
        />
        
        {/* Load Leaflet CSS */}
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />

        {/* Theme color */}
        <meta name="theme-color" content="#FF8C42" />
        <meta name="msapplication-TileColor" content="#FF8C42" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}