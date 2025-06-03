// components/Map.tsx - 完全版
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
    
    const DefaultIcon = L.default.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    const CurrentLocationIcon = L.default.icon({
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTIiIGZpbGw9IiMzMzg4RkYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIvPgo8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI0IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    })
    
    return { DefaultIcon, CurrentLocationIcon }
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

// マップリサイズコンポーネント
function MapResizer({ sidePanelOpen }: { sidePanelOpen: boolean }) {
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
    const timer = setTimeout(() => map.invalidateSize(), 350)
    return () => clearTimeout(timer)
  }, [sidePanelOpen, map])
  
  return null
}

// ローディングコンポーネント
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-6">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 text-sm">地図を読み込み中...</p>
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
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-blue-100 text-blue-800 border border-blue-200'
          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  )
}

// コンパクトサイドバーコンポーネント（地図上に表示）
function MapSidebar({
  filters,
  sortState,
  hasLocation,
  isLocating,
  filteredCount,
  totalCount,
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
  onFiltersChange: (filters: Partial<FilterState>) => void
  onSortChange: (sort: SortState) => void
  onLocationClick: () => void
  onRefresh: () => void
  onFiltersClear: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="absolute top-4 left-4 z-[500] w-80 lg:w-96">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* 検索セクション（常時表示） */}
        <div className="p-4 border-b border-gray-200">
          {/* 検索バー */}
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="店舗名・住所・説明で検索..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* クイックアクション */}
          <div className="flex gap-2">
            <button
              onClick={onLocationClick}
              disabled={isLocating}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isLocating 
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isLocating ? '📍 取得中...' : '📍 現在地取得'}
            </button>
            <button
              onClick={onRefresh}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors"
            >
              🔄 更新
            </button>
          </div>
        </div>

        {/* 基本フィルター */}
        <div className={`border-b border-gray-200 transition-all ${isExpanded ? '' : 'max-h-0 overflow-hidden'}`}>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">🔧 基本フィルター</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">カテゴリー</label>
                <select
                  value={filters.category}
                  onChange={(e) => onFiltersChange({ category: e.target.value as FilterState['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">すべて</option>
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">価格帯</label>
                <select
                  value={filters.priceRange}
                  onChange={(e) => onFiltersChange({ priceRange: e.target.value as FilterState['priceRange'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">すべて</option>
                  {Object.entries(PRICE_RANGES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* クイックフィルター */}
            <div className="flex flex-wrap gap-2">
              <FilterTag
                label="🕐 現在営業中"
                active={filters.isOpenNow}
                onClick={() => onFiltersChange({ isOpenNow: !filters.isOpenNow })}
              />
              <FilterTag
                label="📶 Wi-Fi"
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
                label="🔌 電源"
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
                label="❤️ お気に入り"
                active={filters.showFavoritesOnly}
                onClick={() => onFiltersChange({ showFavoritesOnly: !filters.showFavoritesOnly })}
              />
            </div>
          </div>

          {/* ソート設定 */}
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">📊 並び順</h3>
            <select
              value={sortState.option}
              onChange={(e) => onSortChange({ ...sortState, option: e.target.value as SortState['option'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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

        {/* 統計・展開ボタン */}
        <div className="p-3 bg-gray-50 flex justify-between items-center">
          <div className="text-xs text-gray-600">
            <span>表示中: <strong className="text-blue-600">{filteredCount}件</strong></span>
            {filteredCount !== totalCount && (
              <span className="text-gray-500"> (全{totalCount}件中)</span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {isExpanded ? '▲ 閉じる' : '▼ 詳細設定'}
          </button>
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

  // 特定時間営業チェック
  const isOpenAt = useCallback((hours: ShopWithDetails['hours'], day: number, time: string) => {
    if (!hours) return false
    const dayHours = hours.find(h => h.day_of_week === day)
    if (!dayHours || dayHours.is_closed) return false
    if (!dayHours.open_time || !dayHours.close_time) return false
    return time >= dayHours.open_time && time <= dayHours.close_time
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
      } else {
        await supabase
          .from('user_favorites')
          .insert([{ user_id: user.id, shop_id: shopId }])
        
        setFavorites(prev => new Set([...prev, shopId]))
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

      // 特定時間営業
      if (filters.openAt.enabled && !isOpenAt(shop.hours, filters.openAt.day, filters.openAt.time)) return false

      // レビューあり
      if (filters.hasReviews && (!shop.reviews || shop.reviews.length === 0)) return false

      // 最小評価
      if (filters.minRating > 0 && (!shop.reviews || shop.reviews.length === 0 || 
          calculateAverageRating(shop.reviews) < filters.minRating)) return false

      // 距離
      if (filters.distance.enabled && currentLocation && 
          (shop.distance === undefined || shop.distance > filters.distance.maxKm)) return false

      // タグ
      if (filters.tags.length > 0 && (!shop.tags || 
          !filters.tags.some(tag => shop.tags!.some(shopTag => shopTag.tag === tag)))) return false

      // 決済方法
      if (filters.paymentMethods.length > 0 && (!shop.payment_methods || 
          !filters.paymentMethods.some(method => shop.payment_methods!.includes(method)))) return false

      return true
    })
  }, [favorites, isOpenNow, isOpenAt, calculateAverageRating, currentLocation])

  // フィルター・ソート処理
  const processedShops = useMemo(() => {
    const filtered = applyFilters(shops, filters)
    const sorted = sortShops(filtered, sortState, currentLocation || undefined)
    return sorted
  }, [shops, filters, sortState, currentLocation, applyFilters])

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
      <div className="min-h-screen flex items-center justify-center bg-red-50">
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
      >
        <ChangeMapView center={mapCenter} zoom={mapZoom} />
        <MapResizer sidePanelOpen={sidePanelOpen} />
        
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* 現在地マーカー */}
        {currentLocation && (
          <Marker position={currentLocation} icon={icons.CurrentLocationIcon}>
            <Popup>
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
            icon={icons.DefaultIcon}
          >
            <Popup>
              <div className="p-2 max-w-xs">
                {shop.main_image_url && (
                  <Image
                    src={shop.main_image_url}
                    alt={shop.name}
                    width={200}
                    height={96}
                    className="w-full h-24 object-cover rounded-lg mb-2"
                  />
                )}
                
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">
                      {CATEGORIES[shop.category]} {shop.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-orange-500">
                        {PRICE_RANGES[shop.price_range]}
                      </span>
                      {shop.hours && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          isOpenNow(shop.hours) 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isOpenNow(shop.hours) ? '営業中' : '営業時間外'}
                        </span>
                      )}
                      {shop.reviews && shop.reviews.length > 0 && (
                        <span className="text-yellow-500">
                          ⭐ {calculateAverageRating(shop.reviews).toFixed(1)}
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

                <p className="text-xs text-gray-600 mb-2">
                  📍 {shop.address}
                </p>

                <div className="flex gap-1 mb-2">
                  {shop.has_wifi && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">📶</span>
                  )}
                  {shop.has_power && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">🔌</span>
                  )}
                </div>

                {shop.distance !== undefined && shop.distance > 0 && (
                  <p className="text-xs text-blue-600 mb-2 font-medium">
                    🚶 約 {shop.distance.toFixed(1)}km
                  </p>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    showShopDetails(shop)
                  }}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs transition-colors"
                >
                  詳細を見る
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* 地図上のサイドバー */}
      <MapSidebar
        filters={filters}
        sortState={sortState}
        hasLocation={!!currentLocation}
        isLocating={isLocating}
        filteredCount={processedShops.length}
        totalCount={shops.length}
        onFiltersChange={handleFiltersChange}
        onSortChange={setSortState}
        onLocationClick={getCurrentLocation}
        onRefresh={fetchShops}
        onFiltersClear={handleFiltersClear}
      />

      {/* 店舗が見つからない場合（地図上に表示） */}
      {processedShops.length === 0 && !loading && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[500]">
          <div className="bg-white rounded-lg shadow-lg p-4 text-center">
            <div className="text-2xl mb-2">☕</div>
            <div className="text-sm text-gray-600 mb-3">
              条件に一致する店舗が見つかりません
            </div>
            <button
              onClick={() => setFilters(defaultFilters)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
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
    </div>
  )
}