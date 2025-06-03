'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import type { ShopWithDetails } from '../types/shop'
import { showToast } from './ToastNotification'

// カスタムアイコンの定義
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
    ">
      <span style="
        transform: rotate(45deg);
        font-size: 20px;
        filter: grayscale(0%);
      ">${emoji}</span>
    </div>
  `
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  })
}

const CurrentLocationIcon = L.divIcon({
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
const CATEGORY_ICONS = {
  cafe: createCustomIcon('#6F4E37', '☕'),
  roastery: createCustomIcon('#DC143C', '🔥'),
  chain: createCustomIcon('#1E90FF', '🏪'),
  specialty: createCustomIcon('#FFD700', '✨'),
  bakery: createCustomIcon('#DEB887', '🥐')
}

const CATEGORIES = {
  cafe: '☕ カフェ',
  roastery: '🔥 自家焙煎',
  chain: '🏪 チェーン店',
  specialty: '✨ スペシャルティ',
  bakery: '🥐 ベーカリーカフェ'
} as const

// マップビュー変更コンポーネント
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom, { animate: true })
  }, [center, zoom, map])
  return null
}

// ミニマップコンポーネント
function MiniMap({ position }: { position: [number, number] }) {
  return (
    <div className="absolute bottom-4 right-4 w-48 h-32 glass rounded-lg overflow-hidden shadow-lg z-[400]">
      <MapContainer
        center={position}
        zoom={10}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.7}
        />
        <Circle center={position} radius={2000} color="#FF8C42" />
      </MapContainer>
    </div>
  )
}

interface EnhancedMapProps {
  refreshTrigger: number
}

export default function EnhancedMap({ refreshTrigger }: EnhancedMapProps) {
  const [shops, setShops] = useState<ShopWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6762, 139.6503])
  const [mapZoom, setMapZoom] = useState(13)
  const [selectedShop, setSelectedShop] = useState<ShopWithDetails | null>(null)
  const [showMiniMap, setShowMiniMap] = useState(true)

  // 店舗データ取得
  const fetchShops = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('shops')
        .select(`
          *,
          shop_images!shop_images_shop_id_fkey(*),
          shop_hours!shop_hours_shop_id_fkey(*),
          shop_tags!shop_tags_shop_id_fkey(*),
          reviews!reviews_shop_id_fkey(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const shopsWithDetails: ShopWithDetails[] = (data || []).map(shop => ({
        ...shop,
        images: shop.shop_images || [],
        hours: shop.shop_hours || [],
        tags: shop.shop_tags || [],
        reviews: shop.reviews || []
      }))

      setShops(shopsWithDetails)
    } catch (error) {
      console.error('店舗データ取得エラー:', error)
      showToast('店舗データの取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  // 現在地取得
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('位置情報がサポートされていません', 'error')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const newLocation: [number, number] = [latitude, longitude]
        setCurrentLocation(newLocation)
        setMapCenter(newLocation)
        setMapZoom(15)
        showToast('現在地を取得しました', 'success')
      },
      (error) => {
        showToast('位置情報の取得に失敗しました', 'error')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }, [])

  // 営業時間チェック
  const isOpenNow = (hours: ShopWithDetails['hours']) => {
    if (!hours) return false
    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = now.toTimeString().slice(0, 5)
    const todayHours = hours.find(h => h.day_of_week === currentDay)
    
    if (!todayHours || todayHours.is_closed) return false
    if (!todayHours.open_time || !todayHours.close_time) return false
    
    return currentTime >= todayHours.open_time && currentTime <= todayHours.close_time
  }

  // 平均評価計算
  const getAverageRating = (reviews: ShopWithDetails['reviews']) => {
    if (!reviews || reviews.length === 0) return 0
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  }

  useEffect(() => {
    fetchShops()
    getCurrentLocation()
  }, [fetchShops, getCurrentLocation, refreshTrigger])

  if (loading) {
    return (
      <div className="h-[500px] glass rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">地図を読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[600px] glass rounded-2xl overflow-hidden group">
      {/* マップコントロール */}
      <div className="absolute top-4 left-4 z-[500] space-y-2">
        <button
          onClick={getCurrentLocation}
          className="glass-sm px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-all flex items-center gap-2"
        >
          📍 現在地を取得
        </button>
        
        <button
          onClick={() => setShowMiniMap(!showMiniMap)}
          className="glass-sm px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-500/20 transition-all"
        >
          {showMiniMap ? '🗺️ ミニマップを隠す' : '🗺️ ミニマップを表示'}
        </button>
      </div>

      {/* 統計情報 */}
      <div className="absolute top-4 right-4 z-[500] glass-sm rounded-lg p-3 space-y-1">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          表示中: <span className="font-bold text-orange-600">{shops.length}</span> 店舗
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          営業中: <span className="font-bold text-green-600">
            {shops.filter(s => isOpenNow(s.hours)).length}
          </span> 店舗
        </div>
      </div>

      {/* メインマップ */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        className="z-10"
      >
        <ChangeMapView center={mapCenter} zoom={mapZoom} />
        
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* 現在地マーカー */}
        {currentLocation && (
          <Marker position={currentLocation} icon={CurrentLocationIcon}>
            <Popup className="custom-popup">
              <div className="text-center p-2">
                <strong className="text-blue-600">📍 現在地</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 店舗マーカー */}
        {shops.map((shop, index) => (
          <Marker
            key={shop.id}
            position={[shop.latitude, shop.longitude]}
            icon={CATEGORY_ICONS[shop.category]}
            eventHandlers={{
              click: () => setSelectedShop(shop),
              mouseover: (e) => e.target.openPopup(),
              mouseout: (e) => e.target.closePopup()
            }}
          >
            <Popup className="custom-popup glass-sm" maxWidth={350}>
              <div className="p-4">
                {/* 画像 */}
                {shop.main_image_url && (
                  <div className="relative w-full h-32 mb-3 -mx-4 -mt-4">
                    <Image
                      src={shop.main_image_url}
                      alt={shop.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* 店舗情報 */}
                <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
                  {shop.name}
                </h3>
                
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {CATEGORIES[shop.category]}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isOpenNow(shop.hours)
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {isOpenNow(shop.hours) ? '営業中' : '営業時間外'}
                  </span>
                </div>

                {/* 評価 */}
                {shop.reviews && shop.reviews.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-medium">{getAverageRating(shop.reviews).toFixed(1)}</span>
                    <span className="text-sm text-gray-500">({shop.reviews.length}件)</span>
                  </div>
                )}

                {/* 設備 */}
                <div className="flex gap-2 mb-3">
                  {shop.has_wifi && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      📶 Wi-Fi
                    </span>
                  )}
                  {shop.has_power && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                      🔌 電源
                    </span>
                  )}
                </div>

                {/* アクション */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`
                      window.open(url, '_blank', 'noopener,noreferrer')
                    }}
                    className="btn-glass bg-blue-600 text-white hover:bg-blue-700 text-sm py-2"
                  >
                    🗺️ ルート
                  </button>
                  <button
                    onClick={() => {
                      setSelectedShop(shop)
                      showToast(`${shop.name}の詳細を表示`, 'info')
                    }}
                    className="btn-glass bg-orange-500 text-white hover:bg-orange-600 text-sm py-2"
                  >
                    📝 詳細
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* ミニマップ */}
      {showMiniMap && currentLocation && <MiniMap position={currentLocation} />}

      {/* カスタムスタイル */}
      <style jsx global>{`
        .custom-popup .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          padding: 0;
          overflow: hidden;
        }

        .dark .custom-popup .leaflet-popup-content-wrapper {
          background: rgba(26, 26, 26, 0.95);
        }

        .custom-popup .leaflet-popup-content {
          margin: 0;
          width: 100% !important;
        }

        .custom-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.95);
        }

        .dark .custom-popup .leaflet-popup-tip {
          background: rgba(26, 26, 26, 0.95);
        }

        .custom-marker {
          animation: marker-appear 0.5s ease-out;
          transition: all 0.3s ease;
        }

        .custom-marker:hover {
          transform: scale(1.2);
          z-index: 1000 !important;
        }

        .current-location-marker {
          z-index: 999 !important;
        }

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
      `}</style>
    </div>
  )
}