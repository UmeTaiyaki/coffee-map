// components/UpdatedMap.tsx - eslint-disable削除版
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import ShopSidePanel from './ShopSidePanel'
import AdvancedFilters from './AdvancedFilters'
import SortSelector from './SortSelector'
import { useAuthModal } from './AuthModal'
import { sortShops, resetRandomSort } from '../utils/sorting'

// 型定義
interface Shop {
  id: number
  name: string
  address: string
  description?: string
  latitude: number
  longitude: number
  created_at?: string
  phone?: string
  website?: string
  has_wifi?: boolean
  has_power?: boolean
  category: 'cafe' | 'roastery' | 'chain' | 'specialty' | 'bakery'
  price_range: 1 | 2 | 3 | 4
  main_image_url?: string
  payment_methods?: string[]
  created_by?: string
}

interface ShopImage {
  id: number
  shop_id: number
  image_url: string
  is_main: boolean
}

interface ShopHours {
  id: number
  shop_id: number
  day_of_week: number
  open_time?: string
  close_time?: string
  is_closed: boolean
}

interface ShopTag {
  id: number
  shop_id: number
  tag: string
}

interface Review {
  id: number
  shop_id: number
  user_id?: string
  reviewer_name: string
  rating: number
  comment: string
  created_at: string
}

interface ShopWithDetails extends Shop {
  images?: ShopImage[]
  hours?: ShopHours[]
  tags?: ShopTag[]
  reviews?: Review[]
  distance?: number
  isFavorite?: boolean
}

// フィルター・ソート型定義（内部で定義）
interface FilterState {
  search: string
  category: string
  priceRange: string
  features: string[]
  showFavoritesOnly: boolean
  isOpenNow: boolean
  openAt: {
    enabled: boolean
    day: number
    time: string
  }
  hasReviews: boolean
  minRating: number
  distance: {
    enabled: boolean
    maxKm: number
  }
  tags: string[]
  paymentMethods: string[]
}

type SortOption = 
  | 'distance' | 'rating' | 'review_count' | 'newest' 
  | 'price_low' | 'price_high' | 'name' | 'random'

interface SortState {
  option: SortOption
  direction: 'asc' | 'desc'
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

interface MapProps {
  refreshTrigger: number
}

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

// 定数
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

// 地図の中心を変更するコンポーネント
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

// 地図リサイズ処理コンポーネント
function MapResizer({ sidePanelOpen }: { sidePanelOpen: boolean }) {
  const map = useMap()
  
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        map.invalidateSize()
      }, 350)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidePanelOpen, map])
  
  return null
}

export default function UpdatedMap({ refreshTrigger }: MapProps) {
  // ユーザー認証
  const { user } = useUser()
  const { isOpen: _authModalOpen, openAuthModal, closeAuthModal: _closeAuthModal, AuthModal } = useAuthModal()

  // 基本状態
  const [shops, setShops] = useState<ShopWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6762, 139.6503])
  const [mapZoom, setMapZoom] = useState(13)

  // UI状態
  const [selectedShop, setSelectedShop] = useState<ShopWithDetails | null>(null)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)

  // フィルター・ソート状態
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [sortState, setSortState] = useState<SortState>(defaultSort)

  // お気に入り状態（認証済みユーザーはDBから、未認証はローカルストレージ）
  const [favorites, setFavorites] = useState<Set<number>>(new Set())

  // 距離計算
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
  const isOpenNow = useCallback((hours: ShopHours[]) => {
    const currentDay = new Date().getDay()
    const currentTime = new Date().toTimeString().slice(0, 5)
    const todayHours = hours.find(h => h.day_of_week === currentDay)
    
    if (!todayHours || todayHours.is_closed) return false
    if (!todayHours.open_time || !todayHours.close_time) return false
    
    return currentTime >= todayHours.open_time && currentTime <= todayHours.close_time
  }, [])

  // 特定時間営業チェック
  const isOpenAt = useCallback((hours: ShopHours[], day: number, time: string) => {
    const dayHours = hours.find(h => h.day_of_week === day)
    if (!dayHours || dayHours.is_closed) return false
    if (!dayHours.open_time || !dayHours.close_time) return false
    return time >= dayHours.open_time && time <= dayHours.close_time
  }, [])

  // 平均評価計算
  const calculateAverageRating = useCallback((reviews: Review[]) => {
    if (!reviews || reviews.length === 0) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return sum / reviews.length
  }, [])

  // お気に入り機能（認証状態に応じてDB/ローカルストレージ切り替え）
  const toggleFavorite = useCallback(async (shopId: number) => {
    if (!user) {
      openAuthModal()
      return
    }

    try {
      if (user.is_anonymous) {
        // 匿名ユーザーはローカルストレージ
        setFavorites(prev => {
          const newFavorites = new Set(prev)
          if (newFavorites.has(shopId)) {
            newFavorites.delete(shopId)
          } else {
            newFavorites.add(shopId)
          }
          localStorage.setItem('coffee-map-favorites', JSON.stringify([...newFavorites]))
          return newFavorites
        })
      } else {
        // 認証済みユーザーはデータベース
        const isFavorite = favorites.has(shopId)
        
        if (isFavorite) {
          const { error } = await supabase
            .from('user_favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('shop_id', shopId)
          
          if (!error) {
            setFavorites(prev => {
              const newFavorites = new Set(prev)
              newFavorites.delete(shopId)
              return newFavorites
            })
          }
        } else {
          const { error } = await supabase
            .from('user_favorites')
            .insert([{ user_id: user.id, shop_id: shopId }])
          
          if (!error) {
            setFavorites(prev => new Set([...prev, shopId]))
          }
        }
      }
    } catch (error) {
      console.error('お気に入り更新エラー:', error)
    }
  }, [user, favorites, openAuthModal])

  // お気に入り読み込み
  const loadFavorites = useCallback(async () => {
    if (!user) {
      // 未認証時はローカルストレージから読み込み
      try {
        const saved = localStorage.getItem('coffee-map-favorites')
        if (saved) {
          setFavorites(new Set(JSON.parse(saved)))
        }
      } catch (error) {
        console.error('ローカルお気に入り読み込みエラー:', error)
      }
    } else if (!user.is_anonymous) {
      // 認証済みユーザーはデータベースから読み込み
      try {
        const { data, error } = await supabase
          .from('user_favorites')
          .select('shop_id')
          .eq('user_id', user.id)

        if (!error && data) {
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
      // 店舗基本情報を取得
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

          // 距離計算（currentLocationがnullでない場合のみ）
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
  const applyFilters = useCallback((shops: ShopWithDetails[], filters: FilterState, currentLocation: [number, number] | null): ShopWithDetails[] => {
    return shops.filter(shop => {
      // 検索クエリフィルター
      const matchesSearch = filters.search === '' || 
        shop.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        shop.address.toLowerCase().includes(filters.search.toLowerCase()) ||
        shop.description?.toLowerCase().includes(filters.search.toLowerCase())

      // カテゴリーフィルター
      const matchesCategory = filters.category === 'all' || shop.category === filters.category

      // 価格帯フィルター
      const matchesPrice = filters.priceRange === 'all' || shop.price_range.toString() === filters.priceRange

      // 設備フィルター
      const matchesFeatures = filters.features.length === 0 || filters.features.every(feature => {
        switch (feature) {
          case 'wifi': return shop.has_wifi
          case 'power': return shop.has_power
          default: return true
        }
      })

      // お気に入りフィルター
      const matchesFavorites = !filters.showFavoritesOnly || favorites.has(shop.id)

      // 現在営業中フィルター
      const matchesOpenNow = !filters.isOpenNow || (shop.hours && isOpenNow(shop.hours))

      // 特定時間営業フィルター
      const matchesOpenAt = !filters.openAt.enabled || 
        (shop.hours && isOpenAt(shop.hours, filters.openAt.day, filters.openAt.time))

      // レビューありフィルター
      const matchesHasReviews = !filters.hasReviews || (shop.reviews && shop.reviews.length > 0)

      // 最小評価フィルター
      const matchesMinRating = filters.minRating === 0 || 
        (shop.reviews && shop.reviews.length > 0 && calculateAverageRating(shop.reviews) >= filters.minRating)

      // 距離フィルター（currentLocationがnullでない場合のみ適用）
      const matchesDistance = !filters.distance.enabled || !currentLocation || 
        (shop.distance !== undefined && shop.distance <= filters.distance.maxKm)

      // タグフィルター
      const matchesTags = filters.tags.length === 0 || 
        (shop.tags && filters.tags.some(tag => shop.tags!.some(shopTag => shopTag.tag === tag)))

      // 決済方法フィルター
      const matchesPaymentMethods = filters.paymentMethods.length === 0 ||
        (shop.payment_methods && filters.paymentMethods.some(method => 
          shop.payment_methods!.includes(method)))

      return matchesSearch && matchesCategory && matchesPrice && matchesFeatures && 
             matchesFavorites && matchesOpenNow && matchesOpenAt && matchesHasReviews && 
             matchesMinRating && matchesDistance && matchesTags && matchesPaymentMethods
    })
  }, [favorites, isOpenNow, isOpenAt, calculateAverageRating])

  // フィルター・ソート処理されたデータ
  const processedShops = useMemo(() => {
    const filtered = applyFilters(shops, filters, currentLocation)
    const sorted = sortShops(filtered, sortState, currentLocation || undefined)
    return sorted
  }, [shops, filters, sortState, currentLocation, applyFilters])

  // 利用可能なタグを取得
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
      setLocationError('このブラウザでは位置情報がサポートされていません')
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const newLocation: [number, number] = [latitude, longitude]
        
        setCurrentLocation(newLocation)
        setMapCenter(newLocation)
        setMapZoom(15)
        setIsLocating(false)
        setLocationError(null)
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
        setLocationError(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 300000
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
    setTimeout(() => {
      setSelectedShop(null)
    }, 300)
  }, [])

  // 初期読み込み
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  useEffect(() => {
    fetchShops()
  }, [refreshTrigger, fetchShops])

  // ランダムソートリセット
  const handleRandomSortReset = () => {
    resetRandomSort()
    setSortState(prev => ({...prev})) // 強制再レンダリング
  }

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center bg-gray-50 border-2 border-gray-200 rounded-lg">
        <div className="text-center p-6">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-sm">地図を読み込み中...</p>
        </div>
      </div>
    )
  }

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
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="🔍 店舗名・住所・説明で検索..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={getCurrentLocation}
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
            onClick={fetchShops}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            🔄 更新
          </button>
        </div>
      </div>

      {/* 基本フィルター */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリー</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
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
              onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
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
              onSortChange={setSortState}
              hasLocation={!!currentLocation}
              className="w-full border-0 p-0"
            />
            {sortState.option === 'random' && (
              <button
                onClick={handleRandomSortReset}
                className="ml-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                title="ランダム順をリセット"
              >
                🔄
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 高度フィルター */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={setFilters}
        currentLocation={currentLocation}
        availableTags={availableTags}
      />

      {/* 統計情報 */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            表示中: <strong className="text-blue-600">{processedShops.length}件</strong>
            {processedShops.length !== shops.length && (
              <span className="text-gray-500"> (全{shops.length}件中)</span>
            )}
          </span>
          
          {currentLocation && (
            <span className="text-green-600">📍 現在地情報取得済み</span>
          )}
          
          {user && (
            <span className="text-purple-600">
              {user.is_anonymous ? '👤 匿名ユーザー' : `👤 ${user.nickname}`}
            </span>
          )}
        </div>
      </div>

      {/* エラー表示 */}
      {locationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-red-500 text-xl">⚠️</span>
            <div>
              <p className="text-red-600 text-sm">{locationError}</p>
              <button
                onClick={() => setLocationError(null)}
                className="text-red-800 text-xs underline mt-1"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

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
                    {/* 店舗画像 */}
                    {shop.main_image_url && (
                      <img
                        src={shop.main_image_url}
                        alt={shop.name}
                        className="w-full h-24 object-cover rounded-lg mb-2"
                      />
                    )}
                    
                    {/* 店舗情報ヘッダー */}
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

                    {/* 住所 */}
                    <p className="text-xs text-gray-600 mb-2">
                      📍 {shop.address}
                    </p>

                    {/* 設備情報 */}
                    <div className="flex gap-1 mb-2">
                      {shop.has_wifi && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          📶
                        </span>
                      )}
                      {shop.has_power && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          🔌
                        </span>
                      )}
                    </div>

                    {/* 距離表示 */}
                    {currentLocation && shop.distance && shop.distance > 0 && (
                      <p className="text-xs text-blue-600 mb-2 font-medium">
                        🚶 約 {shop.distance.toFixed(1)}km
                      </p>
                    )}

                    {/* アクションボタン */}
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

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}