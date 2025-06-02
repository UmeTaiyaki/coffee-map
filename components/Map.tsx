// components/Map.tsx - TypeScriptエラー修正版
'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import ShopSidePanel from './ShopSidePanel'
import { useAuthModal } from './AuthModal'
import { showToast } from './ToastNotification'
import type { ShopWithDetails } from '../types/shop'

// 定数
const DEFAULT_CENTER: [number, number] = [35.6762, 139.6503] // 東京駅
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

// Leafletアイコン設定（型安全性を確保）
const createDefaultIcon = (): L.Icon => {
  return L.icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
}

const createCurrentLocationIcon = (): L.Icon => {
  return L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTIiIGZpbGw9IiMzMzg4RkYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIvPgo8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI0IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  })
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
    const timer = setTimeout(() => {
      if (map) {
        map.invalidateSize()
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [sidePanelOpen, map])
  
  return null
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
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
  category,
  priceRange,
  onCategoryChange,
  onPriceRangeChange
}: {
  category: string
  priceRange: string
  onCategoryChange: (value: string) => void
  onPriceRangeChange: (value: string) => void
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリー</label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
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
            value={priceRange}
            onChange={(e) => onPriceRangeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべて</option>
            {Object.entries(PRICE_RANGES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">並び順</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="distance">📍 距離順</option>
            <option value="rating">⭐ 評価順</option>
            <option value="newest">🆕 新着順</option>
            <option value="name">🔤 名前順</option>
          </select>
        </div>
      </div>

      {/* クイックフィルター */}
      <div className="flex flex-wrap gap-2 mt-4">
        <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors">
          🕐 現在営業中
        </button>
        <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors">
          📶 Wi-Fi
        </button>
        <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors">
          🔌 電源
        </button>
        <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors">
          ❤️ お気に入り
        </button>
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
        
        <div className="flex items-center gap-4">
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
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [searchValue, setSearchValue] = useState('')
  const [category, setCategory] = useState('all')
  const [priceRange, setPriceRange] = useState('all')
  const [isClient, setIsClient] = useState(false)

  // アイコンをメモ化
  const defaultIcon = useMemo(() => {
    if (typeof window !== 'undefined') {
      return createDefaultIcon()
    }
    return undefined
  }, [])

  const currentLocationIcon = useMemo(() => {
    if (typeof window !== 'undefined') {
      return createCurrentLocationIcon()
    }
    return undefined
  }, [])

  // クライアントサイド判定とLeafletの初期化
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Leafletのデフォルトアイコン問題を修正
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })
      setIsClient(true)
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
  const isOpenNow = useCallback((hours?: ShopWithDetails['hours']) => {
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
  const calculateAverageRating = useCallback((reviews?: ShopWithDetails['reviews']) => {
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
        setLoading(false)
        return
      }

      // 各店舗の詳細情報を並行取得
      const shopsWithDetails = await Promise.all(
        shopsData.map(async (shop) => {
          try {
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
          } catch (error) {
            console.error(`店舗 ${shop.id} の詳細情報取得エラー:`, error)
            return {
              ...shop,
              images: [],
              hours: [],
              tags: [],
              reviews: [],
              isFavorite: favorites.has(shop.id),
              distance: undefined
            }
          }
        })
      )

      setShops(shopsWithDetails)
      
    } catch (error) {
      console.error('店舗データ取得エラー:', error)
      setError('店舗データの取得に失敗しました。再試行してください。')
    } finally {
      setLoading(false)
    }
  }, [favorites, currentLocation, calculateDistance])

  // フィルタリング処理
  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      // 検索クエリ
      if (searchValue && !(
        shop.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        shop.address.toLowerCase().includes(searchValue.toLowerCase()) ||
        shop.description?.toLowerCase().includes(searchValue.toLowerCase())
      )) return false

      // カテゴリー
      if (category !== 'all' && shop.category !== category) return false

      // 価格帯
      if (priceRange !== 'all' && shop.price_range.toString() !== priceRange) return false

      return true
    })
  }, [shops, searchValue, category, priceRange])

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
    setSearchValue('')
    setCategory('all')
    setPriceRange('all')
  }, [])

  // 初期読み込み
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  useEffect(() => {
    if (isClient) {
      fetchShops()
    }
  }, [refreshTrigger, fetchShops, isClient])

  // ローディング表示
  if (loading || !isClient) {
    return (
      <div className="w-full space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-sm animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="min-h-96 bg-gray-50 border-2 border-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-center p-6">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 text-sm">地図を読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  // エラー表示
  if (error) {
    return (
      <div className="w-full space-y-4">
        <SearchBar
          value={searchValue}
          onChange={setSearchValue}
          onClear={handleFiltersClear}
          onLocationClick={getCurrentLocation}
          onRefresh={fetchShops}
          isLocating={isLocating}
        />
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
      </div>
    )
  }

  return (
    <div className="w-full space-y-4 relative">
      {/* 検索バー */}
      <SearchBar
        value={searchValue}
        onChange={setSearchValue}
        onClear={handleFiltersClear}
        onLocationClick={getCurrentLocation}
        onRefresh={fetchShops}
        isLocating={isLocating}
      />

      {/* 基本フィルター */}
      <BasicFilters
        category={category}
        priceRange={priceRange}
        onCategoryChange={setCategory}
        onPriceRangeChange={setPriceRange}
      />

      {/* 統計情報 */}
      <StatsBar
        totalShops={shops.length}
        filteredShops={filteredShops.length}
        hasLocation={!!currentLocation}
        user={user}
      />

      {/* 地図 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="h-96 w-full relative">
          {isClient && defaultIcon && (
            <MapContainer 
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              attributionControl={true}
            >
              <ChangeMapView center={mapCenter} zoom={mapZoom} />
              <MapResizer sidePanelOpen={sidePanelOpen} />
              
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* 現在地マーカー */}
              {currentLocation && currentLocationIcon && (
                <Marker position={currentLocation} icon={currentLocationIcon}>
                  <Popup>
                    <div className="text-center p-2">
                      <strong className="text-blue-600">📍 現在地</strong>
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* 店舗マーカー */}
              {filteredShops.map((shop) => (
                <Marker
                  key={shop.id}
                  position={[shop.latitude, shop.longitude]}
                  icon={defaultIcon}
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
          )}
        </div>
      </div>

      {/* 店舗が見つからない場合 */}
      {filteredShops.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">☕</div>
          <div className="text-lg text-gray-600 mb-4">
            {shops.length === 0 ? '店舗データがありません' : '条件に一致する店舗が見つかりません'}
          </div>
          <div className="text-sm text-gray-500 mb-4">
            {shops.length === 0 ? 'まずは店舗を追加してみましょう！' : 'フィルターを調整してみてください'}
          </div>
          <button
            onClick={shops.length === 0 ? fetchShops : handleFiltersClear}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {shops.length === 0 ? '🔄 再読み込み' : 'フィルターをリセット'}
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