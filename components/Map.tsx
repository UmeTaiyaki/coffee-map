// components/Map.tsx - 統合版（UpdatedMapベース）
'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import ShopSidePanel from './ShopSidePanel'
import AdvancedFilters from './AdvancedFilters'
import SortSelector from './SortSelector'
import { useAuthModal } from './AuthModal'
import { sortShops, resetRandomSort } from '../utils/sorting'
import { showToast } from './ToastNotification'
import type { FilterState, SortState } from '../types/filters'
import type { ShopWithDetails } from '../types/shop'

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

// アイコン設定
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const CurrentLocationIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTIiIGZpbGw9IiMzMzg4RkYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIvPgo8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI0IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
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

// マップビュー変更コンポーネント
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    if (map) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])
  return null
}

// マップリサイズコンポーネント
function MapResizer({ sidePanelOpen }: { sidePanelOpen: boolean }) {
  const map = useMap()
  
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 350)
    return () => clearTimeout(timer)
  }, [sidePanelOpen, map])
  
  return null
}

// ローディングコンポーネント
function LoadingSpinner() {
  return (
    <div className="min-h-96 flex items-center justify-center bg-gray-50 border-2 border-gray-200 rounded-lg">
      <div className="text-center p-6">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 text-sm">地図を読み込み中...</p>
      </div>
    </div>
  )
}

// 検索バーコンポーネント
function SearchBar({ 
  value, 
  onChange, 
  onClear,
  onLocationClick,
  onRefresh,
  isLocating 
}: {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  onLocationClick: () => void
  onRefresh: () => void
  isLocating: boolean
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="🔍 店舗名・住所・説明で検索..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onLocationClick}
          disabled={isLocating}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            isLocating 
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isLocating ? '📍 取得中...' : '📍 現在地取得'}
        </button>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          🔄 更新
        </button>
      </div>
    </div>
  )
}

// 基本フィルターコンポーネント
function BasicFilters({
  filters,
  sortState,
  hasLocation,
  onFiltersChange,
  onSortChange,
  onRandomReset
}: {
  filters: FilterState
  sortState: SortState
  hasLocation: boolean
  onFiltersChange: (filters: Partial<FilterState>) => void
  onSortChange: (sort: SortState) => void
  onRandomReset: () => void
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリー</label>
          <select
            value={filters.category}
            onChange={(e) => onFiltersChange({ category: e.target.value as FilterState['category'] })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべて</option>
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">価格帯</label>
          <select
            value={filters.priceRange}
            onChange={(e) => onFiltersChange({ priceRange: e.target.value as FilterState['priceRange'] })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべて</option>
            {Object.entries(PRICE_RANGES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <SortSelector
            sortState={sortState}
            onSortChange={onSortChange}
            hasLocation={hasLocation}
            className="w-full border-0 p-0"
          />
          {sortState.option === 'random' && (
            <button
              onClick={onRandomReset}
              className="ml-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
              title="ランダム順をリセット"
            >
              🔄
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// 統計情報コンポーネント
function StatsBar({ 
  totalShops, 
  filteredShops, 
  hasLocation, 
  user 
}: {
  totalShops: number
  filteredShops: number
  hasLocation: boolean
  user: any
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          表示中: <strong className="text-blue-600">{filteredShops}件</strong>
          {filteredShops !== totalShops && (
            <span className="text-gray-500"> (全{totalShops}件中)</span>
          )}
        </span>
        
        {hasLocation && (
          <span className="text-green-600">📍 現在地情報取得済み</span>
        )}
        
        {user && (
          <span className="text-purple-600">
            👤 {user.nickname || 'Coffee Lover'}
          </span>
        )}
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

  // 利用可能なタグ
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    shops.forEach(shop => {
      shop.tags?.forEach(tag => tagSet.add(tag.tag))
    })
    return Array.from(tagSet).sort()
  }, [shops])

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

  // ランダムソートリセット
  const handleRandomSortReset = useCallback(() => {
    resetRandomSort()
    setSortState(prev => ({...prev}))
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
      <div className="min-h-96 flex items-center justify-center bg-red-50 border-2 border-red-200 rounded-lg">
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

  return (
    <div className="w-full space-y-4 relative">
      {/* 検索バー */}
      <SearchBar
        value={filters.search}
        onChange={(value) => handleFiltersChange({ search: value })}
        onClear={handleFiltersClear}
        onLocationClick={getCurrentLocation}
        onRefresh={fetchShops}
        isLocating={isLocating}
      />

      {/* 基本フィルター */}
      <BasicFilters
        filters={filters}
        sortState={sortState}
        hasLocation={!!currentLocation}
        onFiltersChange={handleFiltersChange}
        onSortChange={setSortState}
        onRandomReset={handleRandomSortReset}
      />

      {/* 高度フィルター */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={setFilters}
        currentLocation={currentLocation}
        availableTags={availableTags}
      />

      {/* 統計情報 */}
      <StatsBar
        totalShops={shops.length}
        filteredShops={processedShops.length}
        hasLocation={!!currentLocation}
        user={user}
      />

      {/* 地図 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div 
          className={`transition-all duration-300 ease-in-out ${
            sidePanelOpen ? 'h-96 md:h-96' : 'h-96'
          }`}
          style={{
            width: '100%',
            position: 'relative'
          }}
        >
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
              attribution='&copy; OpenStreetMap contributors'
            />
            
            {/* 現在地マーカー */}
            {currentLocation && (
              <Marker position={currentLocation} icon={CurrentLocationIcon}>
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
                icon={DefaultIcon}
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
        </div>
      </div>

      {/* 店舗が見つからない場合 */}
      {processedShops.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">☕</div>
          <div className="text-lg text-gray-600 mb-4">
            条件に一致する店舗が見つかりません
          </div>
          <button
            onClick={() => setFilters(defaultFilters)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            フィルターをリセット
          </button>
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