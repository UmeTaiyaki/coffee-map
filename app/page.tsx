// app/page.tsx - 統合・最適化版
'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { UserProvider } from '../contexts/UserContext'
import UserMenu from '../components/UserMenu'
import ToastNotification, { showToast } from '../components/ToastNotification'

// 地図コンポーネントを動的インポート（SSRを無効化）
const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <MapSkeleton />
})

// AddShopFormも動的インポート
const AddShopForm = dynamic(() => import('../components/AddShopForm'), {
  ssr: false,
  loading: () => <FormSkeleton />
})

// スケルトンコンポーネント
function MapSkeleton() {
  return (
    <div className="h-96 w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg flex items-center justify-center animate-pulse">
      <div className="text-center p-6">
        <div className="text-4xl mb-4 animate-bounce">🗺️</div>
        <div className="text-blue-600 font-medium">地図を読み込み中...</div>
        <div className="text-sm text-blue-500 mt-2">少々お待ちください</div>
      </div>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-6" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  )
}

// ウェルカムメッセージコンポーネント
function WelcomeMessage({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 rounded-lg relative animate-slideIn">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-lg px-2 py-1 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors"
        aria-label="ウェルカムメッセージを閉じる"
      >
        ✕
      </button>
      <div className="flex items-start gap-3">
        <span className="text-2xl">🎉</span>
        <div>
          <h3 className="text-blue-800 font-medium mb-1">Coffee Mapへようこそ！</h3>
          <p className="text-blue-700 text-sm mb-2">
            Phase 3実装：詳細レビューシステム・画像投稿・高度フィルター機能などが追加されました。
          </p>
          <div className="text-xs text-blue-600">
            💡 サインインするとお気に入りやレビューが永続保存されます
          </div>
        </div>
      </div>
    </div>
  )
}

// 機能紹介セクション
function FeatureSection() {
  const features = [
    { icon: '🔐', title: '簡単認証', desc: 'Googleアカウントまたは匿名ログインで簡単サインイン', color: 'blue' },
    { icon: '🔍', title: '高度フィルター', desc: '営業時間・評価・距離などで詳細絞り込み', color: 'green' },
    { icon: '📊', title: 'ソート機能', desc: '評価順・距離順・レビュー数順など多彩な並び替え', color: 'purple' },
    { icon: '💬', title: '詳細レビュー', desc: '雰囲気・サービス・コスパなど多角的評価＋写真投稿', color: 'yellow' },
    { icon: '📸', title: '画像投稿', desc: '店舗の写真やレビュー画像で視覚的な情報共有', color: 'pink' },
    { icon: '🏷️', title: 'タグ機能', desc: 'wifi・電源・雰囲気などのタグで詳細な店舗情報', color: 'indigo' }
  ]

  return (
    <section className="mt-8 md:mt-12 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">🚀 Phase 3 新機能</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className={`text-center p-4 bg-${feature.color}-50 rounded-lg hover:bg-${feature.color}-100 transition-colors`}
            >
              <div className="text-3xl mb-2">{feature.icon}</div>
              <h3 className="font-medium text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 統計情報セクション
function StatsSection() {
  const [stats, setStats] = useState({ shops: 0, reviews: 0, users: 0 })

  useEffect(() => {
    // 簡易的な統計情報を表示（実際のデータベースから取得することも可能）
    const mockStats = {
      shops: Math.floor(Math.random() * 100) + 50,
      reviews: Math.floor(Math.random() * 500) + 200,
      users: Math.floor(Math.random() * 200) + 100
    }
    setStats(mockStats)
  }, [])

  return (
    <section className="mt-8 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">📊 コミュニティ統計</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.shops}+</div>
            <div className="text-sm text-gray-600">登録店舗</div>
          </div>
          <div className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.reviews}+</div>
            <div className="text-sm text-gray-600">レビュー</div>
          </div>
          <div className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.users}+</div>
            <div className="text-sm text-gray-600">ユーザー</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// フッターコンポーネント
function Footer() {
  const techStack = [
    { icon: '🚀', name: 'Next.js 15 + React 19' },
    { icon: '🗺️', name: 'OpenStreetMap + Leaflet' },
    { icon: '💾', name: 'Supabase' },
    { icon: '🔐', name: 'Google OAuth' }
  ]

  return (
    <footer className="mt-8 md:mt-12 text-center animate-fadeIn">
      <div className="p-4 bg-white rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-sm text-gray-600">
          {techStack.map((tech, i) => (
            <div key={i} className="flex items-center gap-2">
              <span>{tech.icon}</span>
              <span>{tech.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <p>© 2024 Coffee Map - コミュニティで作る、みんなのコーヒーマップ</p>
          <p className="mt-1">Phase 3: 詳細レビューシステム・画像投稿・コミュニティ機能 🎉</p>
        </div>
      </div>
    </footer>
  )
}

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showWelcome, setShowWelcome] = useState(false)

  // URLパラメータから認証状態をチェック
  const checkAuthStatus = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    const authSuccess = params.get('auth_success')
    const authError = params.get('auth_error')

    if (authSuccess || authError) {
      if (authSuccess) {
        showToast('ログインが完了しました！', 'success', 4000)
      } else if (authError) {
        const errorMessage = decodeURIComponent(authError)
        showToast(`ログインに失敗しました: ${errorMessage}`, 'error', 6000)
      }

      // URLパラメータをクリア
      const url = new URL(window.location.href)
      url.searchParams.delete('auth_success')
      url.searchParams.delete('auth_error')
      window.history.replaceState({}, document.title, url.toString())
    }
  }, [])

  // 初期化処理
  useEffect(() => {
    checkAuthStatus()
    
    // 初回訪問チェック
    const hasVisited = localStorage.getItem('coffee-map-visited')
    if (!hasVisited) {
      localStorage.setItem('coffee-map-visited', 'true')
      setShowWelcome(true)
      setTimeout(() => setShowWelcome(false), 8000)
    }
  }, [checkAuthStatus])

  const handleShopAdded = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
    showToast('新しい店舗を登録しました！', 'success')
  }, [])

  return (
    <UserProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
          {/* ヘッダー */}
          <header className="mb-6 md:mb-8 animate-slideDown">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-2">
                  ☕ Coffee Map
                </h1>
                <p className="text-gray-600 text-base md:text-lg">
                  コーヒー豆に出会う - あなたの街のコーヒーショップを発見・共有しよう
                </p>
                <div className="text-sm text-gray-500 mt-2">
                  🆕 Phase 3: 詳細レビューシステム・画像投稿機能追加！
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-4">
                <Suspense fallback={<div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />}>
                  <UserMenu />
                </Suspense>
              </div>
            </div>
          </header>

          {/* ウェルカムメッセージ */}
          {showWelcome && <WelcomeMessage onDismiss={() => setShowWelcome(false)} />}
          
          {/* メインコンテンツ */}
          <main id="main-content">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {/* 地図セクション */}
              <section className="xl:col-span-2 animate-slideUp" aria-labelledby="map-heading">
                <div className="bg-white rounded-lg shadow-lg p-4 mb-4 transition-shadow hover:shadow-xl">
                  <h2 id="map-heading" className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                    🗺️ 店舗マップ
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({refreshTrigger > 0 ? '更新済み' : '初期表示'})
                    </span>
                  </h2>
                  <Map refreshTrigger={refreshTrigger} />
                </div>
              </section>
              
              {/* フォームセクション */}
              <aside className="xl:col-span-1 animate-fadeIn" aria-labelledby="form-heading">
                <div className="sticky top-4">
                  <AddShopForm onShopAdded={handleShopAdded} />
                </div>
              </aside>
            </div>
          </main>

          {/* 統計情報 */}
          <StatsSection />

          {/* 機能説明 */}
          <FeatureSection />

          {/* フッター */}
          <Footer />

          {/* トースト通知 */}
          <ToastNotification />
        </div>

        {/* グローバルスタイル */}
        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
          .animate-slideDown { animation: slideDown 0.5s ease-out; }
          .animate-slideUp { animation: slideUp 0.4s ease-out; }
          .animate-slideIn { animation: slideIn 0.5s ease-out; }
          
          @media (prefers-reduced-motion: reduce) {
            * { animation-duration: 0.01ms !important; }
          }
        `}</style>
      </div>
    </UserProvider>
  )
}