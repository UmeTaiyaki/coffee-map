// app/page.tsx - UserMenuとToastNotification追加版
'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { UserProvider } from '../contexts/UserContext'
import UserMenu from '../components/UserMenu'
import ToastNotification from '../components/ToastNotification'

// 地図コンポーネントを動的インポート（SSRを無効化）
const UpdatedMap = dynamic(() => import('../components/UpdatedMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg flex items-center justify-center animate-pulse">
      <div className="text-center p-6">
        <div className="text-4xl mb-4 animate-bounce">🗺️</div>
        <div className="text-blue-600 font-medium">地図を読み込み中...</div>
        <div className="text-sm text-blue-500 mt-2">少々お待ちください</div>
      </div>
    </div>
  )
})

// AddShopFormも動的インポート
const UpdatedAddShopForm = dynamic(() => import('../components/UpdatedAddShopForm'), {
  ssr: false,
  loading: () => (
    <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-6"></div>
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
})

// エラー境界コンポーネント
function ErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode
  fallback: React.ReactNode 
}) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Global error caught:', error)
      setHasError(true)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      setHasError(true)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  if (hasError) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// アニメーション用のスタイル
const animationStyles = {
  fadeIn: { animation: 'fadeIn 0.6s ease-out' },
  slideDown: { animation: 'slideDown 0.5s ease-out' },
  slideUp: { animation: 'slideUp 0.4s ease-out' }
}

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  

  // クライアントサイドでのみレンダリング
  useEffect(() => {
    setIsClient(true)
    
    // 初回訪問時のウェルカムメッセージ
    const hasVisited = localStorage.getItem('coffee-map-visited')
    if (!hasVisited) {
      localStorage.setItem('coffee-map-visited', 'true')
      setShowWelcome(true)
      // 5秒後に自動的に閉じる
      setTimeout(() => {
        setShowWelcome(false)
      }, 5000)
    }
  }, [])

  const handleShopAdded = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
    // 成功時のフィードバック
    const event = new CustomEvent('shopAdded', { detail: { timestamp: Date.now() } })
    window.dispatchEvent(event)
  }, [])

  // ウェルカムメッセージを閉じる
  const dismissWelcome = () => {
    setShowWelcome(false)
  }

  // エラーフォールバック
  const ErrorFallback = (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="text-center max-w-md bg-white p-8 rounded-lg shadow-xl">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-red-800 mb-4">アプリケーションエラー</h1>
        <p className="text-red-600 mb-6">
          申し訳ございません。アプリケーションでエラーが発生しました。
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium min-h-[44px] min-w-[44px]"
          aria-label="ページを再読み込み"
        >
          🔄 ページを再読み込み
        </button>
      </div>
    </div>
  )

  // サーバーサイドでは基本的なHTMLを返す
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <header className="text-center mb-8" style={animationStyles.slideDown}>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
              ☕ Coffee Map
            </h1>
            <p className="text-gray-600 text-lg">あなたの街のコーヒーショップを発見・共有しよう</p>
          </header>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
            <div className="xl:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">🗺️ 店舗マップ</h2>
                <div className="h-96 w-full bg-gradient-to-r from-gray-100 to-gray-200 animate-pulse rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2 animate-bounce">🗺️</div>
                    <div className="text-sm">地図を読み込み中...</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="xl:col-span-1">
              <div className="bg-white p-6 rounded-lg shadow-lg animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-24 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <UserProvider>
      <ErrorBoundary fallback={ErrorFallback}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
            {/* ヘッダー */}
            <header className="mb-6 md:mb-8" style={animationStyles.slideDown}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-2">
                    ☕ Coffee Map
                  </h1>
                  <p className="text-gray-600 text-base md:text-lg">
                    あなたの街のコーヒーショップを発見・共有しよう
                  </p>
                  <div className="text-sm text-gray-500 mt-2">
                    🆕 Phase 2: 認証機能・高度フィルター・ソート機能追加！
                  </div>
                </div>
                
                {/* ユーザーメニュー */}
                <div className="flex-shrink-0 ml-4">
                  <UserMenu />
                </div>
              </div>
            </header>

            {/* ウェルカムメッセージ */}
            {showWelcome && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 rounded-lg relative">
                <button
                  onClick={dismissWelcome}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <h3 className="text-blue-800 font-medium mb-1">Coffee Mapへようこそ！</h3>
                    <p className="text-blue-700 text-sm mb-2">
                      新機能追加：Googleサインイン、高度なフィルター・ソート機能、レビュー投稿などが利用できるようになりました。
                    </p>
                    <div className="text-xs text-blue-600">
                      💡 サインインするとお気に入りやレビューが永続保存されます
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* メインコンテンツ */}
            <main id="main-content">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                {/* 地図セクション */}
                <section 
                  className="xl:col-span-2" 
                  style={animationStyles.slideUp}
                  aria-labelledby="map-section-heading"
                >
                  <div className="bg-white rounded-lg shadow-lg p-4 mb-4 transition-shadow hover:shadow-xl">
                    <h2 
                      id="map-section-heading" 
                      className="text-xl font-semibold mb-4 text-gray-800 flex items-center"
                    >
                      🗺️ 店舗マップ
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({refreshTrigger > 0 ? '更新済み' : '初期表示'})
                      </span>
                    </h2>
                    <div className="map-container">
                      <UpdatedMap refreshTrigger={refreshTrigger} />
                    </div>
                  </div>
                </section>
                
                {/* フォームセクション */}
                <aside 
                  className="xl:col-span-1" 
                  style={animationStyles.fadeIn}
                  aria-labelledby="form-section-heading"
                >
                  <div className="sticky top-4">
                    <UpdatedAddShopForm onShopAdded={handleShopAdded} />
                  </div>
                </aside>
              </div>
            </main>

            {/* 機能説明セクション */}
            <section className="mt-8 md:mt-12" style={animationStyles.fadeIn}>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">🚀 Phase 2 新機能</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl mb-2">🔐</div>
                    <h3 className="font-medium text-gray-800 mb-2">簡単認証</h3>
                    <p className="text-sm text-gray-600">Googleアカウントまたは匿名ログインで簡単サインイン</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl mb-2">🔍</div>
                    <h3 className="font-medium text-gray-800 mb-2">高度フィルター</h3>
                    <p className="text-sm text-gray-600">営業時間・評価・距離などで詳細絞り込み</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl mb-2">📊</div>
                    <h3 className="font-medium text-gray-800 mb-2">ソート機能</h3>
                    <p className="text-sm text-gray-600">評価順・距離順・レビュー数順など多彩な並び替え</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-3xl mb-2">💬</div>
                    <h3 className="font-medium text-gray-800 mb-2">レビュー機能</h3>
                    <p className="text-sm text-gray-600">認証済みユーザーによる信頼性の高いレビュー</p>
                  </div>
                </div>
              </div>
            </section>

            {/* フッター */}
            <footer className="mt-8 md:mt-12 text-center" style={animationStyles.fadeIn}>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>🚀</span>
                    <span>Next.js 15 + React 19</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🗺️</span>
                    <span>OpenStreetMap + Leaflet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>💾</span>
                    <span>Supabase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🔐</span>
                    <span>Google OAuth</span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <p>
                    © 2024 Coffee Map - コミュニティで作る、みんなのコーヒーマップ
                  </p>
                  <p className="mt-1">
                    Phase 2: ユーザー認証・高度フィルター・ソート機能 🎉
                  </p>
                </div>
              </div>
            </footer>

            {/* アクセシビリティ向上: スキップリンク */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50 min-h-[44px] min-w-[44px] flex items-center"
              aria-label="メインコンテンツにスキップ"
            >
              メインコンテンツにスキップ
            </a>

            {/* トースト通知 */}
            <ToastNotification />
          </div>

          {/* CSS-in-JS アニメーション定義 */}
          <style jsx>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(15px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @keyframes bounce {
              0%, 20%, 50%, 80%, 100% {
                transform: translateY(0);
              }
              40% {
                transform: translateY(-10px);
              }
              60% {
                transform: translateY(-5px);
              }
            }

            .animate-bounce {
              animation: bounce 2s infinite;
            }

            .animate-pulse {
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }

            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.5;
              }
            }

            /* スクリーンリーダー専用クラス */
            .sr-only {
              position: absolute;
              width: 1px;
              height: 1px;
              padding: 0;
              margin: -1px;
              overflow: hidden;
              clip: rect(0, 0, 0, 0);
              white-space: nowrap;
              border: 0;
            }

            .focus\\:not-sr-only:focus {
              position: static;
              width: auto;
              height: auto;
              padding: 0.5rem 1rem;
              margin: 0;
              overflow: visible;
              clip: auto;
              white-space: normal;
            }

            /* レスポンシブ対応 */
            @media (max-width: 640px) {
              .map-container {
                margin: -0.5rem;
                border-radius: 0;
              }
            }

            /* ハイコントラストモード対応 */
            @media (prefers-contrast: high) {
              .bg-gradient-to-br {
                background: white;
              }
              
              .text-gray-600 {
                color: #000;
              }
              
              .border-gray-200 {
                border-color: #000;
              }
            }

            /* 動きを減らす設定への対応 */
            @media (prefers-reduced-motion: reduce) {
              * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
              }
            }

            /* フォーカス時のアクセシビリティ向上 */
            *:focus-visible {
              outline: 2px solid #3B82F6;
              outline-offset: 2px;
            }

            /* タッチデバイス向けの最適化 */
            @media (hover: hover) {
              .hover\\:shadow-xl:hover {
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
              }
            }

            /* 印刷時の最適化 */
            @media print {
              .shadow-lg,
              .shadow-xl {
                box-shadow: none;
                border: 1px solid #e5e7eb;
              }
              
              .bg-gradient-to-br {
                background: white;
              }
              
              .animate-bounce,
              .animate-pulse {
                animation: none;
              }
            }
          `}</style>
        </div>
      </ErrorBoundary>
    </UserProvider>
  )
}