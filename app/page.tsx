// app/page.tsx - 完全版
'use client'
import React, { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { showToast } from '@/components/ToastNotification'
import { useUser } from '@/contexts/UserContext'
import { useAuthModal } from '@/components/AuthModal'

// 動的インポートでSSRエラーを回避
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <MapSkeleton />
})

const AddShopModal = dynamic(() => import('@/components/AddShopModal'), {
  ssr: false,
  loading: () => null
})

const ToastNotification = dynamic(() => import('@/components/ToastNotification'), {
  ssr: false,
  loading: () => null
})

const UserMenu = dynamic(() => import('@/components/UserMenu'), {
  ssr: false,
  loading: () => <div className="user-avatar-skeleton" />
})

// スケルトンコンポーネント
function MapSkeleton() {
  return (
    <div className="map-container">
      <div className="map-content">
        <div className="map-placeholder">
          <div className="map-icon">🗺️</div>
          <div className="text-xl font-medium mb-2">
            Coffee Map を読み込み中...
          </div>
          <div className="text-sm opacity-70">
            お気に入りのコーヒーショップを探しましょう
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { user } = useUser()
  const { openAuthModal, AuthModal } = useAuthModal()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showAddShopModal, setShowAddShopModal] = useState(false)
  const [currentTheme, setCurrentTheme] = useState('light')
  const [currentDensity, setCurrentDensity] = useState('detailed')

  // ユーザー挨拶の生成
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

  // テーマ切り替え
  const toggleTheme = () => {
    const body = document.body
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'
    
    if (newTheme === 'dark') {
      body.classList.add('dark-mode')
    } else {
      body.classList.remove('dark-mode')
    }
    
    setCurrentTheme(newTheme)
    localStorage.setItem('coffee-map-theme', newTheme)
    
    // アニメーション効果
    document.body.style.transform = 'scale(0.98)'
    setTimeout(() => {
      document.body.style.transform = 'scale(1)'
    }, 150)
    
    showToast(`${newTheme === 'dark' ? '🌙 ダーク' : '☀️ ライト'}モードに切り替わりました`, 'info')
  }

  // 情報密度切り替え
  const setDensity = (density: string) => {
    setCurrentDensity(density)
    localStorage.setItem('coffee-map-density', density)
    showToast(`${density === 'detailed' ? '詳細' : '簡潔'}モードに切り替わりました`, 'info')
  }

  // 店舗追加処理
  const handleAddShop = () => {
    if (!user) {
      openAuthModal()
      return
    }
    setShowAddShopModal(true)
  }

  // 店舗追加後のリフレッシュ
  const handleShopAdded = () => {
    setRefreshTrigger(prev => prev + 1)
    setShowAddShopModal(false)
    showToast('新しい店舗が追加されました！ありがとうございます。', 'success')
  }

  // 初期化
  useEffect(() => {
    // 保存されたテーマを復元
    const savedTheme = localStorage.getItem('coffee-map-theme')
    if (savedTheme === 'dark') {
      setCurrentTheme('dark')
      document.body.classList.add('dark-mode')
    }
    
    // 保存された密度設定を復元
    const savedDensity = localStorage.getItem('coffee-map-density')
    if (savedDensity && savedDensity !== currentDensity) {
      setCurrentDensity(savedDensity)
    }
    
    // ウェルカムメッセージ
    setTimeout(() => {
      showToast('Coffee Mapへようこそ！素敵なコーヒータイムを🌟', 'success')
    }, 1000)
  }, [currentDensity])

  return (
    <div className="app-container">
      {/* 統合ヘッダー */}
      <header className="header">
        <div className="header-content">
          <div className="brand-section">
            <div className="logo-container">
              <div className="logo">☕</div>
              <div className="brand-text">
                <h1>Coffee Map</h1>
                <p>コーヒー豆に出会う - 最高の一杯を発見</p>
              </div>
            </div>
          </div>
          
          <div className="user-section">
            {/* ユーザー挨拶 */}
            {user ? (
              <div className="greeting-text">
                <div className="user-name">
                  {user.nickname || 'Coffee Lover'}さん、{getGreeting()}！
                </div>
                <div>今日も素敵なコーヒータイムを {getTimeEmoji()}</div>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="coffee-button"
              >
                サインイン
              </button>
            )}
            
            <div className="controls-section">
              {/* 情報密度切り替え */}
              <div className="mode-controls">
                <button 
                  className={`mode-btn ${currentDensity === 'detailed' ? 'active' : ''}`}
                  onClick={() => setDensity('detailed')}
                >
                  詳細
                </button>
                <button 
                  className={`mode-btn ${currentDensity === 'compact' ? 'active' : ''}`}
                  onClick={() => setDensity('compact')}
                >
                  簡潔
                </button>
              </div>
              
              {/* テーマ切り替え */}
              <button 
                className="theme-toggle" 
                onClick={toggleTheme} 
                title="ダーク/ライトモード切り替え"
              >
                {currentTheme === 'light' ? '🌙' : '☀️'}
              </button>
              
              {/* 店舗追加ボタン */}
              <button
                onClick={handleAddShop}
                className="coffee-button"
                title={user ? "新しい店舗を追加" : "サインインして店舗を追加"}
              >
                <span>🏪</span>
                <span className="hidden sm:inline">
                  新しい店舗
                </span>
              </button>
              
              {/* ユーザーメニュー */}
              <Suspense fallback={
                <div className="user-avatar-skeleton" />
              }>
                <UserMenu />
              </Suspense>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ - フル画面マップ */}
      <div className="main-content">
        <Suspense fallback={<MapSkeleton />}>
          <Map refreshTrigger={refreshTrigger} />
        </Suspense>
      </div>

      {/* 店舗追加モーダル */}
      <AddShopModal
        isOpen={showAddShopModal}
        onClose={() => setShowAddShopModal(false)}
        onShopAdded={handleShopAdded}
      />

      {/* 認証モーダル */}
      <AuthModal />

      {/* トースト通知 */}
      <ToastNotification />
    </div>
  )
}