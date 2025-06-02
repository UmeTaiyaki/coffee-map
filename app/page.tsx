// app/page.tsx - 地図拡大・UI簡素化版
'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { UserProvider } from '../contexts/UserContext'
import UserMenu from '../components/UserMenu'
import ToastNotification, { showToast } from '../components/ToastNotification'
// AddShopModalも動的インポート（Leafletを含むため）
const AddShopModal = dynamic(() => import('../components/AddShopModal'), {
  ssr: false,
  loading: () => null
})

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

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
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
  }, [checkAuthStatus])

  // 店舗追加完了時の処理
  const handleShopAdded = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
    setShowAddShopModal(false)
    showToast('新しい店舗を登録しました！', 'success')
  }, [])

  // 店舗追加モーダルを開く
  const handleOpenAddShopModal = useCallback(() => {
    setShowAddShopModal(true)
  }, [])

  // 店舗追加モーダルを閉じる
  const handleCloseAddShopModal = useCallback(() => {
    setShowAddShopModal(false)
  }, [])

  return (
    <UserProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="h-screen flex flex-col">
          {/* ヘッダー */}
          <header className="flex-shrink-0 bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4">
            <div className="flex justify-between items-center">
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
          
          {/* メインコンテンツ - 地図のみ */}
          <main className="flex-1 min-h-0">
            <Map refreshTrigger={refreshTrigger} />
          </main>

          {/* 店舗追加モーダル */}
          <AddShopModal
            isOpen={showAddShopModal}
            onClose={handleCloseAddShopModal}
            onShopAdded={handleShopAdded}
          />

          {/* トースト通知 */}
          <ToastNotification />
        </div>
      </div>
    </UserProvider>
  )
}