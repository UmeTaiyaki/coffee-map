'use client'
import React, { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { showToast } from '@/components/ToastNotification'

// 動的インポートでSSRエラーを回避
const Map = dynamic(() => import('@/components/SimpleMap'), {
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
            インタラクティブコーヒーマップ
          </div>
          <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
            マーカーをクリックして店舗詳細を確認
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showAddShopModal, setShowAddShopModal] = useState(false)
  const [currentTheme, setCurrentTheme] = useState('light')
  const [currentDensity, setCurrentDensity] = useState('detailed')

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
  }

  // 情報密度切り替え
  const setDensity = (density: string) => {
    setCurrentDensity(density)
    localStorage.setItem('coffee-map-density', density)
    showToast(`${density === 'detailed' ? '詳細' : '簡潔'}モードに切り替わりました`, 'info')
  }

  // 店舗追加後のリフレッシュ
  const handleShopAdded = () => {
    setRefreshTrigger(prev => prev + 1)
    setShowAddShopModal(false)
    showToast('新しい店舗が追加されました！', 'success')
  }

  // 初期化
  useEffect(() => {
    // 保存されたテーマを復元
    const savedTheme = localStorage.getItem('coffee-map-theme')
    if (savedTheme === 'dark') {
      toggleTheme()
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
      {/* ハイブリッドヘッダー */}
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
            <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--current-text-secondary)' }}>
              <div style={{ fontWeight: 600, color: 'var(--current-text-primary)' }}>
                田中さん、こんにちは！
              </div>
              <div>今日も素敵なコーヒータイムを ☀️</div>
            </div>
            
            <div className="controls-section">
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
              
              <button 
                className="theme-toggle" 
                onClick={toggleTheme} 
                title="ダーク/ライトモード切り替え"
              >
                {currentTheme === 'light' ? '🌙' : '☀️'}
              </button>
              
              <button
                onClick={() => setShowAddShopModal(true)}
                className="coffee-button"
              >
                <span>🏪</span>
                <span style={{ display: window.innerWidth > 640 ? 'inline' : 'none' }}>
                  新しい店舗
                </span>
              </button>
              
              <Suspense fallback={<div style={{ width: '40px', height: '40px', background: '#ddd', borderRadius: '50%' }} />}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, var(--accent-coffee), var(--accent-gold))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  👤
                </div>
              </Suspense>
            </div>
          </div>
        </div>
      </header>

      {/* 適応型検索・フィルターエリア */}
      <div className="search-filter-area">
        <div className="search-container">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              className="search-input" 
              placeholder="店舗名・住所・こだわり・雰囲気で検索..."
            />
          </div>
          
          <div className="filter-section">
            <div className="filter-group">
              <div className="filter-label">📂 カテゴリー</div>
              <select className="filter-select">
                <option>すべてのカテゴリー</option>
                <option>☕ カフェ</option>
                <option>🔥 自家焙煎</option>
                <option>🏪 チェーン</option>
                <option>✨ スペシャルティ</option>
                <option>🥐 ベーカリーカフェ</option>
              </select>
            </div>
            
            <div className="filter-group">
              <div className="filter-label">💰 価格帯</div>
              <select className="filter-select">
                <option>すべての価格帯</option>
                <option>¥ (～500円)</option>
                <option>¥¥ (500～1000円)</option>
                <option>¥¥¥ (1000～2000円)</option>
                <option>¥¥¥¥ (2000円～)</option>
              </select>
            </div>
            
            <div className="filter-group">
              <div className="filter-label">📍 距離</div>
              <select className="filter-select">
                <option>距離指定なし</option>
                <option>徒歩5分以内</option>
                <option>徒歩10分以内</option>
                <option>徒歩15分以内</option>
                <option>車で20分以内</option>
              </select>
            </div>
            
            <div className="filter-group">
              <div className="filter-label">📊 並び順</div>
              <select className="filter-select">
                <option>📍 近い順</option>
                <option>⭐ 評価順</option>
                <option>💬 レビュー数順</option>
                <option>🆕 新着順</option>
                <option>💰 価格安順</option>
                <option>🎲 ランダム</option>
              </select>
            </div>
          </div>
          
          <div className="quick-actions">
            <button className="quick-btn active">📍 現在地周辺</button>
            <button className="quick-btn">📶 Wi-Fi完備</button>
            <button className="quick-btn">🔌 電源あり</button>
            <button className="quick-btn">🕐 営業中</button>
            <button className="quick-btn">⭐ 高評価</button>
            <button className="quick-btn">📚 読書向け</button>
            <button className="quick-btn">💻 PC作業可</button>
            <button className="quick-btn">🚭 完全禁煙</button>
            <button className="quick-btn">🅿️ 駐車場あり</button>
            <button className="quick-btn">🌙 夜も営業</button>
          </div>
          
          <div className="stats-dashboard">
            <div className="stat-card">
              <div className="stat-number">47</div>
              <div className="stat-label">該当店舗</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">34</div>
              <div className="stat-label">営業中</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">4.3</div>
              <div className="stat-label">平均評価</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">12</div>
              <div className="stat-label">お気に入り</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">8</div>
              <div className="stat-label">新着</div>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="main-content">
        {/* 地図エリア */}
        <Suspense fallback={<MapSkeleton />}>
          <Map refreshTrigger={refreshTrigger} />
        </Suspense>

        {/* 店舗リスト */}
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: 'var(--accent-coffee)', 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📍 コーヒーショップ一覧
            <span style={{
              background: 'var(--accent-warm)',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              6店舗
            </span>
          </h2>
          
          <div style={{ 
            display: 'grid',
            gap: '1.5rem',
            gridTemplateColumns: currentDensity === 'compact' ? 'repeat(auto-fit, minmax(350px, 1fr))' : '1fr'
          }}>
            {/* 店舗カード例 */}
            {[
              {
                name: '青山コーヒー焙煎所',
                category: '🔥 自家焙煎・スペシャルティコーヒー',
                rating: 4.8,
                reviews: 127,
                status: '営業中',
                distance: '徒歩3分 (240m)',
                features: ['📶 Wi-Fi完備', '🔌 電源豊富', '🔥 自家焙煎', '🚭 完全禁煙']
              },
              {
                name: '隠れ家カフェ Beans',
                category: '☕ カフェ・読書・作業向け',
                rating: 4.3,
                reviews: 89,
                status: '営業中',
                distance: '徒歩8分 (650m)',
                features: ['📶 Wi-Fi無料', '🔌 全席電源', '📚 読書推奨', '🚭 禁煙']
              },
              {
                name: 'コーヒー工房 ROAST',
                category: '🔥 自家焙煎・豆販売・体験',
                rating: 4.7,
                reviews: 203,
                status: '18時閉店',
                distance: '徒歩12分 (950m)',
                features: ['🔥 自家焙煎', '🫘 豆販売', '🎓 焙煎体験', '📶 Wi-Fi']
              }
            ].map((shop, index) => (
              <div key={index} className="coffee-card">
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    background: 'linear-gradient(45deg, var(--accent-coffee), var(--accent-warm))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    color: 'white',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    ☕
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: 'var(--current-text-primary)',
                      marginBottom: '0.5rem'
                    }}>
                      {shop.name}
                    </div>
                    
                    <div style={{
                      fontSize: '0.9rem',
                      color: 'var(--current-text-secondary)',
                      marginBottom: '0.75rem'
                    }}>
                      {shop.category}
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'var(--current-tertiary-bg)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        border: '1px solid var(--current-border)'
                      }}>
                        <span style={{ color: 'var(--accent-gold)', fontSize: '0.9rem' }}>
                          ⭐⭐⭐⭐⭐
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-gold)', fontSize: '0.9rem' }}>
                          {shop.rating}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--current-text-muted)' }}>
                          ({shop.reviews}件)
                        </span>
                      </div>
                      
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: shop.status === '営業中' ? 'rgba(34, 139, 34, 0.1)' : 'rgba(229, 62, 62, 0.1)',
                        color: shop.status === '営業中' ? 'var(--accent-green)' : 'var(--accent-red)',
                        border: `1px solid ${shop.status === '営業中' ? 'rgba(34, 139, 34, 0.2)' : 'rgba(229, 62, 62, 0.2)'}`
                      }}>
                        {shop.status}
                      </span>
                      
                      <span style={{
                        color: 'var(--current-text-muted)',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}>
                        {shop.distance}
                      </span>
                    </div>
                  </div>
                </div>
                
                {currentDensity === 'detailed' && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--current-border)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {shop.features.map((feature, idx) => (
                        <span key={idx} style={{
                          padding: '0.25rem 0.75rem',
                          background: 'var(--accent-green)',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}>
                          {feature}
                        </span>
                      ))}
                    </div>
                    
                    <div style={{
                      background: 'linear-gradient(45deg, rgba(111, 78, 55, 0.05), rgba(255, 140, 66, 0.05))',
                      border: '1px solid var(--current-border)',
                      borderRadius: '12px',
                      padding: '1rem',
                      margin: '1rem 0',
                      fontSize: '0.85rem',
                      color: 'var(--current-text-secondary)',
                      textAlign: 'center',
                      lineHeight: 1.5
                    }}>
                      ☕ <span style={{ color: 'var(--accent-coffee)', fontWeight: 600 }}>
                        本格的なコーヒー体験
                      </span>をお求めの皆様へ。<br/>
                      マスターが丁寧に選定した豆で、至福のひとときをお過ごしください。
                    </div>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '0.75rem'
                    }}>
                      <button className="coffee-button" style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                        ❤️ お気に入り
                      </button>
                      <button className="coffee-button" style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                        📝 詳細・レビュー
                      </button>
                      <button className="coffee-button" style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                        🗺️ ルート案内
                      </button>
                      <button className="coffee-button" style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                        📞 電話する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 店舗追加モーダル */}
      <AddShopModal
        isOpen={showAddShopModal}
        onClose={() => setShowAddShopModal(false)}
        onShopAdded={handleShopAdded}
      />

      {/* トースト通知 */}
      <ToastNotification />
    </div>
  )
}