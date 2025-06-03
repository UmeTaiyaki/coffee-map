// components/Map.tsx - 完全統合版（UIUXを完成イメージに合わせて改善）
'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import ShopSidePanel from './ShopSidePanel'
import { useAuthModal } from './AuthModal'
import { sortShops, resetRandomSort } from '../utils/sorting'
import { showToast } from './ToastNotification'
import type { FilterState, SortState } from '../types/filters'
import type { ShopWithDetails } from '../types/shop'

// Dynamic imports for Leaflet components
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

// 定数
const DEFAULT_CENTER: [number, number] = [35.6762, 139.6503]
const DEFAULT_ZOOM = 13
const LOCATION_ZOOM = 15
const LOCATION_TIMEOUT = 12000
const LOCATION_MAX_AGE = 300000

// カテゴリーと価格帯の定数
const CATEGORIES = {
  cafe: '☕ カフェ',
  roastery: '🔥 焙煎所',
  chain: '🏪 チェーン店',
  specialty: '✨ スペシャルティ',
  bakery: '🥐 ベーカリーカフェ'
} as const

const PRICE_RANGES = {
  1: '¥',
  2: '¥¥',
  3: '¥¥¥',
  4: '¥¥¥¥'
} as const

// アイコン設定（クライアントサイドでのみ実行）
const createIcons = async () => {
  if (typeof window === 'undefined') return null
  
  try {
    const L = await import('leaflet')
    
    // カスタムアイコンの作成
    const createCustomIcon = (color: string, emoji: string) => {
      const iconHtml = `
        <div style="
          width: 40px;
          height: 40px;
          background: linear-gradient(45deg, ${color}, #FF8C42);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
        ">
          <span style="
            transform: rotate(45deg);
            font-size: 20px;
            filter: grayscale(0%);
          ">${emoji}</span>
        </div>
      `
      
      return L.default.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
      })
    }

    const CurrentLocationIcon = L.default.divIcon({
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: #3B82F6;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -12px;
            left: -12px;
            width: 48px;
            height: 48px;
            background: rgba(59, 130, 246, 0.2);
            border-radius: 50%;
            animation: pulse-location 2s infinite;
          "></div>
        </div>
      `,
      className: 'current-location-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })

    // カテゴリー別アイコン
    const CategoryIcons = {
      cafe: createCustomIcon('#6F4E37', '☕'),
      roastery: createCustomIcon('#DC143C', '🔥'),
      chain: createCustomIcon('#1E90FF', '🏪'),
      specialty: createCustomIcon('#FFD700', '✨'),
      bakery: createCustomIcon('#DEB887', '🥐')
    }
    
    return { CategoryIcons, CurrentLocationIcon }
  } catch (error) {
    console.error('Leaflet icons creation failed:', error)
    return null
  }
}

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

// マップビュー変更コンポーネント
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const [useMapHook, setUseMapHook] = useState<any>(null)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-leaflet').then((mod) => {
        setUseMapHook(() => mod.useMap)
      })
    }
  }, [])
  
  if (!useMapHook) return null
  
  const map = useMapHook()
  
  useEffect(() => {
    if (map) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])
  
  return null
}

// ローディングコンポーネント
function LoadingSpinner() {
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

// フィルタータグコンポーネント
function FilterTag({ 
  label, 
  active, 
  onClick 
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`quick-btn ${active ? 'active' : ''}`}
    >
      {label}
    </button>
  )
}

// 統合サイドバーコンポーネント
function IntegratedSidebar({
  filters,
  sortState,
  hasLocation,
  isLocating,
  filteredCount,
  totalCount,
  openCount,
  favoriteCount,
  onFiltersChange,
  onSortChange,
  onLocationClick,
  onRefresh,
  onFiltersClear
}: {
  filters: FilterState
  sortState: SortState
  hasLocation: boolean
  isLocating: boolean
  filteredCount: number
  totalCount: number
  openCount: number
  favoriteCount: number
  onFiltersChange: (filters: Partial<FilterState>) => void
  onSortChange: (sort: SortState) => void
  onLocationClick: () => void
  onRefresh: () => void
  onFiltersClear: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
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
            onChange={(e) => onFiltersChange({ search: e.target.value })}
          />
        </div>

        {/* フィルターセクション */}
        <div className="filter-section">
          <div className="filter-group">
            <div className="filter-label">📂 カテゴリー</div>
            <select
              className="filter-select"
              value={filters.category}
              onChange={(e) => onFiltersChange({ category: e.target.value as FilterState['category'] })}
            >
              <option value="all">すべてのカテゴリー</option>
              {Object.entries(CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <div className="filter-label">💰 価格帯</div>
            <select
              className="filter-select"
              value={filters.priceRange}
              onChange={(e) => onFiltersChange({ priceRange: e.target.value as FilterState['priceRange'] })}
            >
              <option value="all">すべての価格帯</option>
              {Object.entries(PRICE_RANGES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <div className="filter-label">📍 距離</div>
            <select
              className="filter-select"
              value={filters.distance.enabled ? filters.distance.maxKm : 'all'}
              onChange={(e) => {
                const value = e.target.value
                if (value === 'all') {
                  onFiltersChange({ distance: { enabled: false, maxKm: 5 } })
                } else {
                  onFiltersChange({ distance: { enabled: true, maxKm: parseInt(value) } })
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
            <div className="filter-label">📊 並び順</div>
            <select
              className="filter-select"
              value={sortState.option}
              onChange={(e) => onSortChange({ ...sortState, option: e.target.value as SortState['option'] })}
            >
              <option value="rating">⭐ 評価順</option>
              <option value="distance" disabled={!hasLocation}>📍 距離順</option>
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
          <FilterTag
            label="📍 現在地周辺"
            active={filters.distance.enabled}
            onClick={() => {
              if (!filters.distance.enabled && onLocationClick) {
                onLocationClick()
              }
              onFiltersChange({ 
                distance: { 
                  enabled: !filters.distance.enabled, 
                  maxKm: filters.distance.enabled ? 5 : 1 
                } 
              })
            }}
          />
          <FilterTag
            label="📶 Wi-Fi完備"
            active={filters.features.includes('wifi')}
            onClick={() => {
              const hasWifi = filters.features.includes('wifi')
              onFiltersChange({ 
                features: hasWifi 
                  ? filters.features.filter(f => f !== 'wifi')
                  : [...filters.features, 'wifi']
              })
            }}
          />
          <FilterTag
            label="🔌 電源あり"
            active={filters.features.includes('power')}
            onClick={() => {
              const hasPower = filters.features.includes('power')
              onFiltersChange({ 
                features: hasPower 
                  ? filters.features.filter(f => f !== 'power')
                  : [...filters.features, 'power']
              })
            }}
          />
          <FilterTag
            label="🕐 営業中"
            active={filters.isOpenNow}
            onClick={() => onFiltersChange({ isOpenNow: !filters.isOpenNow })}
          />
          <FilterTag
            label="⭐ 高評価"
            active={filters.minRating >= 4}
            onClick={() => onFiltersChange({ minRating: filters.minRating >= 4 ? 0 : 4 })}
          />
          <FilterTag
            label="❤️ お気に入り"
            active={filters.showFavoritesOnly}
            onClick={() => onFiltersChange({ showFavoritesOnly: !filters.showFavoritesOnly })}
          />
          <FilterTag
            label="📚 読書向け"
            active={filters.tags.includes('読書歓迎')}
            onClick={() => {
              const hasTag = filters.tags.includes('読書歓迎')
              onFiltersChange({
                tags: hasTag
                  ? filters.tags.filter(t => t !== '読書歓迎')
                  : [...filters.tags, '読書歓迎']
              })
            }}
          />
          <FilterTag
            label="💻 PC作業可"
            active={filters.tags.includes('PC作業可')}
            onClick={() => {
              const hasTag = filters.tags.includes('PC作業可')
              onFiltersChange({
                tags: hasTag
                  ? filters.tags.filter(t => t !== 'PC作業可')
                  : [...filters.tags, 'PC作業可']
              })
            }}
          />
          <FilterTag
            label="🚭 完全禁煙"
            active={filters.tags.includes('完全禁煙')}
            onClick={() => {
              const hasTag = filters.tags.includes('完全禁煙')
              onFiltersChange({
                tags: hasTag
                  ? filters.tags.filter(t => t !== '完全禁煙')
                  : [...filters.tags, '完全禁煙']
              })
            }}
          />
          <FilterTag
            label="🅿️ 駐車場あり"
            active={filters.tags.includes('駐車場あり')}
            onClick={() => {
              const hasTag = filters.tags.includes('駐車場あり')
              onFiltersChange({
                tags: hasTag
                  ? filters.tags.filter(t => t !== '駐車場あり')
                  : [...filters.tags, '駐車場あり']
              })
            }}
          />
          <FilterTag
            label="🌙 夜も営業"
            active={filters.tags.includes('夜営業')}
            onClick={() => {
              const hasTag = filters.tags.includes('夜営業')
              onFiltersChange({
                tags: hasTag
                  ? filters.tags.filter(t => t !== '夜営業')
                  : [...filters.tags, '夜営業']
              })
            }}
          />
          <button
            onClick={onLocationClick}
            disabled={isLocating}
            className={`quick-btn ${isLocating ? 'disabled' : ''}`}
          >
            {isLocating ? '📍 取得中...' : '📍 現在地取得'}
          </button>
          <button
            onClick={onRefresh}
            className="quick-btn"
          >
            🔄 更新
          </button>
          <button
            onClick={onFiltersClear}
            className="quick-btn"
          >
            🗑️ リセット
          </button>
        </div>

        {/* 統計ダッシュボード */}
        <div className="stats-dashboard">
          <div className="stat-card">
            <div className="stat-number">{filteredCount}</div>
            <div className="stat-label">該当店舗</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{openCount}</div>
            <div className="stat-label">営業中</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{favoriteCount}</div>
            <div className="stat-label">お気に入り</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalCount}</div>
            <div className="stat-label">総店舗</div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MapProps {
  refreshTrigger: number
}

export default function Map({ refreshTrigger }: MapProps) {
  const { user } = useUser()
  const { openAuthModal, AuthModal } = useAuthModal()

  // 状態管理
  const [shops, setShops] = useState<ShopWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM)
  const [selectedShop, setSelectedShop] = useState<ShopWithDetails | null>(null)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [sortState, setSortState] = useState<SortState>(defaultSort)
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [icons, setIcons] = useState<any>(null)

  // クライアントサイドでアイコンを初期化
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Leaflet CSSを動的に読み込み
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
      link.crossOrigin = ''
      document.head.appendChild(link)
      
      // アイコンを非同期で作成
      createIcons().then(iconData => {
        if (iconData) {
          setIcons(iconData)
        }
      })
    }
  }, [])

  // ヘルパー関数
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }, [])

  // 営業時間チェック
  const isOpenNow = useCallback((hours: ShopWithDetails['hours']) => {
    if (!hours) return false
    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = now.toTimeString().slice(0, 5)
    const todayHours = hours.find(h => h.day_of_week === currentDay)
    
    if (!todayHours || todayHours.is_closed) return false
    if (!todayHours.open_time || !todayHours.close_time) return false
    
    return currentTime >= todayHours.open_time && currentTime <= todayHours.close_time
  }, [])

  // 平均評価計算
  const calculateAverageRating = useCallback((reviews: ShopWithDetails['reviews']) => {
    if (!reviews || reviews.length === 0) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return sum / reviews.length
  }, [])

  // お気に入り機能
  const toggleFavorite = useCallback(async (shopId: number) => {
    if (!user) {
      openAuthModal()
      return
    }

    try {
      const isFavorite = favorites.has(shopId)
      
      if (isFavorite) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('shop_id', shopId)
        
        setFavorites(prev => {
          const newFavorites = new Set(prev)
          newFavorites.delete(shopId)
          return newFavorites
        })
        showToast('お気に入りから削除しました', 'info')
      } else {
        await supabase
          .from('user_favorites')
          .insert([{ user_id: user.id, shop_id: shopId }])
        
        setFavorites(prev => new Set([...prev, shopId]))
        showToast('お気に入りに追加しました', 'success')
      }
    } catch (error) {
      console.error('お気に入り更新エラー:', error)
      showToast('お気に入りの更新に失敗しました', 'error')
    }
  }, [user, favorites, openAuthModal])

  // お気に入り読み込み
  const loadFavorites = useCallback(async () => {
    if (!user) {
      try {
        const saved = localStorage.getItem('coffee-map-favorites')
        if (saved) {
          setFavorites(new Set(JSON.parse(saved)))
        }
      } catch (error) {
        console.error('ローカルお気に入り読み込みエラー:', error)
      }
    } else {
      try {
        const { data } = await supabase
          .from('user_favorites')
          .select('shop_id')
          .eq('user_id', user.id)

        if (data) {
          setFavorites(new Set(data.map(fav => fav.shop_id)))
        }
      } catch (error) {
        console.error('お気に入り読み込みエラー:', error)
      }
    }
  }, [user])

  // 店舗データを取得
  const fetchShops = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false })

      if (shopsError) throw shopsError

      if (!shopsData || shopsData.length === 0) {
        setShops([])
        return
      }

      // 各店舗の詳細情報を並行取得
      const shopsWithDetails = await Promise.all(
        shopsData.map(async (shop) => {
          const [imagesResult, hoursResult, tagsResult, reviewsResult] = await Promise.all([
            supabase.from('shop_images').select('*').eq('shop_id', shop.id),
            supabase.from('shop_hours').select('*').eq('shop_id', shop.id),
            supabase.from('shop_tags').select('*').eq('shop_id', shop.id),
            supabase.from('reviews').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false })
          ])

          // 距離計算
          const distance = currentLocation ? calculateDistance(
            currentLocation[0], currentLocation[1],
            shop.latitude, shop.longitude
          ) : undefined

          return {
            ...shop,
            images: imagesResult.data || [],
            hours: hoursResult.data || [],
            tags: tagsResult.data || [],
            reviews: reviewsResult.data || [],
            isFavorite: favorites.has(shop.id),
            distance
          }
        })
      )

      setShops(shopsWithDetails)
      
    } catch (error) {
      console.error('店舗データ取得エラー:', error)
      setError('店舗データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [favorites, currentLocation, calculateDistance])

  // フィルタリング処理
  const applyFilters = useCallback((shops: ShopWithDetails[], filters: FilterState): ShopWithDetails[] => {
    return shops.filter(shop => {
      // 検索クエリ
      if (filters.search && !(
        shop.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        shop.address.toLowerCase().includes(filters.search.toLowerCase()) ||
        shop.description?.toLowerCase().includes(filters.search.toLowerCase())
      )) return false

      // カテゴリー
      if (filters.category !== 'all' && shop.category !== filters.category) return false

      // 価格帯
      if (filters.priceRange !== 'all' && shop.price_range.toString() !== filters.priceRange) return false

      // 設備
      if (filters.features.length > 0) {
        for (const feature of filters.features) {
          if (feature === 'wifi' && !shop.has_wifi) return false
          if (feature === 'power' && !shop.has_power) return false
        }
      }

      // お気に入り
      if (filters.showFavoritesOnly && !favorites.has(shop.id)) return false

      // 営業中
      if (filters.isOpenNow && !isOpenNow(shop.hours)) return false

      // 距離
      if (filters.distance.enabled && currentLocation && 
          (shop.distance === undefined || shop.distance > filters.distance.maxKm)) return false

      // タグ
      if (filters.tags.length > 0) {
        const shopTagNames = shop.tags?.map(tag => tag.tag) || []
        for (const filterTag of filters.tags) {
          if (!shopTagNames.includes(filterTag)) return false
        }
      }

      return true
    })
  }, [favorites, isOpenNow, currentLocation])

  // フィルター・ソート処理
  const processedShops = useMemo(() => {
    const filtered = applyFilters(shops, filters)
    const sorted = sortShops(filtered, sortState, currentLocation || undefined)
    return sorted
  }, [shops, filters, sortState, currentLocation, applyFilters])

  // 統計計算
  const statistics = useMemo(() => {
    const filteredCount = processedShops.length
    const totalCount = shops.length
    const openCount = processedShops.filter(shop => isOpenNow(shop.hours)).length
    const favoriteCount = processedShops.filter(shop => favorites.has(shop.id)).length

    return { filteredCount, totalCount, openCount, favoriteCount }
  }, [processedShops, shops, isOpenNow, favorites])

  // 現在地取得
  const getCurrentLocation = useCallback(() => {
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
        setMapCenter(newLocation)
        setMapZoom(LOCATION_ZOOM)
        setIsLocating(false)
        showToast('現在地を取得しました', 'success')
      },
      (error) => {
        setIsLocating(false)
        let errorMessage = '位置情報取得中にエラーが発生しました'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '位置情報の取得が拒否されました'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置情報を取得できません'
            break
          case error.TIMEOUT:
            errorMessage = '位置情報取得がタイムアウトしました'
            break
        }
        showToast(errorMessage, 'error')
      },
      {
        enableHighAccuracy: true,
        timeout: LOCATION_TIMEOUT,
        maximumAge: LOCATION_MAX_AGE
      }
    )
  }, [])

  // 店舗詳細表示
  const showShopDetails = useCallback((shop: ShopWithDetails) => {
    setSelectedShop(shop)
    setSidePanelOpen(true)
  }, [])

  // サイドパネルを閉じる
  const closeSidePanel = useCallback(() => {
    setSidePanelOpen(false)
    setTimeout(() => setSelectedShop(null), 300)
  }, [])

  // フィルターリセット
  const handleFiltersClear = useCallback(() => {
    setFilters(defaultFilters)
    showToast('フィルターをリセットしました', 'info')
  }, [])

  // フィルター更新
  const handleFiltersChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // 初期読み込み
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  useEffect(() => {
    fetchShops()
  }, [refreshTrigger, fetchShops])

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50">
        <div className="text-center p-6">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">エラーが発生しました</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchShops}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            🔄 再試行
          </button>
        </div>
      </div>
    )
  }

  // アイコンが読み込まれていない場合はローディング
  if (!icons) {
    return <LoadingSpinner />
  }

  return (
    <div className="h-full w-full relative">
      {/* 検索・フィルターエリア */}
      <IntegratedSidebar
        filters={filters}
        sortState={sortState}
        hasLocation={!!currentLocation}
        isLocating={isLocating}
        filteredCount={statistics.filteredCount}
        totalCount={statistics.totalCount}
        openCount={statistics.openCount}
        favoriteCount={statistics.favoriteCount}
        onFiltersChange={handleFiltersChange}
        onSortChange={setSortState}
        onLocationClick={getCurrentLocation}
        onRefresh={fetchShops}
        onFiltersClear={handleFiltersClear}
      />

      {/* 地図 */}
      <MapContainer 
        center={mapCenter}
        zoom={mapZoom}
        style={{ 
          height: '100%', 
          width: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
        zoomControl={true}
      >
        <ChangeMapView center={mapCenter} zoom={mapZoom} />
        
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* 現在地マーカー */}
        {currentLocation && (
          <Marker position={currentLocation} icon={icons.CurrentLocationIcon}>
            <Popup className="custom-popup">
              <div className="text-center p-2">
                <strong className="text-blue-600">📍 現在地</strong>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* 店舗マーカー */}
        {processedShops.map((shop) => (
          <Marker
            key={shop.id}
            position={[shop.latitude, shop.longitude]}
            icon={icons.CategoryIcons[shop.category]}
          >
            <Popup className="custom-popup" maxWidth={350}>
              <div className="p-3 max-w-xs">
                {shop.main_image_url && (
                  <Image
                    src={shop.main_image_url}
                    alt={shop.name}
                    width={300}
                    height={120}
                    className="w-full h-24 object-cover rounded-lg mb-3"
                  />
                )}
                
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">
                      {CATEGORIES[shop.category]} {shop.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span className="text-orange-500 font-bold">
                        {PRICE_RANGES[shop.price_range]}
                      </span>
                      {shop.hours && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isOpenNow(shop.hours) 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isOpenNow(shop.hours) ? '営業中' : '営業時間外'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(shop.id)
                    }}
                    className={`text-lg hover:scale-110 transition-transform ${
                      favorites.has(shop.id) ? 'text-red-500' : 'text-gray-400'
                    }`}
                  >
                    {favorites.has(shop.id) ? '❤️' : '🤍'}
                  </button>
                </div>

                {shop.reviews && shop.reviews.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-medium text-sm">{calculateAverageRating(shop.reviews).toFixed(1)}</span>
                    <span className="text-sm text-gray-500">({shop.reviews.length}件)</span>
                  </div>
                )}

                <p className="text-xs text-gray-600 mb-2">
                  📍 {shop.address}
                </p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {shop.has_wifi && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">📶</span>
                  )}
                  {shop.has_power && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">🔌</span>
                  )}
                </div>

                {shop.distance !== undefined && shop.distance > 0 && (
                  <p className="text-xs text-blue-600 mb-3 font-medium">
                    🚶 約 {shop.distance.toFixed(1)}km (徒歩{Math.round(shop.distance * 12)}分)
                  </p>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    showShopDetails(shop)
                  }}
                  className="w-full px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 text-xs font-medium transition-all"
                >
                  📝 詳細を見る・レビューする
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* 店舗が見つからない場合 */}
      {statistics.filteredCount === 0 && !loading && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[500]">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-4 text-center border">
            <div className="text-2xl mb-2">☕</div>
            <div className="text-sm text-gray-700 mb-3">
              条件に一致する店舗が見つかりません
            </div>
            <button
              onClick={handleFiltersClear}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 text-sm font-medium"
            >
              フィルターをリセット
            </button>
          </div>
        </div>
      )}

      {/* サイドパネル */}
      <ShopSidePanel
        shop={selectedShop}
        isOpen={sidePanelOpen}
        onClose={closeSidePanel}
        onToggleFavorite={toggleFavorite}
        isFavorite={selectedShop ? favorites.has(selectedShop.id) : false}
      />

      {/* 認証モーダル */}
      <AuthModal />

      {/* カスタムスタイル */}
      <style jsx global>{`
        /* 検索・フィルターエリア */
        .search-filter-area {
          max-width: 1200px;
          margin: 1.5rem auto;
          padding: 0 1rem;
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 500;
          width: 100%;
        }

        .search-container {
          background: var(--glass-bg);
          backdrop-filter: blur(15px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 8px 24px var(--glass-shadow);
          transition: all 0.3s ease;
        }

        .search-bar {
          position: relative;
          margin-bottom: 1rem;
        }

        .search-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border: 2px solid var(--current-border);
          border-radius: 12px;
          background: var(--current-secondary-bg);
          color: var(--current-text-primary);
          font-size: 1rem;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--accent-warm);
          box-shadow: 0 0 0 4px rgba(255, 140, 66, 0.1);
          transform: translateY(-1px);
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.2rem;
          color: var(--accent-warm);
        }

        /* フィルターセクション */
        .filter-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .filter-group {
          background: var(--current-secondary-bg);
          border: 1px solid var(--current-border);
          border-radius: 12px;
          padding: 1rem;
          transition: all 0.3s ease;
        }

        .filter-group:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .filter-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--current-text-secondary);
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--current-border);
          border-radius: 8px;
          background: var(--current-tertiary-bg);
          color: var(--current-text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--accent-warm);
          box-shadow: 0 0 0 2px rgba(255, 140, 66, 0.1);
        }

        /* クイックアクション */
        .quick-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .quick-btn {
          padding: 0.6rem 1rem;
          border: 1px solid var(--current-border);
          border-radius: 20px;
          background: var(--current-secondary-bg);
          color: var(--current-text-primary);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
          position: relative;
          overflow: hidden;
        }

        .quick-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }

        .quick-btn:hover::before {
          left: 100%;
        }

        .quick-btn:hover,
        .quick-btn.active {
          background: var(--accent-warm);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 140, 66, 0.3);
        }

        .quick-btn.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* 統計ダッシュボード */
        .stats-dashboard {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
          background: var(--current-secondary-bg);
          border: 1px solid var(--current-border);
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .stat-card {
          text-align: center;
          padding: 0.75rem;
          background: var(--current-tertiary-bg);
          border-radius: 8px;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .stat-card:hover {
          transform: scale(1.05);
          background: var(--accent-warm);
          color: white;
        }

        .stat-number {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--accent-coffee);
          margin-bottom: 0.25rem;
        }

        .stat-card:hover .stat-number {
          color: white;
        }

        .stat-label {
          font-size: 0.7rem;
          color: var(--current-text-muted);
          font-weight: 500;
        }

        /* Leaflet ポップアップカスタマイズ */
        .custom-popup .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          padding: 0;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .custom-popup .leaflet-popup-content {
          margin: 0;
          width: 100% !important;
        }

        .custom-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* カスタムマーカー */
        .custom-marker {
          animation: marker-appear 0.5s ease-out;
          transition: all 0.3s ease;
        }

        .custom-marker:hover {
          transform: scale(1.2);
          z-index: 1000 !important;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3));
        }

        .current-location-marker {
          z-index: 999 !important;
        }

        /* アニメーション定義 */
        @keyframes pulse-location {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }

        @keyframes marker-appear {
          from {
            opacity: 0;
            transform: scale(0) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* ズームコントロールを右側に移動 */
        .leaflet-top.leaflet-right {
          top: 20px;
          right: 20px;
        }

        .leaflet-control-zoom {
          border: none;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .leaflet-control-zoom a {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          color: #374151;
          font-weight: bold;
          border: none;
          transition: all 0.2s ease;
        }

        .leaflet-control-zoom a:hover {
          background: #FF8C42;
          color: white;
        }

        /* レスポンシブ対応 */
        @media (max-width: 768px) {
          .search-filter-area {
            margin: 1rem auto;
            padding: 0 0.5rem;
          }

          .search-container {
            padding: 1rem;
          }

          .filter-section {
            grid-template-columns: 1fr;
          }

          .quick-actions {
            justify-content: center;
          }

          .stats-dashboard {
            grid-template-columns: repeat(2, 1fr);
          }

          .leaflet-popup-content {
            font-size: 14px;
          }
          
          .custom-marker {
            transform: scale(0.9);
          }
          
          .custom-marker:hover {
            transform: scale(1.1);
          }
        }

        /* アクセシビリティ向上 */
        @media (prefers-reduced-motion: reduce) {
          .custom-marker,
          .marker-appear {
            animation: none;
            transition: none;
          }
          
          .custom-marker:hover {
            transform: scale(1.1);
          }
        }

        /* ハイコントラストモード対応 */
        @media (prefers-contrast: high) {
          .custom-popup .leaflet-popup-content-wrapper {
            background: white;
            border: 2px solid black;
          }
          
          .custom-popup .leaflet-popup-tip {
            background: white;
            border: 2px solid black;
          }
        }

        /* スクロールバーカスタマイズ */
        .leaflet-popup-content::-webkit-scrollbar {
          width: 4px;
        }
        
        .leaflet-popup-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .leaflet-popup-content::-webkit-scrollbar-thumb {
          background: #FF8C42;
          border-radius: 4px;
        }
        
        .leaflet-popup-content::-webkit-scrollbar-thumb:hover {
          background: #e67e22;
        }
      `}</style>
    </div>
  )
}