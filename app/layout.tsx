import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '../contexts/ThemeContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Coffee Map - コーヒー豆に出会う',
  description: 'あなたの街のコーヒーショップを発見・共有しよう。最高の一杯を見つけるためのコーヒーマップ。',
  keywords: 'コーヒー, カフェ, 自家焙煎, スペシャルティコーヒー, コーヒー豆',
  openGraph: {
    title: 'Coffee Map - コーヒー豆に出会う',
    description: 'あなたの街のコーヒーショップを発見・共有しよう',
    type: 'website',
    locale: 'ja_JP',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Coffee Map'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coffee Map - コーヒー豆に出会う',
    description: 'あなたの街のコーヒーショップを発見・共有しよう',
    images: ['/og-image.png']
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#FF8C42" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${inter.className} gradient-bg min-h-screen`} suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}