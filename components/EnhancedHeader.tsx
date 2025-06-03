'use client'
import React, { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useUser } from '../contexts/UserContext'
import { useAuthModal } from './AuthModal'

export default function EnhancedHeader({ onAddShop }: { onAddShop: () => void }) {
  const { theme, density, toggleTheme, setDensity } = useTheme()
  const { user } = useUser()
  const { openAuthModal, AuthModal } = useAuthModal()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 5) return 'こんばんは'
    if (hour < 10) return 'おはようございます'
    if (hour < 17) return 'こんにちは'
    return 'こんばんは'
  }

  const getTimeEmoji = () => {
    const hour = new Date().getHours()
    if (hour < 5) return '🌙'
    if (hour < 8) return '🌅'
    if (hour < 17) return '☀️'
    if (hour < 19) return '🌆'
    return '🌙'
  }

  return (
    <>
      <header className="glass sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* ブランドセクション */}
            <div className="flex items-center gap-3">
              <div className="text-3xl animate-gentle-pulse filter drop-shadow-md">
                ☕
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">
                  Coffee Map
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  コーヒー豆に出会う - 最高の一杯を発見
                </p>
              </div>
            </div>

            {/* ユーザーセクション */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.nickname || 'Coffee Lover'}さん、{getGreeting()}！
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    今日も素敵なコーヒータイムを {getTimeEmoji()}
                  </div>
                </div>
              ) : (
                <button
                  onClick={openAuthModal}
                  className="btn-glass text-sm hover:bg-orange-500/20"
                >
                  サインイン
                </button>
              )}

              {/* コントロールセクション */}
              <div className="flex items-center gap-2">
                {/* 情報密度モード切り替え */}
                <div className="glass-sm rounded-lg overflow-hidden flex">
                  <button
                    onClick={() => setDensity('detailed')}
                    className={`px-3 py-2 text-xs font-medium transition-all ${
                      density === 'detailed'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    詳細
                  </button>
                  <button
                    onClick={() => setDensity('compact')}
                    className={`px-3 py-2 text-xs font-medium transition-all ${
                      density === 'compact'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    簡潔
                  </button>
                </div>

                {/* テーマ切り替え */}
                <button
                  onClick={toggleTheme}
                  className="glass-sm w-10 h-10 rounded-full flex items-center justify-center hover:bg-orange-500/20 transition-all hover:rotate-180"
                  title="ダーク/ライトモード切り替え"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>

                {/* 店舗追加ボタン */}
                <button
                  onClick={onAddShop}
                  className="glass-sm px-4 py-2 rounded-lg font-medium text-sm bg-green-600 text-white hover:bg-green-700 transition-all flex items-center gap-2"
                >
                  <span>🏪</span>
                  <span className="hidden sm:inline">新しい店舗</span>
                </button>

                {/* ユーザーアバター */}
                {user && (
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-bold hover:scale-110 transition-transform shadow-lg"
                    >
                      {user.nickname?.charAt(0) || '👤'}
                    </button>
                    
                    {showUserMenu && (
                      <div className="absolute right-0 top-12 glass rounded-lg shadow-xl p-4 min-w-[200px] animate-fade-in-up">
                        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          {user.nickname || 'Coffee Lover'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                          {user.email}
                        </div>
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            window.location.href = '/profile'
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        >
                          プロフィール設定
                        </button>
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            window.location.href = '/favorites'
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        >
                          お気に入り店舗
                        </button>
                        <hr className="my-2 border-gray-200 dark:border-gray-700" />
                        <button
                          onClick={() => {
                            // サインアウト処理
                            window.location.href = '/logout'
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          サインアウト
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <AuthModal />
    </>
  )
}