import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import ShopSidePanel from './ShopSidePanel'

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

interface ShopWithDetails extends Shop {
  images?: ShopImage[]
  hours?: ShopHours[]
  tags?: ShopTag[]
  distance?: number
  isFavorite?: boolean
}

interface MapProps {
  refreshTrigger: number
}

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

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'] as const

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
    // サイドパネルの状態変更時に地図をリサイズ
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 300) // アニメーション完了後にリサイズ
    
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

export default function Map({ refreshTrigger }: MapProps) {
  const [shops, setShops] = useState<ShopWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6762, 139.6503])
  const [mapZoom, setMapZoom] = useState(13)
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedShop, setSelectedShop] = useState<ShopWithDetails | null>(null)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [priceFilter, setPriceFilter] = useState<string>('all')
  const [featureFilter, setFeatureFilter] = useState<string[]>([])

  // 現在時刻を取得
  const getCurrentDay = () => new Date().getDay()
  const getCurrentTime = () => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  }

  // 営業時間チェック
  const isOpenNow = (hours: ShopHours[]) => {
    const currentDay = getCurrentDay()
    const currentTime = getCurrentTime()
    const todayHours = hours.find(h => h.day_of_week === currentDay)
    
    if (!todayHours || todayHours.is_closed) return false
    if (!todayHours.open_time || !todayHours.close_time) return false
    
    return currentTime >= todayHours.open_time && currentTime <= todayHours.close_time
  }

  // 営業時間を表示用にフォーマット
  const formatHours = (hours: ShopHours[]) => {
    const todayHours = hours.find(h => h.day_of_week === getCurrentDay())
    if (!todayHours) return '営業時間不明'
    if (todayHours.is_closed) return '本日定休日'
    if (!todayHours.open_time || !todayHours.close_time) return '営業時間不明'
    
    return `${todayHours.open_time} - ${todayHours.close_time}`
  }

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

  // 店舗データを取得（詳細情報も含む）
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
          const [imagesResult, hoursResult, tagsResult] = await Promise.all([
            supabase.from('shop_images').select('*').eq('shop_id', shop.id),
            supabase.from('shop_hours').select('*').eq('shop_id', shop.id),
            supabase.from('shop_tags').select('*').eq('shop_id', shop.id)
          ])

          return {
            ...shop,
            images: imagesResult.data || [],
            hours: hoursResult.data || [],
            tags: tagsResult.data || [],
            isFavorite: favorites.has(shop.id),
            distance: currentLocation ? calculateDistance(
              currentLocation[0], currentLocation[1],
              shop.latitude, shop.longitude
            ) : 0
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

  // フィルタリング
  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      // 検索クエリフィルター
      const matchesSearch = searchQuery === '' || 
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // カテゴリーフィルター
      const matchesCategory = categoryFilter === 'all' || shop.category === categoryFilter
      
      // 価格帯フィルター
      const matchesPrice = priceFilter === 'all' || shop.price_range.toString() === priceFilter
      
      // 機能フィルター
      const matchesFeatures = featureFilter.length === 0 || featureFilter.every(feature => {
        switch (feature) {
          case 'wifi': return shop.has_wifi
          case 'power': return shop.has_power
          case 'open': return shop.hours && isOpenNow(shop.hours)
          default: return true
        }
      })
      
      // お気に入りフィルター
      const matchesFavorites = !showFavoritesOnly || favorites.has(shop.id)
      
      return matchesSearch && matchesCategory && matchesPrice && matchesFeatures && matchesFavorites
    })
  }, [shops, searchQuery, categoryFilter, priceFilter, featureFilter, showFavoritesOnly, favorites])

  // お気に入り機能
  const toggleFavorite = useCallback((shopId: number) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(shopId)) {
        newFavorites.delete(shopId)
      } else {
        newFavorites.add(shopId)
      }
      
      try {
        localStorage.setItem('coffee-map-favorites', JSON.stringify([...newFavorites]))
      } catch (error) {
        console.error('お気に入りの保存に失敗しました:', error)
      }
      
      return newFavorites
    })
  }, [])

  // 店舗詳細を表示（詳細ボタンクリック時のみ）
  const showShopDetails = useCallback((shop: ShopWithDetails) => {
    setSelectedShop(shop)
    setSidePanelOpen(true)
  }, [])

  // サイドパネルを閉じる
  const closeSidePanel = useCallback(() => {
    setSidePanelOpen(false)
    // アニメーション完了後にselectedShopをクリア
    setTimeout(() => {
      setSelectedShop(null)
    }, 300)
  }, [])

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

  // 機能フィルター切り替え
  const toggleFeatureFilter = (feature: string) => {
    setFeatureFilter(prev => 
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    )
  }

  // 初期読み込み
  useEffect(() => {
    // お気に入り読み込み
    try {
      const saved = localStorage.getItem('coffee-map-favorites')
      if (saved) {
        setFavorites(new Set(JSON.parse(saved)))
      }
    } catch (error) {
      console.error('お気に入り読み込みエラー:', error)
    }
  }, [])

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
      {/* 拡張された検索・フィルター */}
      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        {/* 検索バー */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="🔍 店舗名・住所・説明で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              setSearchQuery('')
              setCategoryFilter('all')
              setPriceFilter('all')
              setFeatureFilter([])
              setShowFavoritesOnly(false)
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            クリア
          </button>
        </div>

        {/* カテゴリー・価格帯フィルター */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリー</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
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
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              {Object.entries(PRICE_RANGES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">機能</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'wifi', label: '📶 Wi-Fi' },
                { key: 'power', label: '🔌 電源' },
                { key: 'open', label: '🕐 営業中' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleFeatureFilter(key)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    featureFilter.includes(key)
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* その他のオプション */}
        <div className="flex justify-between items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showFavoritesOnly}
              onChange={(e) => setShowFavoritesOnly(e.target.checked)}
              className="mr-2"
            />
            ❤️ お気に入りのみ表示
          </label>
          
          <div className="flex gap-2">
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
      </div>

      {/* 統計情報 */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            表示中: <strong className="text-blue-600">{filteredShops.length}件</strong>
            {filteredShops.length !== shops.length && (
              <span className="text-gray-500"> (全{shops.length}件中)</span>
            )}
          </span>
          
          {currentLocation && (
            <span className="text-green-600">📍 現在地から近い順</span>
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

      {/* 地図 - サイドパネル表示時はマージンではなく幅を調整 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div 
          className={`h-96 transition-all duration-300 ${
            sidePanelOpen ? 'md:mr-[28rem]' : ''
          }`}
        >
          <MapContainer 
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
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
            
            {/* 店舗マーカー - クリック時はポップアップのみ表示 */}
            {filteredShops.map((shop) => (
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

                    {/* アクションボタン - 詳細ボタンのみでサイドパネルを表示 */}
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
      {filteredShops.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">☕</div>
          <div className="text-lg text-gray-600 mb-4">
            {searchQuery || categoryFilter !== 'all' || priceFilter !== 'all' || featureFilter.length > 0 || showFavoritesOnly
              ? '条件に一致する店舗が見つかりません'
              : 'まだ店舗が登録されていません'
            }
          </div>
          {(searchQuery || categoryFilter !== 'all' || priceFilter !== 'all' || featureFilter.length > 0 || showFavoritesOnly) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('all')
                setPriceFilter('all')
                setFeatureFilter([])
                setShowFavoritesOnly(false)
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              フィルターをリセット
            </button>
          )}
        </div>
      )}

      {/* 店舗一覧（距離順） - サイドパネル表示時は幅を調整 */}
      {currentLocation && filteredShops.length > 0 && (
        <div className={`bg-white p-4 rounded-lg shadow-sm transition-all duration-300 ${
          sidePanelOpen ? 'md:mr-[28rem]' : ''
        }`}>
          <h3 className="text-lg font-medium mb-3 text-gray-800">📍 現在地から近い店舗</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {filteredShops
              .filter(shop => shop.distance && shop.distance > 0)
              .sort((a, b) => (a.distance || 0) - (b.distance || 0))
              .slice(0, 10)
              .map((shop) => (
                <div 
                  key={shop.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => showShopDetails(shop)}
                >
                  <div className="flex items-center gap-3">
                    {shop.main_image_url && (
                      <img
                        src={shop.main_image_url}
                        alt={shop.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={favorites.has(shop.id) ? 'text-red-500' : ''}>
                          {favorites.has(shop.id) ? '❤️' : CATEGORIES[shop.category]}
                        </span>
                        <span className="font-medium text-gray-800">{shop.name}</span>
                        <span className="text-orange-500 text-sm">
                          {PRICE_RANGES[shop.price_range]}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        {shop.hours && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            isOpenNow(shop.hours) 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {isOpenNow(shop.hours) ? '営業中' : '営業時間外'}
                          </span>
                        )}
                        {shop.has_wifi && <span className="text-blue-600">📶</span>}
                        {shop.has_power && <span className="text-green-600">🔌</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-blue-600 font-medium">
                      {shop.distance?.toFixed(1)}km
                    </div>
                    <div className="text-xs text-gray-500">
                      徒歩{Math.round((shop.distance || 0) * 12)}分
                    </div>
                  </div>
                </div>
              ))}
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

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}