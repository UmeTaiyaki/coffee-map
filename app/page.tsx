// app/page.tsx - 新UI実装版
'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { UserProvider } from '../contexts/UserContext'
import UserMenu from '../components/UserMenu'
import ToastNotification, { showToast } from '../components/ToastNotification'
import CompactSidebar from '../components/CompactSidebar'
import AddShopModal from '../components/AddShopModal'

// 地図コンポーネントを動的インポート（SSRを無効化）
const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <MapSkeleton />
})

// スケルトンコンポーネント
function MapSkeleton() {
  return (
    <div className="h-full w-full bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg flex items-center justify-center animate-pulse">
      <div className="text-center p-6">
        <div className="text-4xl mb-4 animate-bounce">🗺️</div>
        <div className="text-blue-600 font-medium">地図を読み込み中...</div>
        <div className="text-sm text-blue-500 mt-2">少々お待ちください</div>
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
            新しいUIでより使いやすくなりました。地図中心の表示で、コーヒーショップ探しがもっと楽しく！
          </p>
          <div className="text-xs text-blue-600">
            💡 右上の「新しい店舗を追加」ボタンから簡単に店舗登録できます
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showAddShopModal, setShowAddShopModal] = useState(false)

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
    const hasVisited = localStorage.getItem('coffee-map-visited-v2')
    if (!hasVisited) {
      localStorage.setItem('coffee-map-visited-v2', 'true')
      setShowWelcome(true)
      setTimeout(() => setShowWelcome(false), 8000)
    }
  }, [checkAuthStatus])

  const handleShopAdded = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
    setShowAddShopModal(false)
    showToast('新しい店舗を登録しました！', 'success')
  }, [])

  const handleOpenAddShopModal = useCallback(() => {
    setShowAddShopModal(true)
  }, [])

  const handleCloseAddShopModal = useCallback(() => {
    setShowAddShopModal(false)
  }, [])

  return (
    <UserProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="h-screen flex flex-col max-w-full">
          {/* ヘッダー */}
          <header className="flex-shrink-0 bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
                  ☕ Coffee Map
                </h1>
                <p className="text-gray-600 text-sm md:text-base">
                  コーヒー豆に出会う - あなたの街のコーヒーショップを発見・共有しよう
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenAddShopModal}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm md:text-base flex items-center gap-2"
                >
                  <span>🏪</span>
                  <span className="hidden sm:inline">新しい店舗を追加</span>
                  <span className="sm:hidden">追加</span>
                </button>
                <Suspense fallback={<div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />}>
                  <UserMenu />
                </Suspense>
              </div>
            </div>
          </header>

          {/* ウェルカムメッセージ */}
          {showWelcome && (
            <div className="flex-shrink-0 px-4 md:px-6 pt-4">
              <div className="max-w-7xl mx-auto">
                <WelcomeMessage onDismiss={() => setShowWelcome(false)} />
              </div>
            </div>
          )}
          
          {/* メインコンテンツ */}
          <main className="flex-1 min-h-0 px-4 md:px-6 pb-4">
            <div className="max-w-7xl mx-auto h-full">
              <div className="flex h-full gap-4 md:gap-6">
                {/* 左サイドバー */}
                <aside className="w-80 lg:w-96 flex-shrink-0 hidden md:block">
                  <CompactSidebar refreshTrigger={refreshTrigger} />
                </aside>
                
                {/* 地図エリア */}
                <section className="flex-1 min-w-0" aria-labelledby="map-heading">
                  <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <Map refreshTrigger={refreshTrigger} />
                  </div>
                </section>
              </div>
            </div>
          </main>

          {/* モバイル用サイドバー（画面下部に表示） */}
          <div className="md:hidden flex-shrink-0 px-4 pb-4">
            <CompactSidebar refreshTrigger={refreshTrigger} isMobile />
          </div>

          {/* 店舗追加モーダル */}
          <AddShopModal
            isOpen={showAddShopModal}
            onClose={handleCloseAddShopModal}
            onShopAdded={handleShopAdded}
          />

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