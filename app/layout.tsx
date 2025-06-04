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
  description: '最高の一杯を発見する、コーヒーショップマップ',
  keywords: 'コーヒー,カフェ,焙煎所,コーヒーショップ,地図,マップ',
  authors: [{ name: 'Coffee Map Team' }],
  openGraph: {
    title: 'Coffee Map - コーヒー豆に出会う',
    description: '最高の一杯を発見する、コーヒーショップマップ',
    type: 'website',
    locale: 'ja_JP',
    url: 'https://coffee-map.vercel.app',
    siteName: 'Coffee Map',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Coffee Map',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coffee Map - コーヒー豆に出会う',
    description: '最高の一杯を発見する、コーヒーショップマップ',
    images: ['/og-image.png'],
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#6F4E37',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}