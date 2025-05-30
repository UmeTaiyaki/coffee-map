// app/page.tsx - Phase 1対応版
'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { UserProvider } from '../contexts/UserContext'
import UserMenu from '../components/UserMenu'
import ToastNotification, { showToast } from '../components/ToastNotification'

// 地図コンポーネントを動的インポート
const UpdatedMap = dynamic(() => import('../components/UpdatedMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg flex items-center justify-center animate-pulse">
      <div className="text-center p-6">
        <div className="text-4xl mb-4 animate-bounce">🗺️</div>
        <div className="text-blue-600 font-medium">地図を読み込み中...</div>
      </div>
    </div>
  )
})

// Phase 1 AddShopFormを動的インポート
const Phase1AddShopForm = dynamic(() => import('../components/Phase1AddShopForm'), {
  ssr: false,
  loading: () => (
    <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-6"></div>
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
})

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map')

  // URLパラメータから認証状態をチェック
  const checkAuthStatus = useCallback(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const authSuccess = params.get('auth_success')
    const authError = params.get('auth_error')

    if (authSuccess) {
      showToast('ログインが完了しました！', 'success', 4000)
      const url = new URL(window.location.href)
      url.searchParams.delete('auth_success')
      window.history.replaceState({}, document.title, url.toString())
    }

    if (authError) {
      const errorMessage = decodeURIComponent(authError)
      showToast(`ログインに失敗しました: ${errorMessage}`, 'error', 6000)
      const url = new URL(window.location.href)
      url.searchParams.delete('auth_error')
      window.history.replaceState({}, document.title, url.toString())
    }
  }, [])

  useEffect(() => {
    setIsClient(true)
    checkAuthStatus()
    
    // Phase 1ウェルカムメッセージ
    const hasSeenPhase1 = localStorage.getItem('coffee-map-phase1-seen')
    if (!hasSeenPhase1) {
      localStorage.setItem('coffee-map-phase1-seen', 'true')
      setShowWelcome(true)
      setTimeout(() => {
        setShowWelcome(false)
      }, 10000)
    }
  }, [checkAuthStatus])

  const handleShopAdded = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
    showToast('新しい店舗を登録しました！', 'success')
  }, [])

  const dismissWelcome = () => {
    setShowWelcome(false)
  }

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <header className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
              ☕ Coffee Map
            </h1>
            <p className="text-gray-600 text-lg">コーヒー豆に出会う - あなたの街のコーヒーショップを発見・共有しよう</p>
          </header>
        </div>
      </div>
    )
  }

  return (
    <UserProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
          {/* ヘッダー */}
          <header className="mb-6 md:mb-8">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-2">
                  ☕ Coffee Map
                </h1>
                <p className="text-gray-600 text-base md:text-lg">
                  コーヒー豆に出会う - あなたの街のコーヒーショップを発見・共有しよう
                </p>
                <div className="text-sm text-gray-500 mt-2">
                  🎉 Phase 1 リリース: 写真投稿・営業時間・連絡先情報を追加！
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-4">
                <UserMenu />
              </div>
            </div>
          </header>

          {/* Phase 1 ウェルカムメッセージ */}
          {showWelcome && (
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 rounded-lg relative animate-slideIn">
              <button
                onClick={dismissWelcome}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-lg px-2 py-1"
              >
                ✕
              </button>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <h3 className="text-amber-800 font-medium mb-1">Phase 1 新機能リリース！</h3>
                  <ul className="text-amber-700 text-sm space-y-1">
                    <li>📸 店舗写真のアップロード機能</li>
                    <li>🕐 営業時間の登録</li>
                    <li>📞 連絡先・ウェブサイト情報</li>
                    <li>💳 決済方法の表示</li>
                    <li>🏷️ 詳細なタグ機能</li>
                  </ul>
                  <div className="text-xs text-amber-600 mt-2">
                    💡 お気に入りの店舗に写真を追加してみましょう！
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* メインコンテンツ */}
          <main>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {/* 地図セクション */}
              <section className="xl:col-span-2">
                <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                      🗺️ 店舗マップ
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveTab('map')}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          activeTab === 'map'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        地図表示
                      </button>
                      <button
                        onClick={() => setActiveTab('list')}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          activeTab === 'list'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        リスト表示
                      </button>
                    </div>
                  </div>
                  <UpdatedMap refreshTrigger={refreshTrigger} />
                </div>
              </section>
              
              {/* フォームセクション */}
              <aside className="xl:col-span-1">
                <div className="sticky top-4">
                  <Phase1AddShopForm onShopAdded={handleShopAdded} />
                </div>
              </aside>
            </div>
          </main>

          {/* Phase 1 機能説明 */}
          <section className="mt-8 md:mt-12">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">🚀 Phase 1 新機能</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <div className="text-3xl mb-2">📸</div>
                  <h3 className="font-medium text-gray-800 mb-2">写真投稿</h3>
                  <p className="text-sm text-gray-600">店舗の雰囲気が伝わる写真を投稿できます</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl mb-2">🕐</div>
                  <h3 className="font-medium text-gray-800 mb-2">営業時間</h3>
                  <p className="text-sm text-gray-600">曜日ごとの営業時間を詳細に設定</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl mb-2">📞</div>
                  <h3 className="font-medium text-gray-800 mb-2">連絡先情報</h3>
                  <p className="text-sm text-gray-600">電話番号・ウェブサイトを登録</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl mb-2">💳</div>
                  <h3 className="font-medium text-gray-800 mb-2">決済方法</h3>
                  <p className="text-sm text-gray-600">利用可能な決済方法を表示</p>
                </div>
                <div className="text-center p-4 bg-pink-50 rounded-lg">
                  <div className="text-3xl mb-2">🏷️</div>
                  <h3 className="font-medium text-gray-800 mb-2">詳細タグ</h3>
                  <p className="text-sm text-gray-600">Wi-Fi・電源・雰囲気などのタグ</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-3xl mb-2">🔍</div>
                  <h3 className="font-medium text-gray-800 mb-2">強化フィルター</h3>
                  <p className="text-sm text-gray-600">詳細な条件で店舗を検索</p>
                </div>
              </div>
            </div>
          </section>

          {/* フッター */}
          <footer className="mt-8 md:mt-12 text-center">
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-sm text-gray-600">
                <p>© 2024 Coffee Map - コーヒー豆に出会う、みんなのコーヒーマップ</p>
                <p className="mt-1">Phase 1: 基盤機能の強化 🎉</p>
              </div>
            </div>
          </footer>

          {/* トースト通知 */}
          <ToastNotification />
        </div>

        <style jsx>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .animate-slideIn {
            animation: slideIn 0.5s ease-out;
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
        `}</style>
      </div>
    </UserProvider>
  )
}