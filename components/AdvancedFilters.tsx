'use client'
import React, { useState, useCallback, useMemo } from 'react'
import type { FilterState, FeatureType, PaymentMethodType } from '../types/filters'

interface AdvancedFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  currentLocation: [number, number] | null
  availableTags: string[]
  className?: string
}

// 定数
const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'] as const

const PAYMENT_METHODS: Array<{ value: PaymentMethodType; label: string }> = [
  { value: 'cash', label: '💰 現金' },
  { value: 'credit', label: '💳 クレジットカード' },
  { value: 'debit', label: '💳 デビットカード' },
  { value: 'qr-code', label: '📱 QRコード決済' },
  { value: 'ic-card', label: '💳 ICカード' },
  { value: 'paypay', label: '📱 PayPay' },
  { value: 'line-pay', label: '📱 LINE Pay' }
]

const QUICK_PRESETS = [
  {
    label: '⚡ 作業向け',
    description: '営業中・Wi-Fi・高評価',
    filters: {
      isOpenNow: true,
      features: ['wifi'] as FeatureType[],
      minRating: 4.0
    }
  },
  {
    label: '💰 リーズナブル',
    description: '安価・Wi-Fi',
    filters: {
      priceRange: '1' as const,
      features: ['wifi'] as FeatureType[]
    }
  },
  {
    label: '⭐ 高評価店のみ',
    description: '評価4.5以上・レビューあり',
    filters: {
      minRating: 4.5,
      hasReviews: true
    }
  }
] as const

// コンポーネント
function FilterToggle({ 
  label, 
  checked, 
  onChange,
  icon 
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  icon?: string
}) {
  return (
    <label className="flex items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mr-2 rounded"
      />
      <span className="text-sm">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </span>
    </label>
  )
}

function TagSelector({
  selectedTags,
  availableTags,
  onToggle,
  maxDisplay = 20
}: {
  selectedTags: string[]
  availableTags: string[]
  onToggle: (tag: string) => void
  maxDisplay?: number
}) {
  const displayTags = availableTags.slice(0, maxDisplay)
  const remainingCount = availableTags.length - maxDisplay

  return (
    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
      {displayTags.map((tag) => (
        <button
          key={tag}
          onClick={() => onToggle(tag)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            selectedTags.includes(tag)
              ? 'bg-purple-100 text-purple-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          #{tag}
        </button>
      ))}
      {remainingCount > 0 && (
        <span className="text-sm text-gray-500 px-3 py-1">
          他{remainingCount}個...
        </span>
      )}
    </div>
  )
}

function RatingSlider({
  value,
  onChange
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        最小評価: {value > 0 ? `${value}⭐以上` : '指定なし'}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1"
        />
        <div className="flex">
          {[1, 2, 3, 4, 5].map(star => (
            <span 
              key={star} 
              className={star <= value ? 'text-yellow-400' : 'text-gray-300'}
            >
              ⭐
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function DistanceFilter({
  enabled,
  maxKm,
  onEnabledChange,
  onDistanceChange
}: {
  enabled: boolean
  maxKm: number
  onEnabledChange: (enabled: boolean) => void
  onDistanceChange: (km: number) => void
}) {
  return (
    <div>
      <label className="flex items-center mb-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="mr-2 rounded"
        />
        <span className="text-sm font-medium text-gray-700">
          距離で絞り込み: {enabled ? `${maxKm}km以内` : '無効'}
        </span>
      </label>
      
      {enabled && (
        <div className="flex items-center gap-2 ml-6">
          <input
            type="range"
            min="0.5"
            max="20"
            step="0.5"
            value={maxKm}
            onChange={(e) => onDistanceChange(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-600 min-w-[60px]">
            {maxKm}km
          </span>
        </div>
      )}
    </div>
  )
}

function OpenAtFilter({
  enabled,
  day,
  time,
  onEnabledChange,
  onDayChange,
  onTimeChange
}: {
  enabled: boolean
  day: number
  time: string
  onEnabledChange: (enabled: boolean) => void
  onDayChange: (day: number) => void
  onTimeChange: (time: string) => void
}) {
  return (
    <div>
      <label className="flex items-center mb-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="mr-2 rounded"
        />
        <span className="text-sm font-medium text-gray-700">特定時間に営業</span>
      </label>
      
      {enabled && (
        <div className="flex items-center gap-3 ml-6">
          <select
            value={day}
            onChange={(e) => onDayChange(parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            {DAY_NAMES.map((dayName, index) => (
              <option key={index} value={index}>{dayName}曜日</option>
            ))}
          </select>
          
          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      )}
    </div>
  )
}

export default function AdvancedFilters({
  filters,
  onFiltersChange,
  currentLocation,
  availableTags,
  className = ''
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // フィルター更新関数
  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }, [filters, onFiltersChange])

  // 配列型フィルターのトグル関数
  const toggleFeature = useCallback((feature: FeatureType) => {
    const updated = filters.features.includes(feature)
      ? filters.features.filter(f => f !== feature)
      : [...filters.features, feature]
    updateFilter('features', updated)
  }, [filters.features, updateFilter])

  const toggleTag = useCallback((tag: string) => {
    const updated = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    updateFilter('tags', updated)
  }, [filters.tags, updateFilter])

  const togglePaymentMethod = useCallback((method: PaymentMethodType) => {
    const updated = filters.paymentMethods.includes(method)
      ? filters.paymentMethods.filter(m => m !== method)
      : [...filters.paymentMethods, method]
    updateFilter('paymentMethods', updated)
  }, [filters.paymentMethods, updateFilter])

  // アクティブフィルター数の計算
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.category !== 'all') count++
    if (filters.priceRange !== 'all') count++
    count += filters.features.length
    if (filters.showFavoritesOnly) count++
    if (filters.isOpenNow) count++
    if (filters.openAt.enabled) count++
    if (filters.hasReviews) count++
    if (filters.minRating > 0) count++
    if (filters.distance.enabled) count++
    count += filters.tags.length
    count += filters.paymentMethods.length
    return count
  }, [filters])

  // フィルタークリア
  const clearAllFilters = useCallback(() => {
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
  }, [onFiltersChange])

  // プリセット適用
  const applyPreset = useCallback((preset: typeof QUICK_PRESETS[number]) => {
    onFiltersChange({
      ...filters,
      ...preset.filters
    })
  }, [filters, onFiltersChange])

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* ヘッダー */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-gray-900">🔍 詳細フィルター</h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {activeFilterCount}個適用中
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
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

      {/* 基本フィルター */}
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          <FilterToggle
            label="現在営業中"
            checked={filters.isOpenNow}
            onChange={(checked) => updateFilter('isOpenNow', checked)}
            icon="🕐"
          />
          <FilterToggle
            label="レビューあり"
            checked={filters.hasReviews}
            onChange={(checked) => updateFilter('hasReviews', checked)}
            icon="💬"
          />
          <FilterToggle
            label="お気に入りのみ"
            checked={filters.showFavoritesOnly}
            onChange={(checked) => updateFilter('showFavoritesOnly', checked)}
            icon="❤️"
          />
        </div>

        {/* 設備フィルター */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">設備・サービス</label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'wifi' as FeatureType, label: '📶 Wi-Fi' },
              { key: 'power' as FeatureType, label: '🔌 電源' }
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

      {/* 詳細フィルター */}
      {isExpanded && (
        <div className="border-t p-4 space-y-6">
          {/* 評価フィルター */}
          <RatingSlider
            value={filters.minRating}
            onChange={(value) => updateFilter('minRating', value)}
          />

          {/* 距離フィルター */}
          {currentLocation && (
            <DistanceFilter
              enabled={filters.distance.enabled}
              maxKm={filters.distance.maxKm}
              onEnabledChange={(enabled) => updateFilter('distance', {
                ...filters.distance,
                enabled
              })}
              onDistanceChange={(maxKm) => updateFilter('distance', {
                ...filters.distance,
                maxKm
              })}
            />
          )}

          {/* 特定時間営業フィルター */}
          <OpenAtFilter
            enabled={filters.openAt.enabled}
            day={filters.openAt.day}
            time={filters.openAt.time}
            onEnabledChange={(enabled) => updateFilter('openAt', {
              ...filters.openAt,
              enabled
            })}
            onDayChange={(day) => updateFilter('openAt', {
              ...filters.openAt,
              day
            })}
            onTimeChange={(time) => updateFilter('openAt', {
              ...filters.openAt,
              time
            })}
          />

          {/* 決済方法フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">決済方法</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => togglePaymentMethod(value)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.paymentMethods.includes(value)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label.replace(/^.* /, '')}
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
              <TagSelector
                selectedTags={filters.tags}
                availableTags={availableTags}
                onToggle={toggleTag}
              />
            </div>
          )}

          {/* クイック設定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">クイック設定</label>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                >
                  {preset.label} ({preset.description})
                </button>
              ))}
            </div>
          </div>

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
        </div>
      )}

      {/* 警告メッセージ */}
      {activeFilterCount > 5 && (
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