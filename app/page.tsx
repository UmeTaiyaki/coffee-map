// app/page.tsx - 完全版（レイアウト調整版）
'use client'
import React, { useState, useEffect, Suspense, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { showToast } from '@/components/ToastNotification'
import { useUser } from '@/contexts/UserContext'
import { useAuthModal } from '@/components/AuthModal'
import type { FilterState, SortState } from '@/types/filters'

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

// デフォルト値
const defaultFilters: FilterState = {
  search: '',
  category: 'all',
  priceRange: 'all',
  features: [],
  showFavoritesOnly: false,
  isOpenNow: false,
  openAt: { enabled: false, day: 0, time: '09:00' },
  hasReviews: false,
  minRating: 0,
  distance: { enabled: false, maxKm: 5 },
  tags: [],
  paymentMethods: []
}

const defaultSort: SortState = {
  option: 'distance',
  direction: 'asc'
}

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
  
  // 状態管理
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showAddShopModal, setShowAddShopModal] = useState(false)
  const [currentTheme, setCurrentTheme] = useState('light')
  const [currentDensity, setCurrentDensity] = useState('detailed')
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [sortState, setSortState] = useState<SortState>(defaultSort)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  
  // 統計情報
  const [shopCount, setShopCount] = useState(0)
  const [openCount, setOpenCount] = useState(0)
  const [favoriteCount, setFavoriteCount] = useState(0)

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

  // フィルター更新
  const handleFiltersChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // クイックフィルター切り替え
  const toggleQuickFilter = useCallback((filterName: string) => {
    switch (filterName) {
      case 'wifi':
        handleFiltersChange({
          features: filters.features.includes('wifi')
            ? filters.features.filter(f => f !== 'wifi')
            : [...filters.features, 'wifi']
        })
        break
      case 'power':
        handleFiltersChange({
          features: filters.features.includes('power')
            ? filters.features.filter(f => f !== 'power')
            : [...filters.features, 'power']
        })
        break
      case 'openNow':
        handleFiltersChange({ isOpenNow: !filters.isOpenNow })
        break
      case 'highRating':
        handleFiltersChange({ minRating: filters.minRating >= 4 ? 0 : 4 })
        break
      case 'favorite':
        handleFiltersChange({ showFavoritesOnly: !filters.showFavoritesOnly })
        break
      case 'nearMe':
        if (!filters.distance.enabled) {
          handleCurrentLocation()
        }
        handleFiltersChange({ 
          distance: { 
            enabled: !filters.distance.enabled, 
            maxKm: filters.distance.enabled ? 5 : 1 
          } 
        })
        break
    }
  }, [filters])

  // 現在地取得
  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('このブラウザでは位置情報がサポートされていません', 'error')
      return
    }

    setIsLocating(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const newLocation: [number, number] = [latitude, longitude]
        
        setCurrentLocation(newLocation)
        setIsLocating(false)
        showToast('現在地を取得しました', 'success')
        
        // 距離フィルターを有効化
        handleFiltersChange({ 
          distance: { enabled: true, maxKm: 1 } 
        })
      },
      (err) => {
        setIsLocating(false)
        let errorMessage = '位置情報取得中にエラーが発生しました'
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = '位置情報の取得が拒否されました'
            break
          case err.POSITION_UNAVAILABLE:
            errorMessage = '位置情報を取得できません'
            break
          case err.TIMEOUT:
            errorMessage = '位置情報取得がタイムアウトしました'
            break
        }
        showToast(errorMessage, 'error')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }, [handleFiltersChange])

  // フィルターリセット
  const handleFiltersClear = useCallback(() => {
    setFilters(defaultFilters)
    setSortState(defaultSort)
    showToast('フィルターをリセットしました', 'info')
  }, [])

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

      {/* メインコンテンツ - 検索フィルターとマップを含む */}
      <div className="main-content">
        {/* 検索・フィルターエリア */}
        <div className="search-filter-area">
          <div className="search-container">
            {/* 検索バー */}
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="店舗名・住所・こだわり・雰囲気で検索..."
                value={filters.search}
                onChange={(e) => handleFiltersChange({ search: e.target.value })}
              />
            </div>

            {/* フィルターセクション */}
            <div className="filter-section">
              <div className="filter-group">
                <div className="filter-label">
                  <span>📂</span> カテゴリー
                </div>
                <select 
                  className="filter-select"
                  value={filters.category}
                  onChange={(e) => handleFiltersChange({ category: e.target.value as FilterState['category'] })}
                >
                  <option value="all">すべてのカテゴリー</option>
                  <option value="cafe">☕ カフェ</option>
                  <option value="roastery">🔥 焙煎所</option>
                  <option value="chain">🏪 チェーン店</option>
                  <option value="specialty">✨ スペシャルティ</option>
                  <option value="bakery">🥐 ベーカリーカフェ</option>
                </select>
              </div>

              <div className="filter-group">
                <div className="filter-label">
                  <span>💰</span> 価格帯
                </div>
                <select 
                  className="filter-select"
                  value={filters.priceRange}
                  onChange={(e) => handleFiltersChange({ priceRange: e.target.value as FilterState['priceRange'] })}
                >
                  <option value="all">すべての価格帯</option>
                  <option value="1">¥ (～500円)</option>
                  <option value="2">¥¥ (500～1000円)</option>
                  <option value="3">¥¥¥ (1000～2000円)</option>
                  <option value="4">¥¥¥¥ (2000円～)</option>
                </select>
              </div>

              <div className="filter-group">
                <div className="filter-label">
                  <span>📍</span> 距離
                </div>
                <select 
                  className="filter-select"
                  value={filters.distance.enabled ? filters.distance.maxKm : 'all'}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'all') {
                      handleFiltersChange({ distance: { enabled: false, maxKm: 5 } })
                    } else {
                      handleFiltersChange({ distance: { enabled: true, maxKm: parseInt(value) } })
                    }
                  }}
                >
                  <option value="all">距離指定なし</option>
                  <option value="1">1km以内</option>
                  <option value="2">2km以内</option>
                  <option value="3">3km以内</option>
                  <option value="5">5km以内</option>
                </select>
              </div>

              <div className="filter-group">
                <div className="filter-label">
                  <span>📊</span> 並び順
                </div>
                <select 
                  className="filter-select"
                  value={sortState.option}
                  onChange={(e) => setSortState({ ...sortState, option: e.target.value as SortState['option'] })}
                >
                  <option value="rating">⭐ 評価順</option>
                  <option value="distance" disabled={!currentLocation}>📍 距離順</option>
                  <option value="review_count">💬 レビュー数順</option>
                  <option value="newest">🆕 新着順</option>
                  <option value="price_low">💰 価格安順</option>
                  <option value="price_high">💎 価格高順</option>
                  <option value="name">🔤 名前順</option>
                  <option value="random">🎲 ランダム</option>
                </select>
              </div>
            </div>

            {/* クイックアクション */}
            <div className="quick-actions">
              <button 
                className={`quick-btn ${filters.distance.enabled ? 'active' : ''} ${isLocating ? 'disabled' : ''}`}
                onClick={() => toggleQuickFilter('nearMe')}
                disabled={isLocating}
              >
                {isLocating ? '📍 取得中...' : '📍 現在地周辺'}
              </button>
              <button 
                className={`quick-btn ${filters.features.includes('wifi') ? 'active' : ''}`}
                onClick={() => toggleQuickFilter('wifi')}
              >
                📶 Wi-Fi完備
              </button>
              <button 
                className={`quick-btn ${filters.features.includes('power') ? 'active' : ''}`}
                onClick={() => toggleQuickFilter('power')}
              >
                🔌 電源あり
              </button>
              <button 
                className={`quick-btn ${filters.isOpenNow ? 'active' : ''}`}
                onClick={() => toggleQuickFilter('openNow')}
              >
                🕐 営業中
              </button>
              <button 
                className={`quick-btn ${filters.minRating >= 4 ? 'active' : ''}`}
                onClick={() => toggleQuickFilter('highRating')}
              >
                ⭐ 高評価
              </button>
              <button 
                className={`quick-btn ${filters.showFavoritesOnly ? 'active' : ''}`}
                onClick={() => toggleQuickFilter('favorite')}
              >
                ❤️ お気に入り
              </button>
              <button 
                className="quick-btn"
                onClick={handleFiltersClear}
              >
                🗑️ リセット
              </button>
            </div>

            {/* 統計ダッシュボード */}
            <div className="stats-dashboard">
              <div className="stat-card">
                <div className="stat-number">{shopCount}</div>
                <div className="stat-label">該当店舗</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{openCount}</div>
                <div className="stat-label">営業中</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {shopCount > 0 ? ((favoriteCount / shopCount) * 100).toFixed(0) : 0}%
                </div>
                <div className="stat-label">お気に入り率</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{favoriteCount}</div>
                <div className="stat-label">お気に入り</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{shopCount}</div>
                <div className="stat-label">総店舗</div>
              </div>
            </div>
          </div>
        </div>

        {/* マップコンテナ - 縮小版 */}
        <div className="map-container">
          <Suspense fallback={<MapSkeleton />}>
            <Map 
              refreshTrigger={refreshTrigger}
              filters={filters}
              sortState={sortState}
              currentLocation={currentLocation}
              onLocationUpdate={setCurrentLocation}
              onShopCountUpdate={setShopCount}
              onOpenCountUpdate={setOpenCount}
              onFavoriteCountUpdate={setFavoriteCount}
            />
          </Suspense>
        </div>
      </div>

      {/* モーダル類 */}
      <AddShopModal
        isOpen={showAddShopModal}
        onClose={() => setShowAddShopModal(false)}
        onShopAdded={handleShopAdded}
      />

      <AuthModal />
      <ToastNotification />
    </div>
  )
}