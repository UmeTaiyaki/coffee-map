import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'

// 地図の中心を変更するコンポーネント
function ChangeMapView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
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
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0iIzMzODhGRiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
})

// Leafletの型拡張
interface LeafletIconDefault extends L.Icon.Default {
  _getIconUrl?: string
}

// Leafletのデフォルトアイコンパスの修正
delete (L.Icon.Default.prototype as LeafletIconDefault)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

export default function Map({ refreshTrigger }: MapProps) {
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
  const [reviewModalShop, setReviewModalShop] = useState<Shop | null>(null)
  const [shopRatings, setShopRatings] = useState<Record<number, { average: number, count: number }>>({})

  // 店舗の評価を取得
  const fetchShopRatings = async () => {
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
    }
  }

  // お気に入り機能
  useEffect(() => {
    // LocalStorageからお気に入りを読み込み
    const savedFavorites = localStorage.getItem('coffee-map-favorites')
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)))
    }
  }, [])

  const toggleFavorite = (shopId: number) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(shopId)) {
      newFavorites.delete(shopId)
    } else {
      newFavorites.add(shopId)
    }
    setFavorites(newFavorites)
    localStorage.setItem('coffee-map-favorites', JSON.stringify([...newFavorites]))
  }

  // 星の表示用関数
  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}>
          ⭐
        </span>
      )
    }
    return stars
  }

  // 現在地を取得する関数
  const getCurrentLocation = () => {
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
        // 地図の中心とズームを更新
        setMapCenter(newLocation)
        setMapZoom(15)
        setIsLocating(false)
        
        console.log('現在地を取得しました:', { latitude, longitude })
      },
      (error) => {
        console.error('位置情報取得エラー:', error)
        setIsLocating(false)
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('位置情報の取得が拒否されました')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('位置情報を取得できません')
            break
          case error.TIMEOUT:
            setLocationError('位置情報取得がタイムアウトしました')
            break
          default:
            setLocationError('位置情報取得中にエラーが発生しました')
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }

  // 距離計算関数
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // 店舗データを取得する関数
  const fetchShops = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // まずテーブルの存在確認
      const { error: testError } = await supabase
        .from('shops')
        .select('*')
        .limit(1)

      if (testError) {
        // テーブルが存在しない場合のエラーハンドリング
        if (testError.message.includes('does not exist')) {
          setError('shopsテーブルが存在しません。Supabaseでテーブルを作成してください。')
          return
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
      setError(`店舗データの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // フィルタリング機能
  const filteredShops = shops.filter(shop => {
    // 検索クエリでフィルタリング
    const matchesSearch = searchQuery === '' || 
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.address.toLowerCase().includes(searchQuery.toLowerCase())
    
    // お気に入りフィルター
    const matchesFavorites = !showFavoritesOnly || favorites.has(shop.id)
    
    return matchesSearch && matchesFavorites
  })

  // 現在地周辺の店舗をソートして表示
  const shopsWithDistance: ShopWithDistance[] = currentLocation 
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
  }, [refreshTrigger, isClient])

  // 地図の中心を設定
  const finalMapCenter: [number, number] = mapCenter

  if (!isClient) {
    return (
      <div className="h-96 w-full bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-2">🗺️</div>
          <div className="text-sm">地図を読み込み中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-96 w-full bg-red-50 border-2 border-red-200 rounded-lg flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-sm font-medium mb-2">エラーが発生しました</div>
          <div className="text-xs">{error}</div>
          <button 
            onClick={fetchShops}
            className="mt-3 text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* 検索とフィルター */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="🔍 店舗名・住所で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              setSearchQuery('')
              setShowFavoritesOnly(false)
            }}
            className="px-3 py-2 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600"
          >
            クリア
          </button>
        </div>
        
        <div className="flex items-center">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={showFavoritesOnly}
              onChange={(e) => setShowFavoritesOnly(e.target.checked)}
              className="mr-2"
            />
            ❤️ お気に入りのみ表示
          </label>
        </div>
      </div>

      <div className="mb-2 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          店舗数: {shopsWithDistance.length}件
          {filteredShops.length !== shops.length && (
            <span className="text-blue-600"> (全{shops.length}件中)</span>
          )}
          {currentLocation && shopsWithDistance.length > 0 && (
            <span className="ml-2 text-blue-600">
              📍 現在地から近い順
            </span>
          )}
        </p>
        <div className="flex gap-1">
          <button 
            onClick={getCurrentLocation}
            disabled={isLocating}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              isLocating 
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : currentLocation
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isLocating ? '📍 取得中...' : currentLocation ? '📍 現在地更新' : '📍 現在地取得'}
          </button>
          <button 
            onClick={fetchShops}
            className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
            disabled={loading}
          >
            🔄 更新
          </button>
        </div>
      </div>

      {/* エラー表示 */}
      {locationError && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          ⚠️ {locationError}
        </div>
      )}

      {loading && (
        <div className="h-96 w-full bg-gray-50 border-2 border-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-600">
            <div className="text-4xl mb-2">⏳</div>
            <div className="text-sm">店舗データを読み込み中...</div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="h-96 w-full rounded-lg overflow-hidden border-2 border-gray-300">
          <MapContainer 
            center={finalMapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
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
                  <div className="text-center">
                    <strong>📍 現在地</strong>
                    <br />
                    <small>緯度: {currentLocation[0].toFixed(6)}</small>
                    <br />
                    <small>経度: {currentLocation[1].toFixed(6)}</small>
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
                  <div className="max-w-xs">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800 flex-1">
                        ☕ {shop.name}
                      </h3>
                      <button
                        onClick={() => toggleFavorite(shop.id)}
                        className={`ml-2 text-lg ${
                          favorites.has(shop.id) ? 'text-red-500' : 'text-gray-400'
                        } hover:text-red-500 transition-colors`}
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
                      <p className="text-xs text-blue-600 mb-1">
                        🚶 現在地から約 {shop.distance.toFixed(1)}km
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">
                        {shop.created_at 
                          ? `登録日: ${new Date(shop.created_at).toLocaleDateString('ja-JP')}`
                          : `店舗ID: ${shop.id}`
                        }
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setReviewModalShop(shop)}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          📝 レビュー
                        </button>
                        <button
                          onClick={() => setSelectedShop(shop)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          詳細
                        </button>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {shopsWithDistance.length === 0 && !loading && (
        <div className="text-center text-gray-500 mt-4">
          <div className="text-4xl mb-2">☕</div>
          <div className="text-sm">
            {searchQuery || showFavoritesOnly 
              ? '条件に一致する店舗が見つかりません'
              : 'まだ店舗が登録されていません。\n右側のフォームから最初の店舗を追加してみましょう！'
            }
          </div>
        </div>
      )}

      {/* 現在地周辺の店舗リスト */}
      {currentLocation && shopsWithDistance.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">📍 現在地から近い店舗</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {shopsWithDistance.filter(shop => shop.distance > 0).slice(0, 5).map((shop) => (
              <div key={shop.id} className="text-xs text-blue-700 flex justify-between items-center">
                <div className="flex items-center">
                  <span className={favorites.has(shop.id) ? 'text-red-500' : ''}>
                    {favorites.has(shop.id) ? '❤️' : '☕'} {shop.name}
                  </span>
                </div>
                <span className="text-blue-600">
                  {shop.distance.toFixed(1)}km
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 簡易レビューモーダル */}
      {reviewModalShop && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
          onClick={() => setReviewModalShop(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-800">📝 {reviewModalShop.name}</h2>
                <button
                  onClick={() => setReviewModalShop(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
                >
                  ×
                </button>
              </div>
              
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🚧</div>
                <div className="text-lg font-medium mb-2">レビュー機能</div>
                <div className="text-sm text-gray-600 mb-4">
                  レビュー機能は現在開発中です。<br/>
                  近日中に追加予定です！
                </div>
                <button
                  onClick={() => setReviewModalShop(null)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 店舗詳細モーダル */}
      {selectedShop && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
          onClick={() => setSelectedShop(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-800">☕ {selectedShop.name}</h2>
                <button
                  onClick={() => setSelectedShop(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">📍 住所</h3>
                  <p className="text-sm text-gray-600">{selectedShop.address}</p>
                </div>
                
                {selectedShop.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">📝 説明</h3>
                    <p className="text-sm text-gray-600">{selectedShop.description}</p>
                  </div>
                )}
                
                {currentLocation && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">🚶 距離</h3>
                    <p className="text-sm text-gray-600">
                      現在地から約 {calculateDistance(
                        currentLocation[0], currentLocation[1],
                        selectedShop.latitude, selectedShop.longitude
                      ).toFixed(1)}km
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <button
                    onClick={() => toggleFavorite(selectedShop.id)}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      favorites.has(selectedShop.id)
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {favorites.has(selectedShop.id) ? '❤️ お気に入り解除' : '🤍 お気に入り追加'}
                  </button>
                  
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedShop.latitude},${selectedShop.longitude}`
                      window.open(url, '_blank')
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
  )
}