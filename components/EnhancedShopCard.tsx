'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { useTheme } from '../contexts/ThemeContext'
import type { ShopWithDetails } from '../types/shop'
import { showToast } from './ToastNotification'

const CATEGORIES = {
  cafe: '☕ カフェ',
  roastery: '🔥 自家焙煎',
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

interface EnhancedShopCardProps {
  shop: ShopWithDetails
  onToggleFavorite: (shopId: number) => void
  onShowDetails: (shop: ShopWithDetails) => void
  onShowReviews: (shop: ShopWithDetails) => void
  onNavigate: (shop: ShopWithDetails) => void
}

export default function EnhancedShopCard({
  shop,
  onToggleFavorite,
  onShowDetails,
  onShowReviews,
  onNavigate
}: EnhancedShopCardProps) {
  const { density } = useTheme()
  const [imageError, setImageError] = useState(false)

  const averageRating = shop.reviews && shop.reviews.length > 0
    ? shop.reviews.reduce((sum, r) => sum + r.rating, 0) / shop.reviews.length
    : 0

  const isOpen = () => {
    if (!shop.hours) return false
    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = now.toTimeString().slice(0, 5)
    const todayHours = shop.hours.find(h => h.day_of_week === currentDay)
    
    if (!todayHours || todayHours.is_closed) return false
    if (!todayHours.open_time || !todayHours.close_time) return false
    
    return currentTime >= todayHours.open_time && currentTime <= todayHours.close_time
  }

  const handleCall = () => {
    if (shop.phone) {
      window.location.href = `tel:${shop.phone}`
    } else {
      showToast('電話番号が登録されていません', 'warning')
    }
  }

  const renderCompactView = () => (
    <div className="glass rounded-xl overflow-hidden hover-lift animate-fade-in-up group">
      <div className="p-4">
        <div className="flex gap-4">
          {/* 画像 */}
          <div className="relative w-20 h-20 flex-shrink-0">
            {shop.main_image_url && !imageError ? (
              <Image
                src={shop.main_image_url}
                alt={shop.name}
                fill
                className="object-cover rounded-lg"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-amber-600 rounded-lg flex items-center justify-center text-white text-2xl">
                {CATEGORIES[shop.category].split(' ')[0]}
              </div>
            )}
          </div>

          {/* 情報 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white truncate">
              {shop.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {CATEGORIES[shop.category]} • {PRICE_RANGES[shop.price_range]}
            </p>
            
            <div className="flex items-center gap-3 mt-2">
              {averageRating > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">({shop.reviews?.length})</span>
                </div>
              )}
              
              <span className={`text-xs px-2 py-1 rounded-full ${
                isOpen()
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {isOpen() ? '営業中' : '営業時間外'}
              </span>
              
              {shop.distance && (
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {shop.distance.toFixed(1)}km
                </span>
              )}
            </div>
          </div>

          {/* アクション */}
          <div className="flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(shop.id)
              }}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {shop.isFavorite ? '❤️' : '🤍'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderDetailedView = () => (
    <div className="glass rounded-xl overflow-hidden hover-lift animate-fade-in-up group">
      {/* グラデーションボーダー */}
      <div className="h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      
      <div className="p-6">
        {/* ヘッダー */}
        <div className="flex gap-4 mb-4">
          <div className="relative w-24 h-24 flex-shrink-0">
            {shop.main_image_url && !imageError ? (
              <Image
                src={shop.main_image_url}
                alt={shop.name}
                fill
                className="object-cover rounded-xl shadow-lg"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-amber-600 rounded-xl flex items-center justify-center text-white text-3xl shadow-lg">
                {CATEGORIES[shop.category].split(' ')[0]}
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {shop.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              {CATEGORIES[shop.category]} • {shop.address}
            </p>
            
            <div className="flex flex-wrap items-center gap-3">
              {averageRating > 0 && (
                <div className="glass-sm px-3 py-1 rounded-lg flex items-center gap-2">
                  <span className="text-yellow-500">⭐⭐⭐⭐⭐</span>
                  <span className="font-bold text-yellow-600">{averageRating.toFixed(1)}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({shop.reviews?.length}件)
                  </span>
                </div>
              )}
              
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                isOpen()
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
              }`}>
                {isOpen() ? '営業中' : '営業時間外'}
              </span>
              
              {shop.distance && (
                <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                  徒歩{Math.round(shop.distance * 12)}分 ({shop.distance.toFixed(1)}km)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 詳細情報グリッド */}
        <div className="glass-sm rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">価格帯</div>
              <div className="font-bold text-orange-600">{PRICE_RANGES[shop.price_range]}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">混雑状況</div>
              <div className="font-bold text-gray-900 dark:text-white">やや空き</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">平均滞在</div>
              <div className="font-bold text-gray-900 dark:text-white">45分</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">席数</div>
              <div className="font-bold text-gray-900 dark:text-white">24席</div>
            </div>
          </div>
        </div>

        {/* 設備・タグ */}
        <div className="flex flex-wrap gap-2 mb-4">
          {shop.has_wifi && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-sm font-medium">
              📶 Wi-Fi完備
            </span>
          )}
          {shop.has_power && (
            <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-medium">
              🔌 電源豊富
            </span>
          )}
          {shop.tags?.map(tag => (
            <span key={tag.id} className="px-3 py-1 glass-sm rounded-lg text-sm">
              {tag.tag}
            </span>
          ))}
        </div>

        {/* 説明 */}
        {shop.description && (
          <div className="glass-sm rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              ☕ <span className="font-medium text-orange-600">本格的なコーヒー体験</span>をお求めの皆様へ。
              {shop.description}
            </p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => onToggleFavorite(shop.id)}
            className={`btn-glass text-sm ${
              shop.isFavorite 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'hover:bg-red-500/20'
            }`}
          >
            {shop.isFavorite ? '❤️ 追加済み' : '❤️ お気に入り'}
          </button>
          
          <button
            onClick={() => onShowDetails(shop)}
            className="btn-glass bg-orange-500 text-white hover:bg-orange-600 text-sm"
          >
            📝 詳細・レビュー
          </button>
          
          <button
            onClick={() => onNavigate(shop)}
            className="btn-glass bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            🗺️ ルート案内
          </button>
          
          <button
            onClick={handleCall}
            className="btn-glass bg-green-600 text-white hover:bg-green-700 text-sm"
          >
            📞 電話する
          </button>
        </div>
      </div>
    </div>
  )

  return density === 'compact' ? renderCompactView() : renderDetailedView()
}