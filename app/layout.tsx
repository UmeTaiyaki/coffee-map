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
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossOrigin=""
          />
        </noscript>
        
        {/* Viewport meta for mobile optimization */}
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
        />
        
        {/* Theme color */}
        <meta name="theme-color" content="#FF8C42" />
        <meta name="msapplication-TileColor" content="#FF8C42" />
        
        {/* Apple touch icon */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://unpkg.com" />
        <link rel="preconnect" href="https://tile.openstreetmap.org" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="//cdn.geolonia.com" />
        
        {/* Critical CSS for above-the-fold content */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS for immediate rendering */
            body {
              margin: 0;
              font-family: ${inter.style.fontFamily}, -apple-system, BlinkMacSystemFont, sans-serif;
              background: #F8F5F0;
              color: #2D3748;
              line-height: 1.6;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            
            /* Prevent layout shift */
            .map-container {
              min-height: 500px;
              background: linear-gradient(45deg, rgba(111, 78, 55, 0.1), rgba(255, 140, 66, 0.1));
            }
            
            /* Loading state */
            .user-avatar-skeleton {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
            }
            
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            
            /* Dark mode preparation */
            .dark-mode {
              background: #0F0F0F;
              color: #FFFFFF;
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        {/* Skip to main content for accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
        >
          メインコンテンツにスキップ
        </a>
        
        {/* App content */}
        <ClientProviders>
          <main id="main-content" role="main">
            {children}
          </main>
        </ClientProviders>
        
        {/* Service Worker registration script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Service Worker registration for PWA
              if ('serviceWorker' in navigator) {
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
              
              // Geolocation API optimization
              if ('geolocation' in navigator) {
                // Preload geolocation permissions if user has granted before
                const hasLocationPermission = localStorage.getItem('location-permission-granted');
                if (hasLocationPermission === 'true') {
                  navigator.geolocation.getCurrentPosition(
                    function() { /* Silent success */ },
                    function() { /* Silent error */ },
                    { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
                  );
                }
              }
              
              // Theme persistence without flash
              (function() {
                const theme = localStorage.getItem('coffee-map-theme');
                if (theme === 'dark') {
                  document.body.classList.add('dark-mode');
                }
              })();
              
              // Performance monitoring
              if (typeof window !== 'undefined') {
                window.addEventListener('load', function() {
                  // Log Core Web Vitals
                  if ('web-vital' in window) {
                    // This would be replaced with actual web vitals tracking
                    console.log('Page loaded successfully');
                  }
                });
              }
              
              // Error boundary for unhandled errors
              window.addEventListener('error', function(event) {
                console.error('Unhandled error:', event.error);
                // In production, this would send to error tracking service
              });
              
              window.addEventListener('unhandledrejection', function(event) {
                console.error('Unhandled promise rejection:', event.reason);
                // In production, this would send to error tracking service
              });
            `,
          }}
        />
        
        {/* Analytics scripts would go here in production */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Google Analytics */}
            {process.env.NEXT_PUBLIC_GA_ID && (
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
                        page_title: document.title,
                        page_location: window.location.href,
                      });
                    `,
                  }}
                />
              </>
            )}
          </>
        )}
      </body>
    </html>
  )
}import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from '@/components/ClientProviders'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'Coffee Map - コーヒー豆に出会う',
  description: '最高の一杯を発見しよう。コーヒー豆が購入できるお店を探すためのマップアプリケーション。お気に入りの店舗を見つけ、レビューを共有し、コーヒーコミュニティに参加しましょう。',
  keywords: 'コーヒー, コーヒーショップ, カフェ, 焙煎, マップ, レビュー, コーヒー豆',
  authors: [{ name: 'Coffee Map Team' }],
  creator: 'Coffee Map',
  publisher: 'Coffee Map',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Coffee Map - コーヒー豆に出会う',
    description: '最高の一杯を発見しよう。コーヒー豆が購入できるお店を探すためのマップアプリケーション。',
    url: '/',
    siteName: 'Coffee Map',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Coffee Map - コーヒー豆に出会う',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coffee Map - コーヒー豆に出会う',
    description: '最高の一杯を発見しよう。コーヒー豆が購入できるお店を探すためのマップアプリケーション。',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
}