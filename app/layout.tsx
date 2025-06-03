// app/layout.tsx - エラー修正版
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from '@/components/ClientProviders'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Coffee Map - コーヒー豆に出会う',
  description: 'コーヒー豆が購入できるお店を見つけるマップアプリ。お気に入りの一杯を発見しよう。',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Coffee Map - コーヒー豆に出会う',
    description: 'コーヒー豆が購入できるお店を見つけるマップアプリ',
    url: '/',
    siteName: 'Coffee Map',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coffee Map - コーヒー豆に出会う',
    description: 'コーヒー豆が購入できるお店を見つけるマップアプリ',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}