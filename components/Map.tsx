'use client'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Leafletのアイコン問題を解決
import L from 'leaflet'

// 店舗用のアイコン
const ShopIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// 現在地用のアイコン（青色）
const CurrentLocationIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="blue" width="24px" height="24px">
      <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
})

// デフォルトアイコンを設定
L.Marker.prototype.options.icon = ShopIcon

// 店舗の型定義
interface Shop {
  id: number
  name: string
  latitude: number
  longitude: number
  address: string
  description: string | null
}

// 現在地の型定義
interface CurrentLocation {
  lat: number
  lng: number
  accuracy: number
}

export default function Map() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

  useEffect(() => {
    fetchShops()
  }, [])

  const fetchShops = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
      
      if (error) {
        console.error('Error fetching shops:', error)
      } else {
        setShops(data || [])
      }
    } catch (error) {
      console.error('Unexpected error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 現在地を取得する関数
  const getCurrentLocation = () => {
    setLocationLoading(true)
    
    if (!navigator.geolocation) {
      alert('お使いのブラウザは位置情報に対応していません')
      setLocationLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
        setLocationLoading(false)
        console.log('現在地を取得しました:', position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        console.error('位置情報の取得に失敗:', error)
        let errorMessage = '位置情報の取得に失敗しました。'
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '位置情報の使用が拒否されました。ブラウザの設定で位置情報を許可してください。'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置情報が利用できません。'
            break
          case error.TIMEOUT:
            errorMessage = '位置情報の取得がタイムアウトしました。'
            break
        }
        
        alert(errorMessage)
        setLocationLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5分間キャッシュ
      }
    )
  }

  if (loading) {
    return (
      <div className="h-96 w-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-gray-600">地図を読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* 現在地ボタン */}
      <button
        onClick={getCurrentLocation}
        disabled={locationLoading}
        className="absolute top-2 right-2 z-[1000] bg-white border-2 border-gray-300 rounded-md p-2 shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        title="現在地を表示"
      >
        {locationLoading ? (
          <div className="w-6 h-6 animate-spin">⏳</div>
        ) : (
          <div className="w-6 h-6 text-blue-600">📍</div>
        )}
      </button>

      <div className="h-96 w-full">
        <MapContainer 
          center={currentLocation ? [currentLocation.lat, currentLocation.lng] : [35.6762, 139.6503]}
          zoom={currentLocation ? 15 : 10}
          style={{ height: '100%', width: '100%' }}
          className="rounded-lg"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* 店舗マーカー */}
          {shops.map((shop) => (
            <Marker 
              key={shop.id} 
              position={[shop.latitude, shop.longitude]}
              icon={ShopIcon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-lg mb-1">☕ {shop.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">📍 {shop.address}</p>
                  {shop.description && (
                    <p className="text-sm">{shop.description}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* 現在地マーカーと精度円 */}
          {currentLocation && (
            <>
              <Marker 
                position={[currentLocation.lat, currentLocation.lng]}
                icon={CurrentLocationIcon}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-blue-600">📍 現在地</h3>
                    <p className="text-sm text-gray-600">
                      精度: 約{Math.round(currentLocation.accuracy)}m
                    </p>
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={[currentLocation.lat, currentLocation.lng]}
                radius={currentLocation.accuracy}
                pathOptions={{
                  color: '#3B82F6',
                  fillColor: '#3B82F6',
                  fillOpacity: 0.1,
                  weight: 2
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* 情報表示 */}
      <div className="mt-2 flex justify-between items-center text-sm text-gray-600">
        <div>
          店舗数: {shops.length}件
        </div>
        {currentLocation && (
          <div className="text-blue-600">
            📍 現在地表示中
          </div>
        )}
      </div>
    </div>
  )
}