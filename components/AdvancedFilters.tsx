// components/AdvancedFilters.tsx
'use client'
import React, { useState } from 'react'
import type { FilterState } from '../types/filters'

interface AdvancedFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  currentLocation: [number, number] | null
  availableTags: string[]
  className?: string
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']
const PAYMENT_METHODS = [
  { value: 'cash', label: '💰 現金', icon: '💰' },
  { value: 'credit', label: '💳 クレジットカード', icon: '💳' },
  { value: 'debit', label: '💳 デビットカード', icon: '💳' },
  { value: 'qr-code', label: '📱 QRコード決済', icon: '📱' },
  { value: 'ic-card', label: '💳 ICカード', icon: '💳' },
  { value: 'paypay', label: '📱 PayPay', icon: '📱' },
  { value: 'line-pay', label: '📱 LINE Pay', icon: '📱' }
]

export default function AdvancedFilters({
  filters,
  onFiltersChange,
  currentLocation,
  availableTags,
  className = ''
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 型安全なフィルター更新関数
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleFeature = (feature: string) => {
    const features = filters.features.includes(feature)
      ? filters.features.filter(f => f !== feature)
      : [...filters.features, feature]
    updateFilter('features', features)
  }

  const toggleTag = (tag: string) => {
    const tags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    updateFilter('tags', tags)
  }

  const togglePaymentMethod = (method: string) => {
    const methods = filters.paymentMethods.includes(method)
      ? filters.paymentMethods.filter(m => m !== method)
      : [...filters.paymentMethods, method]
    updateFilter('paymentMethods', methods)
  }

  const clearAllFilters = () => {
    onFiltersChange({
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
    })
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.category !== 'all') count++
    if (filters.priceRange !== 'all') count++
    if (filters.features.length > 0) count += filters.features.length
    if (filters.showFavoritesOnly) count++
    if (filters.isOpenNow) count++
    if (filters.openAt.enabled) count++
    if (filters.hasReviews) count++
    if (filters.minRating > 0) count++
    if (filters.distance.enabled) count++
    if (filters.tags.length > 0) count += filters.tags.length
    if (filters.paymentMethods.length > 0) count += filters.paymentMethods.length
    return count
  }

  const activeCount = getActiveFilterCount()

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* フィルターヘッダー */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-gray-900">🔍 詳細フィルター</h3>
            {activeCount > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {activeCount}個適用中
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                すべてクリア
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              {isExpanded ? '▲ 閉じる' : '▼ 詳細設定'}
            </button>
          </div>
        </div>
      </div>

      {/* 基本フィルター（常に表示） */}
      <div className="p-4 space-y-4">
        {/* 営業状況フィルター */}
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.isOpenNow}
              onChange={(e) => updateFilter('isOpenNow', e.target.checked)}
              className="mr-2 rounded"
            />
            <span className="text-sm">🕐 現在営業中</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.hasReviews}
              onChange={(e) => updateFilter('hasReviews', e.target.checked)}
              className="mr-2 rounded"
            />
            <span className="text-sm">💬 レビューあり</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.showFavoritesOnly}
              onChange={(e) => updateFilter('showFavoritesOnly', e.target.checked)}
              className="mr-2 rounded"
            />
            <span className="text-sm">❤️ お気に入りのみ</span>
          </label>
        </div>

        {/* 設備フィルター */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">設備・サービス</label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'wifi', label: '📶 Wi-Fi' },
              { key: 'power', label: '🔌 電源' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleFeature(key)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filters.features.includes(key)
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

      {/* 詳細フィルター（展開時のみ表示） */}
      {isExpanded && (
        <div className="border-t p-4 space-y-6">
          {/* 評価フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              最小評価: {filters.minRating > 0 ? `${filters.minRating}⭐以上` : '指定なし'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={filters.minRating}
                onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
                className="flex-1"
              />
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <span 
                    key={star} 
                    className={star <= filters.minRating ? 'text-yellow-400' : 'text-gray-300'}
                  >
                    ⭐
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 距離フィルター */}
          {currentLocation && (
            <div>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={filters.distance.enabled}
                  onChange={(e) => updateFilter('distance', {
                    ...filters.distance,
                    enabled: e.target.checked
                  })}
                  className="mr-2 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  距離で絞り込み: {filters.distance.enabled ? `${filters.distance.maxKm}km以内` : '無効'}
                </span>
              </label>
              
              {filters.distance.enabled && (
                <div className="flex items-center gap-2 ml-6">
                  <input
                    type="range"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={filters.distance.maxKm}
                    onChange={(e) => updateFilter('distance', {
                      ...filters.distance,
                      maxKm: parseFloat(e.target.value)
                    })}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 min-w-[60px]">
                    {filters.distance.maxKm}km
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 特定時間営業フィルター */}
          <div>
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={filters.openAt.enabled}
                onChange={(e) => updateFilter('openAt', {
                  ...filters.openAt,
                  enabled: e.target.checked
                })}
                className="mr-2 rounded"
              />
              <span className="text-sm font-medium text-gray-700">特定時間に営業</span>
            </label>
            
            {filters.openAt.enabled && (
              <div className="flex items-center gap-3 ml-6">
                <select
                  value={filters.openAt.day}
                  onChange={(e) => updateFilter('openAt', {
                    ...filters.openAt,
                    day: parseInt(e.target.value)
                  })}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  {DAY_NAMES.map((day, index) => (
                    <option key={index} value={index}>{day}曜日</option>
                  ))}
                </select>
                
                <input
                  type="time"
                  value={filters.openAt.time}
                  onChange={(e) => updateFilter('openAt', {
                    ...filters.openAt,
                    time: e.target.value
                  })}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            )}
          </div>

          {/* 決済方法フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">決済方法</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => togglePaymentMethod(value)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.paymentMethods.includes(value)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {icon} {label.replace(/^.* /, '')}
                </button>
              ))}
            </div>
          </div>

          {/* タグフィルター */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タグ ({filters.tags.length}個選択中)
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableTags.slice(0, 20).map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.tags.includes(tag)
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
                {availableTags.length > 20 && (
                  <span className="text-sm text-gray-500 px-3 py-1">
                    他{availableTags.length - 20}個...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* フィルター統計 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">📊 フィルター統計</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
              <div>
                <span className="font-medium">基本条件:</span>
                <span className="ml-1">
                  {[filters.search, filters.category !== 'all', filters.priceRange !== 'all'].filter(Boolean).length}個
                </span>
              </div>
              <div>
                <span className="font-medium">設備:</span>
                <span className="ml-1">{filters.features.length}個</span>
              </div>
              <div>
                <span className="font-medium">タグ:</span>
                <span className="ml-1">{filters.tags.length}個</span>
              </div>
              <div>
                <span className="font-medium">決済:</span>
                <span className="ml-1">{filters.paymentMethods.length}個</span>
              </div>
            </div>
          </div>

          {/* フィルター保存・読み込み */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">クイック設定</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  updateFilter('isOpenNow', true)
                  updateFilter('features', ['wifi'])
                  updateFilter('minRating', 4.0)
                }}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
              >
                ⚡ 作業向け (営業中・Wi-Fi・高評価)
              </button>
              <button
                onClick={() => {
                  updateFilter('priceRange', '1')
                  updateFilter('features', ['wifi'])
                }}
                className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm hover:bg-green-100 transition-colors"
              >
                💰 リーズナブル (安価・Wi-Fi)
              </button>
              <button
                onClick={() => {
                  updateFilter('minRating', 4.5)
                  updateFilter('hasReviews', true)
                }}
                className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm hover:bg-yellow-100 transition-colors"
              >
                ⭐ 高評価店のみ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フィルター適用中の警告 */}
      {activeCount > 5 && (
        <div className="p-3 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-center gap-2 text-yellow-800 text-sm">
            <span>⚠️</span>
            <span>多くのフィルターが設定されています。条件に一致する店舗が見つからない場合は、一部の条件を緩和してください。</span>
          </div>
        </div>
      )}
    </div>
  )
}