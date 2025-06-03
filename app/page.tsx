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
  loading: () => null
})

// スケルトンコンポーネント
function MapSkeleton() {
  return (
    <div className="map-container">
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(45deg, rgba(111, 78, 55, 0.1), rgba(255, 140, 66, 0.1))',
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--current-text-secondary)' }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '1rem',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
            animation: 'float 3s ease-in-out infinite'
          }}>🗺️</div>
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            Coffee Map を読み込み中...
          </div>
          <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
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
  }, [])

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
              <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--current-text-secondary)' }}>
                <div style={{ fontWeight: 600, color: 'var(--current-text-primary)' }}>
                  {user.nickname || 'Coffee Lover'}さん、{getGreeting()}！
                </div>
                <div>今日も素敵なコーヒータイムを {getTimeEmoji()}</div>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="coffee-button"
                style={{ fontSize: '0.85rem' }}
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
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#ddd',
                  animation: 'pulse 2s infinite'
                }} />
              }>
                <UserMenu />
              </Suspense>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ - フル画面マップ */}
      <div className="main-content" style={{ height: 'calc(100vh - 80px)' }}>
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

      {/* グローバルスタイル */}
      <style jsx global>{`
        /* アプリ全体のスタイル */
        .app-container {
          min-height: 100vh;
          background: var(--current-primary-bg);
          color: var(--current-text-primary);
          transition: all 0.3s ease;
        }

        /* ヘッダースタイル */
        .header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
          transition: all 0.3s ease;
        }

        .dark-mode .header {
          background: rgba(26, 26, 26, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        /* ブランドセクション */
        .brand-section .logo-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .brand-section .logo {
          font-size: 2rem;
          animation: gentle-pulse 4s ease-in-out infinite;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }

        .brand-section .brand-text h1 {
          font-size: 1.75rem;
          font-weight: 700;
          background: linear-gradient(45deg, var(--accent-coffee), var(--accent-warm));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }

        .brand-section .brand-text p {
          font-size: 0.875rem;
          color: var(--current-text-secondary);
          margin: 0;
        }

        /* ユーザーセクション */
        .user-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .controls-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        /* モード切り替えボタン */
        .mode-controls {
          display: flex;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          overflow: hidden;
        }

        .dark-mode .mode-controls {
          background: rgba(45, 45, 45, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .mode-btn {
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 600;
          border: none;
          background: transparent;
          color: var(--current-text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-btn:hover {
          background: rgba(255, 140, 66, 0.1);
          color: var(--accent-warm);
        }

        .mode-btn.active {
          background: var(--accent-warm);
          color: white;
        }

        /* テーマ切り替えボタン */
        .theme-toggle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.8);
          color: var(--current-text-primary);
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dark-mode .theme-toggle {
          background: rgba(45, 45, 45, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .theme-toggle:hover {
          transform: rotate(180deg) scale(1.1);
          background: var(--accent-warm);
          color: white;
        }

        /* コーヒーボタン */
        .coffee-button {
          padding: 0.75rem 1rem;
          background: linear-gradient(45deg, var(--accent-coffee), var(--accent-warm));
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 2px 8px rgba(255, 140, 66, 0.3);
        }

        .coffee-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(255, 140, 66, 0.4);
        }

        .coffee-button:active {
          transform: translateY(0);
        }

        /* メインコンテンツ */
        .main-content {
          position: relative;
          overflow: hidden;
        }

        /* マップコンテナ */
        .map-container {
          width: 100%;
          height: 100%;
          position: relative;
          border-radius: 0;
          overflow: hidden;
        }

        /* アニメーション */
        @keyframes gentle-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* カスタムプロパティ */
        :root {
          --accent-coffee: #6F4E37;
          --accent-warm: #FF8C42;
          --accent-gold: #D4AF37;
          --accent-green: #228B22;
          --accent-red: #DC143C;
          --accent-blue: #3B82F6;
          
          --current-primary-bg: #F8F5F0;
          --current-secondary-bg: #FFFFFF;
          --current-tertiary-bg: #FFF8F0;
          --current-text-primary: #2D2D2D;
          --current-text-secondary: #666666;
          --current-text-muted: #999999;
          --current-border: rgba(0, 0, 0, 0.1);
        }

        .dark-mode {
          --current-primary-bg: #0F0F0F;
          --current-secondary-bg: #1A1A1A;
          --current-tertiary-bg: #2D2D2D;
          --current-text-primary: #FFFFFF;
          --current-text-secondary: #CCCCCC;
          --current-text-muted: #999999;
          --current-border: rgba(255, 255, 255, 0.1);
        }

        /* レスポンシブ対応 */
        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
          }

          .user-section {
            width: 100%;
            justify-content: space-between;
          }

          .controls-section {
            gap: 0.5rem;
          }

          .mode-controls {
            font-size: 0.75rem;
          }

          .mode-btn {
            padding: 0.375rem 0.5rem;
          }

          .coffee-button span:last-child {
            display: none;
          }

          .main-content {
            height: calc(100vh - 120px);
          }
        }

        @media (max-width: 480px) {
          .brand-section .logo {
            font-size: 1.5rem;
          }

          .brand-section .brand-text h1 {
            font-size: 1.5rem;
          }

          .brand-section .brand-text p {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  )
}