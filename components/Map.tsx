import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'

// 地図の中心を変更するコンポーネント
interface ChangeMapViewProps {
  center: [number, number];
  zoom: number;
}

function ChangeMapView({ center, zoom }: ChangeMapViewProps) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

// Leafletの型拡張
interface LeafletIconDefault extends L.Icon.Default {
  _getIconUrl?: string
}

interface Shop {
  id: number
  name: string
  address: string
  description?: string
  latitude: number
  longitude: number
  created_at?: string
  phone?: string
  opening_hours?: string
  has_wifi?: boolean
  has_power?: boolean
  website?: string
}

interface ShopWithDistance extends Shop {
  distance: number
  isFavorite?: boolean
}

interface MapProps {
  refreshTrigger: number
}

// アニメーション用のCSS-in-JS スタイル
const animationStyles = {
  fadeIn: {
    animation: 'fadeIn 0.3s ease-out'
  },
  slideUp: {
    animation: 'slideUp 0.3s ease-out'
  },
  bounce: {
    animation: 'bounce 0.6s ease-out'
  }
}

// カスタムアイコン設定
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

// Leafletのデフォルトアイコンパスの修正
delete (L.Icon.Default.prototype as LeafletIconDefault)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

// エラー境界コンポーネント
interface ErrorBoundaryProps {
  onRetry: () => void;
}

function ErrorBoundary({ onRetry }: ErrorBoundaryProps) {
  return (
    <div className="min-h-96 flex items-center justify-center bg-red-50 border-2 border-red-200 rounded-lg">
      <div className="text-center p-6">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">エラーが発生しました</h3>
        <p className="text-red-600 text-sm mb-4">地図の読み込みに失敗しました</p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium min-h-[44px] min-w-[44px]"
          aria-label="地図を再読み込み"
        >
          🔄 再試行
        </button>
      </div>
    </div>
  )
}

// ローディングコンポーネント
function LoadingSpinner() {
  return (
    <div className="min-h-96 flex items-center justify-center bg-gray-50 border-2 border-gray-200 rounded-lg">
      <div className="text-center p-6" style={animationStyles.fadeIn}>
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 text-sm">地図を読み込み中...</p>
      </div>
    </div>
  )
}

export default function Map({ refreshTrigger }: MapProps) {
  // 状態管理の最適化
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6762, 139.6503])
  const [mapZoom, setMapZoom] = useState(13)
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [shopRatings, setShopRatings] = useState<Record<number, { average: number, count: number }>>({})
  const [showStats, setShowStats] = useState(false)

  // 店舗の評価を取得（メモ化）
  const fetchShopRatings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('shop_id, rating')

      if (error) throw error

      const ratings: Record<number, { average: number, count: number }> = {}
      
      data?.forEach(review => {
        if (!ratings[review.shop_id]) {
          ratings[review.shop_id] = { average: 0, count: 0 }
        }
        ratings[review.shop_id].count++
      })

      // 各店舗の平均評価を計算
      for (const shopId in ratings) {
        const shopReviews = data?.filter(r => r.shop_id === parseInt(shopId)) || []
        const average = shopReviews.reduce((sum, r) => sum + r.rating, 0) / shopReviews.length
        ratings[parseInt(shopId)].average = average
      }

      setShopRatings(ratings)
    } catch (error) {
      console.error('評価取得エラー:', error)
      // エラーは無視してUIに影響を与えない
    }
  }, [])

  // お気に入り機能（最適化）
  useEffect(() => {
    if (isClient) {
      try {
        const savedFavorites = localStorage.getItem('coffee-map-favorites')
        if (savedFavorites) {
          setFavorites(new Set(JSON.parse(savedFavorites)))
        }
      } catch (error) {
        console.error('お気に入りの読み込みに失敗しました:', error)
      }
    }
  }, [isClient])

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

  // 星の表示用関数（メモ化）
  const renderStars = useCallback((rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}>
          ⭐
        </span>
      )
    }
    return stars
  }, [])

  // 現在地を取得する関数（改善されたエラーハンドリング）
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('このブラウザでは位置情報がサポートされていません')
      return
    }

    setIsLocating(true)
    setLocationError(null)

    const timeoutId = setTimeout(() => {
      setLocationError('位置情報の取得がタイムアウトしました')
      setIsLocating(false)
    }, 15000) // 15秒でタイムアウト

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId)
        const { latitude, longitude } = position.coords
        const newLocation: [number, number] = [latitude, longitude]
        
        setCurrentLocation(newLocation)
        setMapCenter(newLocation)
        setMapZoom(15)
        setIsLocating(false)
        setLocationError(null)
        
        console.log('現在地を取得しました:', { latitude, longitude })
      },
      (error) => {
        clearTimeout(timeoutId)
        console.error('位置情報取得エラー:', error)
        setIsLocating(false)
        
        let errorMessage = '位置情報取得中にエラーが発生しました'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '位置情報の取得が拒否されました。ブラウザの設定を確認してください。'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置情報を取得できません。GPS機能を確認してください。'
            break
          case error.TIMEOUT:
            errorMessage = '位置情報取得がタイムアウトしました。再試行してください。'
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

  // 距離計算関数（メモ化）
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }, [])

  // 店舗データを取得する関数（改善されたエラーハンドリング）
  const fetchShops = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // まずテーブルの存在確認
      const { error: testError } = await supabase
        .from('shops')
        .select('*')
        .limit(1)

      if (testError) {
        if (testError.message.includes('does not exist')) {
          throw new Error('データベースが見つかりません。システム管理者にお問い合わせください。')
        }
        throw testError
      }

      // 実際のデータ取得
      const { data: shopsData, error: fetchError } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      console.log('取得した店舗データ:', shopsData)
      setShops(shopsData || [])
      
    } catch (error) {
      console.error('店舗データ取得エラー:', error)
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました'
      setError(`店舗データの取得に失敗しました: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [])

  // フィルタリング機能（メモ化による最適化）
  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      // 検索クエリでフィルタリング
      const matchesSearch = searchQuery === '' || 
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.address.toLowerCase().includes(searchQuery.toLowerCase())
      
      // お気に入りフィルター
      const matchesFavorites = !showFavoritesOnly || favorites.has(shop.id)
      
      return matchesSearch && matchesFavorites
    })
  }, [shops, searchQuery, showFavoritesOnly, favorites])

  // 現在地周辺の店舗をソートして表示（メモ化）
  const shopsWithDistance: ShopWithDistance[] = useMemo(() => {
    return currentLocation 
      ? filteredShops.map(shop => ({
          ...shop,
          distance: calculateDistance(
            currentLocation[0], currentLocation[1],
            shop.latitude, shop.longitude
          ),
          isFavorite: favorites.has(shop.id)
        })).sort((a, b) => a.distance - b.distance)
      : filteredShops.map(shop => ({ 
          ...shop, 
          distance: 0,
          isFavorite: favorites.has(shop.id) 
        }))
  }, [filteredShops, currentLocation, favorites, calculateDistance])

  // クライアントサイドでのみレンダリング
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 初回読み込みとリフレッシュ時にデータを取得
  useEffect(() => {
    if (isClient) {
      fetchShops()
      fetchShopRatings()
    }
  }, [refreshTrigger, isClient, fetchShops, fetchShopRatings])

  // 地図の中心を設定
  const finalMapCenter: [number, number] = mapCenter

  if (!isClient) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorBoundary onRetry={fetchShops} />
  }

  return (
    <div className="w-full transition-all duration-300">
      <div className="bg-white text-gray-900">
        {/* 検索とフィルター（改善されたモバイルUI） */}
        <div className="mb-4 space-y-3" style={animationStyles.slideUp}>
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              type="text"
              placeholder="🔍 店舗名・住所で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all min-h-[44px]"
              aria-label="店舗検索"
            />
            <button
              onClick={() => {
                setSearchQuery('')
                setShowFavoritesOnly(false)
              }}
              className="px-6 py-3 rounded-lg text-base transition-all hover:scale-105 bg-gray-500 text-white hover:bg-gray-600 min-h-[44px] min-w-[44px]"
              aria-label="検索条件をクリア"
            >
              クリア
            </button>
          </div>
          
          <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
            <label className="flex items-center text-base cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                className="mr-3 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                aria-label="お気に入りのみ表示"
              />
              ❤️ お気に入りのみ表示
            </label>
            
            <button
              onClick={() => setShowStats(true)}
              className="px-4 py-2 rounded-lg text-sm transition-all hover:scale-105 bg-blue-600 text-white hover:bg-blue-700 min-h-[44px] min-w-[44px]"
              aria-label="統計を表示"
            >
              📊 統計
            </button>
          </div>
        </div>

        {/* 情報バー（改善されたレスポンシブ） */}
        <div className="mb-3 flex justify-between items-center flex-col sm:flex-row gap-3" style={animationStyles.fadeIn}>
          <p className="text-sm text-gray-600 text-center sm:text-left">
            店舗数: <span className="font-semibold text-blue-600">{shopsWithDistance.length}件</span>
            {filteredShops.length !== shops.length && (
              <span className="text-blue-500 ml-1">(全{shops.length}件中)</span>
            )}
            {currentLocation && shopsWithDistance.length > 0 && (
              <span className="ml-2 text-green-600 font-medium">
                📍 現在地から近い順
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={getCurrentLocation}
              disabled={isLocating}
              className={`text-sm px-4 py-2 rounded-lg transition-all min-h-[44px] min-w-[44px] font-medium ${
                isLocating 
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : currentLocation
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                  : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'
              }`}
              aria-label={isLocating ? '位置情報取得中' : currentLocation ? '現在地を更新' : '現在地を取得'}
            >
              {isLocating ? '📍 取得中...' : currentLocation ? '📍 現在地更新' : '📍 現在地取得'}
            </button>
            <button 
              onClick={fetchShops}
              className="text-sm px-4 py-2 rounded-lg transition-all hover:scale-105 min-h-[44px] min-w-[44px] bg-gray-600 text-white hover:bg-gray-700 font-medium"
              disabled={loading}
              aria-label="店舗情報を更新"
            >
              {loading ? '🔄 更新中...' : '🔄 更新'}
            </button>
          </div>
        </div>

        {/* エラー表示（改善されたアクセシビリティ） */}
        {locationError && (
          <div className="mb-3 p-4 border border-red-200 rounded-lg bg-red-50 text-red-600" role="alert" style={animationStyles.slideUp}>
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{locationError}</p>
                <button
                  onClick={() => setLocationError(null)}
                  className="mt-2 text-xs text-red-800 hover:text-red-900 underline min-h-[44px] min-w-[44px] flex items-center"
                  aria-label="エラーメッセージを閉じる"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && <LoadingSpinner />}

        {!loading && (
          <div className="min-h-96 w-full rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg" style={animationStyles.fadeIn}>
            <MapContainer 
              center={finalMapCenter}
              zoom={mapZoom}
              style={{ height: '400px', width: '100%' }}
              className="focus:outline-none"
            >
              {/* 地図の中心を動的に変更 */}
              <ChangeMapView center={finalMapCenter} zoom={mapZoom} />
              
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* 現在地マーカー */}
              {currentLocation && (
                <Marker
                  position={currentLocation}
                  icon={CurrentLocationIcon}
                >
                  <Popup>
                    <div className="text-center p-2">
                      <strong className="text-blue-600">📍 現在地</strong>
                      <br />
                      <small className="text-gray-600">緯度: {currentLocation[0].toFixed(6)}</small>
                      <br />
                      <small className="text-gray-600">経度: {currentLocation[1].toFixed(6)}</small>
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* 店舗マーカー */}
              {shopsWithDistance.map((shop) => (
                <Marker
                  key={shop.id}
                  position={[shop.latitude, shop.longitude]}
                  icon={DefaultIcon}
                >
                  <Popup>
                    <div className="max-w-xs p-2">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-800 flex-1 text-base">
                          ☕ {shop.name}
                        </h3>
                        <button
                          onClick={() => toggleFavorite(shop.id)}
                          className={`ml-2 text-xl min-h-[44px] min-w-[44px] flex items-center justify-center hover:scale-110 transition-transform ${
                            favorites.has(shop.id) ? 'text-red-500' : 'text-gray-400'
                          } hover:text-red-500`}
                          aria-label={favorites.has(shop.id) ? 'お気に入りから削除' : 'お気に入りに追加'}
                        >
                          {favorites.has(shop.id) ? '❤️' : '🤍'}
                        </button>
                      </div>
                      
                      {/* 評価表示 */}
                      {shopRatings[shop.id] && (
                        <div className="flex items-center mb-2">
                          <div className="flex text-xs">
                            {renderStars(Math.round(shopRatings[shop.id].average))}
                          </div>
                          <span className="ml-1 text-xs text-gray-600">
                            {shopRatings[shop.id].average.toFixed(1)} ({shopRatings[shop.id].count}件)
                          </span>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-600 mb-2">
                        📍 {shop.address}
                      </p>
                      {shop.description && (
                        <p className="text-sm text-gray-700 mb-2">
                          {shop.description}
                        </p>
                      )}
                      {currentLocation && shop.distance > 0 && (
                        <p className="text-xs text-blue-600 mb-2 font-medium">
                          🚶 現在地から約 {shop.distance.toFixed(1)}km
                        </p>
                      )}
                      <div className="flex justify-between items-center mt-3">
                        <p className="text-xs text-gray-500">
                          {shop.created_at 
                            ? `登録日: ${new Date(shop.created_at).toLocaleDateString('ja-JP')}`
                            : `店舗ID: ${shop.id}`
                          }
                        </p>
                        <button
                          onClick={() => setSelectedShop(shop)}
                          className="text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] min-w-[44px] font-medium"
                          aria-label={`${shop.name}の詳細を表示`}
                        >
                          詳細
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* 店舗が見つからない場合の表示 */}
        {shopsWithDistance.length === 0 && !loading && (
          <div className="text-center mt-6 p-6 bg-gray-50 rounded-lg" style={animationStyles.fadeIn}>
            <div className="text-4xl mb-3">☕</div>
            <div className="text-base text-gray-600">
              {searchQuery || showFavoritesOnly 
                ? '条件に一致する店舗が見つかりません'
                : 'まだ店舗が登録されていません。\n右側のフォームから最初の店舗を追加してみましょう！'
              }
            </div>
            {(searchQuery || showFavoritesOnly) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setShowFavoritesOnly(false)
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] min-w-[44px]"
                aria-label="検索条件をリセット"
              >
                検索条件をリセット
              </button>
            )}
          </div>
        )}

        {/* 現在地周辺の店舗リスト */}
        {currentLocation && shopsWithDistance.length > 0 && (
          <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50" style={animationStyles.slideUp}>
            <h4 className="text-base font-semibold mb-3 text-blue-800">📍 現在地から近い店舗</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {shopsWithDistance.filter(shop => shop.distance > 0).slice(0, 5).map((shop) => (
                <div key={shop.id} className="text-sm flex justify-between items-center py-1">
                  <div className="flex items-center">
                    <span className={favorites.has(shop.id) ? 'text-red-500' : 'text-blue-700'}>
                      {favorites.has(shop.id) ? '❤️' : '☕'} {shop.name}
                    </span>
                  </div>
                  <span className="text-blue-600 font-medium">
                    {shop.distance.toFixed(1)}km
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 統計ダッシュボードモーダル（改善されたアクセシビリティ） */}
        {showStats && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50"
            style={{ zIndex: 9999 }}
            onClick={() => setShowStats(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stats-title"
          >
            <div 
              className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
              style={animationStyles.slideUp}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 id="stats-title" className="text-2xl font-bold text-gray-900">📊 統計ダッシュボード</h2>
                  <button
                    onClick={() => setShowStats(false)}
                    className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none hover:scale-110 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="統計ダッシュボードを閉じる"
                  >
                    ×
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 基本統計 */}
                  <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">📈 基本統計</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">総店舗数:</span>
                        <span className="font-semibold text-blue-600 text-lg">{shops.length}件</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">お気に入り登録数:</span>
                        <span className="font-semibold text-red-500 text-lg">{favorites.size}件</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">レビュー総数:</span>
                        <span className="font-semibold text-yellow-600 text-lg">
                          {Object.values(shopRatings).reduce((sum, rating) => sum + rating.count, 0)}件
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 評価統計 */}
                  <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">⭐ 評価統計</h3>
                    <div className="space-y-3">
                      {Object.keys(shopRatings).length > 0 ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">平均評価:</span>
                            <span className="font-semibold text-yellow-600 text-lg">
                              {(Object.values(shopRatings).reduce((sum, rating) => sum + rating.average, 0) / Object.keys(shopRatings).length).toFixed(1)}⭐
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">評価済み店舗:</span>
                            <span className="font-semibold text-green-600 text-lg">{Object.keys(shopRatings).length}件</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500 text-center py-4">
                          まだ評価がありません
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 人気店舗ランキング */}
                  <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors md:col-span-2">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">🏆 人気店舗ランキング</h3>
                    {Object.keys(shopRatings).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(shopRatings)
                          .sort(([,a], [,b]) => b.average - a.average)
                          .slice(0, 5)
                          .map(([shopId, rating], index) => {
                            const shop = shops.find(s => s.id === parseInt(shopId))
                            return shop ? (
                              <div key={shopId} className="flex items-center justify-between p-2 bg-white rounded-lg">
                                <div className="flex items-center">
                                  <span className="text-lg mr-3 min-w-[32px]">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                  </span>
                                  <span className="font-medium text-gray-800">{shop.name}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-yellow-400 mr-2">⭐</span>
                                  <span className="font-semibold text-gray-700">
                                    {rating.average.toFixed(1)} ({rating.count}件)
                                  </span>
                                </div>
                              </div>
                            ) : null
                          })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-8">
                        まだレビューがありません
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowStats(false)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium min-h-[44px] min-w-[44px]"
                    aria-label="統計ダッシュボードを閉じる"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 店舗詳細モーダル（改善されたアクセシビリティとUX） */}
        {selectedShop && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50"
            style={{ zIndex: 9999 }}
            onClick={() => setSelectedShop(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-detail-title"
          >
            <div 
              className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
              style={animationStyles.slideUp}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 id="shop-detail-title" className="text-xl font-bold text-gray-900 flex-1 pr-4">☕ {selectedShop.name}</h2>
                  <button
                    onClick={() => setSelectedShop(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none hover:scale-110 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
                    aria-label="店舗詳細を閉じる"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">📍 住所</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{selectedShop.address}</p>
                  </div>
                  
                  {selectedShop.description && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">📝 説明</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{selectedShop.description}</p>
                    </div>
                  )}
                  
                  {currentLocation && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">🚶 距離</h3>
                      <p className="text-sm text-gray-600">
                        現在地から約 <span className="font-semibold text-blue-600">
                          {calculateDistance(
                            currentLocation[0], currentLocation[1],
                            selectedShop.latitude, selectedShop.longitude
                          ).toFixed(1)}km
                        </span>
                      </p>
                    </div>
                  )}

                  {/* 評価表示 */}
                  {shopRatings[selectedShop.id] && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">⭐ 評価</h3>
                      <div className="flex items-center">
                        <div className="flex text-sm">
                          {renderStars(Math.round(shopRatings[selectedShop.id].average))}
                        </div>
                        <span className="ml-2 text-sm text-gray-600">
                          {shopRatings[selectedShop.id].average.toFixed(1)} ({shopRatings[selectedShop.id].count}件のレビュー)
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => toggleFavorite(selectedShop.id)}
                      className={`flex-1 px-4 py-3 rounded-lg transition-all hover:scale-105 font-medium min-h-[44px] ${
                        favorites.has(selectedShop.id)
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      aria-label={favorites.has(selectedShop.id) ? 'お気に入りから削除' : 'お気に入りに追加'}
                    >
                      {favorites.has(selectedShop.id) ? '❤️ お気に入り解除' : '🤍 お気に入り追加'}
                    </button>
                    
                    <button
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedShop.latitude},${selectedShop.longitude}`
                        window.open(url, '_blank', 'noopener,noreferrer')
                      }}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all hover:scale-105 font-medium min-h-[44px]"
                      aria-label={`${selectedShop.name}へのルート案内を開く`}
                    >
                      🗺️ ルート案内
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS-in-JS アニメーション定義 */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-4px);
          }
          60% {
            transform: translateY(-2px);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* フォーカス時のアクセシビリティ向上 */
        button:focus-visible,
        input:focus-visible {
          outline: 2px solid #3B82F6;
          outline-offset: 2px;
        }

        /* タッチデバイス向けの最適化 */
        @media (hover: hover) {
          .hover\\:scale-105:hover {
            transform: scale(1.05);
          }
          .hover\\:scale-110:hover {
            transform: scale(1.1);
          }
        }

        /* レスポンシブ対応 */
        @media (max-width: 640px) {
          .leaflet-container {
            height: 350px !important;
          }
        }

        /* モーダルz-index確保 */
        .modal-overlay {
          z-index: 9999 !important;
        }
      `}</style>
    </div>
  )
}