'use client'
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'

// Leafletのアイコン問題を解決
const DefaultIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#8B4513" width="24px" height="24px">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24]
})

// 現在地アイコン
const CurrentLocationIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#007AFF" width="32px" height="32px">
      <circle cx="12" cy="12" r="8" fill="#007AFF" stroke="white" stroke-width="3"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
})

interface Shop {
  id: number
  name: string
  address: string
  description?: string
  latitude: number
  longitude: number
  created_at?: string
}

interface ShopWithDistance extends Shop {
  distance: number
}

interface MapProps {
  refreshTrigger?: number
}

export default function Map({ refreshTrigger }: MapProps) {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6762, 139.6503]) // 東京駅
  const [mapZoom, setMapZoom] = useState(13)

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
        setMapCenter(newLocation)
        setMapZoom(15) // 現在地表示時はズームアップ
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
        maximumAge: 300000 // 5分間キャッシュ
      }
    )
  }

  // 現在地周辺の店舗を計算する関数
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // 地球の半径 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // 店舗データを取得
  const fetchShops = async () => {
    try {
      setLoading(true)
      setError(null)
      
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
      
      if (fetchError) {
        console.error('Error fetching shops:', fetchError)
        setError('店舗データの取得に失敗しました: ' + fetchError.message)
      } else {
        console.log('Fetched shops:', shopsData)
        setShops(shopsData || [])
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('予期しないエラーが発生しました: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // クライアントサイドでのみレンダリング
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 初回読み込みとリフレッシュ時にデータを取得
  useEffect(() => {
    if (isClient) {
      fetchShops()
    }
  }, [refreshTrigger, isClient])

  // 現在地周辺の店舗をソートして表示
  const shopsWithDistance: (Shop | ShopWithDistance)[] = currentLocation 
    ? shops.map(shop => ({
        ...shop,
        distance: calculateDistance(
          currentLocation[0], currentLocation[1],
          shop.latitude, shop.longitude
        )
      })).sort((a, b) => (a as ShopWithDistance).distance - (b as ShopWithDistance).distance)
    : shops

  // サーバーサイドまたはクライアントサイド読み込み前
  if (!isClient) {
    return (
      <div className="h-96 w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <div className="text-gray-500">🗺️ 地図を読み込み中...</div>
      </div>
    )
  }

  // ローディング中
  if (loading) {
    return (
      <div className="h-96 w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <div className="text-gray-500">📍 店舗データを読み込み中...</div>
      </div>
    )
  }

  // エラー時
  if (error) {
    return (
      <div className="h-96 w-full bg-red-50 border border-red-200 rounded-lg flex items-center justify-center p-4">
        <div className="text-center text-red-600 max-w-md">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-sm mb-4">{error}</div>
          {error.includes('テーブルが存在しません') && (
            <div className="text-xs text-gray-600 mb-4 p-3 bg-gray-100 rounded">
              <strong>解決方法:</strong><br/>
              1. Supabaseダッシュボードを開く<br/>
              2. SQL Editorで以下を実行:<br/>
              <code className="text-xs bg-white p-1 rounded">
                CREATE TABLE shops (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, address TEXT NOT NULL, description TEXT, latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()); ALTER TABLE shops DISABLE ROW LEVEL SECURITY;
              </code>
            </div>
          )}
          <button 
            onClick={fetchShops}
            className="mt-2 px-4 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  // 地図の中心を設定
  const finalMapCenter: [number, number] = currentLocation || 
    (shops.length > 0 ? [shops[0].latitude, shops[0].longitude] : mapCenter)

  return (
    <div className="w-full">
      <div className="mb-2 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          店舗数: {shops.length}件
          {currentLocation && shops.length > 0 && (
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
            {isLocating ? '📍 取得中...' : currentLocation ? '📍 現在地' : '📍 現在地取得'}
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

      {/* 位置情報エラー表示 */}
      {locationError && (
        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          ⚠️ {locationError}
          <button 
            onClick={() => setLocationError(null)}
            className="ml-2 text-yellow-600 hover:text-yellow-800"
          >
            ✕
          </button>
        </div>
      )}

      <div className="h-96 w-full rounded-lg overflow-hidden border-2 border-gray-300">
        <MapContainer 
          center={finalMapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
        >
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
                  <h3 className="font-semibold text-gray-800 mb-1">
                    ☕ {shop.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    📍 {shop.address}
                  </p>
                  {shop.description && (
                    <p className="text-sm text-gray-700 mb-2">
                      {shop.description}
                    </p>
                  )}
                  {currentLocation && 'distance' in shop && (
                    <p className="text-xs text-blue-600 mb-1">
                      🚶 現在地から約 {((shop as ShopWithDistance).distance).toFixed(1)}km
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {shop.created_at 
                      ? `登録日: ${new Date(shop.created_at).toLocaleDateString('ja-JP')}`
                      : `店舗ID: ${shop.id}`
                    }
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {shops.length === 0 && (
        <div className="text-center text-gray-500 mt-4">
          <div className="text-4xl mb-2">☕</div>
          <div className="text-sm">
            まだ店舗が登録されていません。<br/>
            右側のフォームから最初の店舗を追加してみましょう！
          </div>
        </div>
      )}

      {/* 現在地周辺の店舗リスト */}
      {currentLocation && shops.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">📍 現在地から近い店舗</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {(shopsWithDistance as ShopWithDistance[]).slice(0, 5).map((shop) => (
              <div key={shop.id} className="text-xs text-blue-700 flex justify-between">
                <span>☕ {shop.name}</span>
                <span className="text-blue-600">
                  {shop.distance.toFixed(1)}km
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}