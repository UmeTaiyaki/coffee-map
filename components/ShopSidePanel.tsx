// components/ShopSidePanel.tsx
import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import ReviewModal from './ReviewModal'  // DetailedReviewModal → ReviewModal に変更

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
  uploaded_by?: string
  created_at: string
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
  average_ratings?: {
    overall: number
    atmosphere: number
    coffee_quality: number
    service: number
    value: number
  }
  review_count?: number
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

interface ShopSidePanelProps {
  shop: ShopWithDetails | null
  isOpen: boolean
  onClose: () => void
  onToggleFavorite?: (shopId: number) => void
  isFavorite?: boolean
}

export default function ShopSidePanel({
  shop,
  isOpen,
  onClose,
  onToggleFavorite,
  isFavorite = false
}: ShopSidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)

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

  // ShopImageの型を正しく使用
  const mainImage = shop.images?.find(img => img.is_main) || shop.images?.[0]
  const imageUrl = mainImage?.image_url || shop.main_image_url

  return (
    <>
      <div
        ref={panelRef}
        className={`
          fixed top-0 right-0 h-full bg-white shadow-2xl z-[1001]
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}
          border-l border-gray-200
          flex flex-col
          w-full max-w-sm
          md:w-96
        `}
        style={{
          maxHeight: '100vh',
          minHeight: '100vh'
        }}
      >
        {/* ヘッダー - 固定 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{CATEGORIES[shop.category].split(' ')[0]}</span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
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
            className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
            aria-label="パネルを閉じる"
          >
            <span className="text-gray-500 text-xl">×</span>
          </button>
        </div>

        {/* コンテンツエリア - スクロール可能 */}
        <div className="flex-1 overflow-y-auto">
          {/* メイン画像 */}
          {imageUrl && (
            <div className="relative">
              <Image
                src={imageUrl}
                alt={shop.name}
                width={400}
                height={192}
                className="w-full h-48 object-cover"
                priority
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

          <div className="p-4 space-y-6 pb-24">
            {/* 基本情報 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                📍 基本情報
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-gray-500 font-medium min-w-[60px] flex-shrink-0">住所:</span>
                  <span className="text-gray-700 break-words">{shop.address}</span>
                </div>
                
                {shop.phone && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 font-medium min-w-[60px] flex-shrink-0">電話:</span>
                    <a 
                      href={`tel:${shop.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {shop.phone}
                    </a>
                  </div>
                )}
                
                {shop.website && (
                  <div className="flex items-start space-x-2">
                    <span className="text-gray-500 font-medium min-w-[60px] flex-shrink-0">Web:</span>
                    <a 
                      href={shop.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {shop.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {shop.distance !== undefined && shop.distance > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 font-medium min-w-[60px] flex-shrink-0">距離:</span>
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
                {/* 設備がない場合の表示 */}
                {!shop.has_wifi && !shop.has_power && (!shop.payment_methods || shop.payment_methods.length === 0) && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                    設備情報なし
                  </span>
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
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {shop.description}
                  </p>
                </div>
              </div>
            )}

            {/* 画像ギャラリー */}
            {shop.images && shop.images.length > 1 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  📷 写真
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {shop.images.slice(0, 4).map((image, index) => (
                    <div key={image.id} className="relative">
                      <Image
                        src={image.image_url}
                        alt={`${shop.name} 写真 ${index + 1}`}
                        width={200}
                        height={150}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      {image.created_at && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg">
                          {new Date(image.created_at).toLocaleDateString('ja-JP')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* アクションボタン（フッター固定） */}
        <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200">
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
              onClick={() => setShowReviewModal(true)}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              📝 レビューを見る・書く
            </button>
            
            <button
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              🗺️ ルート案内
            </button>
          </div>
        </div>
      </div>

      {/* 統合されたレビューモーダル */}
      {shop && (
        <ReviewModal
          shopId={shop.id}
          shopName={shop.name}
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onReviewAdded={() => {
            // 必要に応じてレビュー追加後の処理
          }}
        />
      )}

      <style jsx>{`
        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .break-words {
          word-wrap: break-word;
          word-break: break-word;
        }
        
        .break-all {
          word-break: break-all;
        }
        
        .whitespace-pre-wrap {
          white-space: pre-wrap;
        }
        
        /* スクロールバーのスタイリング */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* モバイル対応 */
        @media (max-width: 768px) {
          .max-w-sm {
            max-width: 100vw;
          }
        }
      `}</style>
    </>
  )
}