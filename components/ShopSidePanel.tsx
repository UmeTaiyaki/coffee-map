// components/ShopSidePanel.tsx
import React, { useEffect, useRef } from 'react'

interface ShopWithDetails {
  id: number
  name: string
  address: string
  description?: string
  latitude: number
  longitude: number
  phone?: string
  website?: string
  has_wifi?: boolean
  has_power?: boolean
  category: 'cafe' | 'roastery' | 'chain' | 'specialty' | 'bakery'
  price_range: 1 | 2 | 3 | 4
  main_image_url?: string
  payment_methods?: string[]
  hours?: Array<{
    id: number
    day_of_week: number
    open_time?: string
    close_time?: string
    is_closed: boolean
  }>
  tags?: Array<{
    id: number
    tag: string
  }>
  distance?: number
}

interface ShopSidePanelProps {
  shop: ShopWithDetails | null
  isOpen: boolean
  onClose: () => void
  onToggleFavorite?: (shopId: number) => void
  isFavorite?: boolean
}

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

export default function ShopSidePanel({
  shop,
  isOpen,
  onClose,
  onToggleFavorite,
  isFavorite = false
}: ShopSidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // ESCキーでパネルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // パネル外クリックで閉じる処理を改善
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isOpen || !panelRef.current) return
      
      const target = e.target as HTMLElement
      
      // パネル内のクリックは無視
      if (panelRef.current.contains(target)) return
      
      // Leafletのポップアップ内のクリックは無視
      if (target.closest('.leaflet-popup')) return
      
      // Leafletのマーカーのクリックは無視
      if (target.closest('.leaflet-marker-icon')) return
      
      // それ以外の場合はパネルを閉じる
      onClose()
    }

    if (isOpen) {
      // イベントリスナーを少し遅延させてマーカークリックとの競合を避ける
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      
      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  if (!shop) return null

  // 営業時間チェック
  const getCurrentDay = () => new Date().getDay()
  const getCurrentTime = () => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  }

  const isOpenNow = () => {
    if (!shop.hours) return false
    const currentDay = getCurrentDay()
    const currentTime = getCurrentTime()
    const todayHours = shop.hours.find(h => h.day_of_week === currentDay)
    
    if (!todayHours || todayHours.is_closed) return false
    if (!todayHours.open_time || !todayHours.close_time) return false
    
    return currentTime >= todayHours.open_time && currentTime <= todayHours.close_time
  }

  const formatTodayHours = () => {
    if (!shop.hours) return '営業時間不明'
    const todayHours = shop.hours.find(h => h.day_of_week === getCurrentDay())
    if (!todayHours) return '営業時間不明'
    if (todayHours.is_closed) return '本日定休日'
    if (!todayHours.open_time || !todayHours.close_time) return '営業時間不明'
    
    return `${todayHours.open_time} - ${todayHours.close_time}`
  }

  return (
    <>
      {/* オーバーレイ（モバイル用） */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-[9998] md:hidden"
          onClick={onClose}
        />
      )}

      {/* サイドパネル */}
      <div
        ref={panelRef}
        className={`
          fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[9999]
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          border-l border-gray-200
        `}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{CATEGORIES[shop.category].split(' ')[0]}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900 line-clamp-1">
                {shop.name}
              </h2>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-orange-500 font-medium">
                  {PRICE_RANGES[shop.price_range]}
                </span>
                {shop.hours && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isOpenNow() 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {isOpenNow() ? '営業中' : '営業時間外'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="パネルを閉じる"
          >
            <span className="text-gray-500 text-xl">×</span>
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="h-full overflow-y-auto pb-20">
          {/* メイン画像 */}
          {shop.main_image_url && (
            <div className="relative">
              <img
                src={shop.main_image_url}
                alt={shop.name}
                className="w-full h-48 object-cover"
              />
              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(shop.id)}
                  className="absolute top-3 right-3 p-2 bg-white bg-opacity-90 rounded-full shadow-md hover:bg-opacity-100 transition-all"
                >
                  <span className={`text-xl ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}>
                    {isFavorite ? '❤️' : '🤍'}
                  </span>
                </button>
              )}
            </div>
          )}

          <div className="p-4 space-y-6">
            {/* 基本情報 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                📍 基本情報
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-gray-500 font-medium min-w-[60px]">住所:</span>
                  <span className="text-gray-700">{shop.address}</span>
                </div>
                
                {shop.phone && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 font-medium min-w-[60px]">電話:</span>
                    <a 
                      href={`tel:${shop.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {shop.phone}
                    </a>
                  </div>
                )}
                
                {shop.website && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 font-medium min-w-[60px]">Web:</span>
                    <a 
                      href={shop.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate"
                    >
                      {shop.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {shop.distance && shop.distance > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 font-medium min-w-[60px]">距離:</span>
                    <span className="text-blue-600 font-medium">
                      約{shop.distance.toFixed(1)}km (徒歩約{Math.round(shop.distance * 12)}分)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 営業時間 */}
            {shop.hours && shop.hours.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  🕐 営業時間
                </h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    本日: {formatTodayHours()}
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    {shop.hours
                      .sort((a, b) => a.day_of_week - b.day_of_week)
                      .map((hour) => (
                        <div 
                          key={hour.day_of_week} 
                          className={`flex justify-between py-1 ${
                            hour.day_of_week === getCurrentDay() 
                              ? 'font-semibold text-blue-600' 
                              : 'text-gray-600'
                          }`}
                        >
                          <span>{DAY_NAMES[hour.day_of_week]}:</span>
                          <span>
                            {hour.is_closed 
                              ? '定休日' 
                              : `${hour.open_time} - ${hour.close_time}`
                            }
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* 設備・サービス */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                🔧 設備・サービス
              </h3>
              <div className="flex flex-wrap gap-2">
                {shop.has_wifi && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    📶 Wi-Fi
                  </span>
                )}
                {shop.has_power && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    🔌 電源
                  </span>
                )}
                {shop.payment_methods && shop.payment_methods.length > 0 && (
                  <>
                    {shop.payment_methods.includes('cash') && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                        💰 現金
                      </span>
                    )}
                    {shop.payment_methods.includes('credit') && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        💳 カード
                      </span>
                    )}
                    {shop.payment_methods.some(method => 
                      ['qr-code', 'paypay', 'line-pay'].includes(method)
                    ) && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                        📱 QR決済
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* タグ */}
            {shop.tags && shop.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  🏷️ タグ
                </h3>
                <div className="flex flex-wrap gap-2">
                  {shop.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm"
                    >
                      #{tag.tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 説明 */}
            {shop.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  📝 説明
                </h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {shop.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* アクションボタン（フッター固定） */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <div className="flex gap-3">
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(shop.id)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  isFavorite
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isFavorite ? '❤️ お気に入り解除' : '🤍 お気に入り'}
              </button>
            )}
            
            <button
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              🗺️ ルート案内
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  )
}