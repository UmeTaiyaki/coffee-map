import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from '@/components/ClientProviders'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'Coffee Map - コーヒー豆に出会う',
  description: 'コーヒー豆に出会う - 最高の一杯を発見。お気に入りのコーヒーショップを見つけて、レビューを共有しましょう。',
  keywords: 'コーヒー, カフェ, コーヒーショップ, 地図, レビュー, コーヒー豆',
  authors: [{ name: 'Coffee Map Team' }],
  creator: 'Coffee Map',
  publisher: 'Coffee Map',
  robots: 'index, follow',
  openGraph: {
    title: 'Coffee Map - コーヒー豆に出会う',
    description: 'コーヒー豆に出会う - 最高の一杯を発見',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://coffee-map.app',
    siteName: 'Coffee Map',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Coffee Map - コーヒー豆に出会う'
      }
    ],
    locale: 'ja_JP',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coffee Map - コーヒー豆に出会う',
    description: 'コーヒー豆に出会う - 最高の一杯を発見',
    images: ['/og-image.jpg']
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FF8C42' },
    { media: '(prefers-color-scheme: dark)', color: '#6F4E37' }
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Coffee Map'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={inter.variable}>
      <head>
        {/* プリロード重要リソース */}
        <link
          rel="preload"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          as="style"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        
        {/* DNS プリフェッチ */}
        <link rel="dns-prefetch" href="//unpkg.com" />
        <link rel="dns-prefetch" href="//tile.openstreetmap.org" />
        <link rel="dns-prefetch" href="//cdn.geolonia.com" />
        
        {/* プリコネクト */}
        <link rel="preconnect" href="https://unpkg.com" />
        <link rel="preconnect" href="https://tile.openstreetmap.org" />
        
        {/* 構造化データ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Coffee Map',
              description: 'コーヒー豆に出会う - 最高の一杯を発見',
              url: process.env.NEXT_PUBLIC_BASE_URL || 'https://coffee-map.app',
              applicationCategory: 'LifestyleApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'JPY'
              },
              author: {
                '@type': 'Organization',
                name: 'Coffee Map Team'
              }
            })
          }}
        />
        
        {/* パフォーマンス最適化 */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="msapplication-TileColor" content="#FF8C42" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* セキュリティヘッダー */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        
        {/* Google Analytics（プロダクション環境で有効化） */}
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                    page_title: 'Coffee Map',
                    custom_map: 'dimension1'
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      <body className={`${inter.className} antialiased`}>
        {/* 非JavaScript環境向けのメッセージ */}
        <noscript>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#F8F5F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            padding: '2rem'
          }}>
            <div>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>☕</div>
              <h1 style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                color: '#6F4E37',
                marginBottom: '1rem' 
              }}>
                Coffee Map
              </h1>
              <p style={{ 
                fontSize: '1.1rem', 
                color: '#666666',
                marginBottom: '2rem',
                maxWidth: '500px'
              }}>
                このアプリを利用するには、JavaScriptを有効にしてください。<br/>
                コーヒー豆に出会う最高の体験をお届けします。
              </p>
              <div style={{
                padding: '1rem 2rem',
                backgroundColor: '#FF8C42',
                color: 'white',
                borderRadius: '8px',
                display: 'inline-block',
                fontWeight: '600'
              }}>
                JavaScript を有効にしてリロードしてください
              </div>
            </div>
          </div>
        </noscript>

        {/* プログレッシブ強化のためのローディング画面 */}
        <div id="initial-loading" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#F8F5F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '1rem',
              animation: 'gentle-pulse 2s ease-in-out infinite'
            }}>
              ☕
            </div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: '#6F4E37',
              marginBottom: '0.5rem' 
            }}>
              Coffee Map
            </div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#666666',
              marginBottom: '1rem' 
            }}>
              コーヒー豆に出会う
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #FF8C42',
              borderTop: '4px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
          </div>
        </div>

        {/* メインアプリケーション */}
        <ClientProviders>
          <div id="app-root" style={{ opacity: 0, transition: 'opacity 0.5s ease' }}>
            {children}
          </div>
        </ClientProviders>

        {/* ローディング完了時のスクリプト */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // ローディング画面を非表示にしてアプリを表示
              document.addEventListener('DOMContentLoaded', function() {
                setTimeout(function() {
                  const loading = document.getElementById('initial-loading');
                  const app = document.getElementById('app-root');
                  
                  if (loading && app) {
                    app.style.opacity = '1';
                    loading.style.opacity = '0';
                    setTimeout(function() {
                      loading.style.display = 'none';
                    }, 500);
                  }
                }, 100);
              });

              // アニメーションキーフレーム
              const style = document.createElement('style');
              style.textContent = \`
                @keyframes gentle-pulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.05); }
                }
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              \`;
              document.head.appendChild(style);

              // サービスワーカー登録（PWA対応）
              if ('serviceWorker' in navigator && '${process.env.NODE_ENV}' === 'production') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }

              // パフォーマンス測定
              if ('performance' in window && '${process.env.NODE_ENV}' === 'production') {
                window.addEventListener('load', function() {
                  setTimeout(function() {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    if (perfData && window.gtag) {
                      gtag('event', 'page_load_time', {
                        event_category: 'Performance',
                        event_label: 'Initial Load',
                        value: Math.round(perfData.loadEventEnd - perfData.loadEventStart)
                      });
                    }
                  }, 0);
                });
              }

              // エラーハンドリング
              window.addEventListener('error', function(e) {
                console.error('Global error:', e.error);
                if (window.gtag && '${process.env.NODE_ENV}' === 'production') {
                  gtag('event', 'exception', {
                    description: e.error?.message || 'Unknown error',
                    fatal: false
                  });
                }
              });

              // 未処理のPromise拒否をキャッチ
              window.addEventListener('unhandledrejection', function(e) {
                console.error('Unhandled promise rejection:', e.reason);
                if (window.gtag && '${process.env.NODE_ENV}' === 'production') {
                  gtag('event', 'exception', {
                    description: e.reason?.message || 'Unhandled promise rejection',
                    fatal: false
                  });
                }
              });
            `,
          }}
        />

        {/* 開発環境でのデバッグヘルパー */}
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // 開発モードでのデバッグ情報
                console.log('%c☕ Coffee Map - Development Mode', 
                  'color: #6F4E37; font-size: 16px; font-weight: bold;'
                );
                console.log('Next.js: ${process.env.NEXT_PUBLIC_VERCEL_ENV || 'development'}');
                
                // パフォーマンス監視
                window.__COFFEE_MAP_DEBUG__ = {
                  performance: performance,
                  startTime: Date.now()
                };
              `,
            }}
          />
        )}
      </body>
    </html>
  )
}