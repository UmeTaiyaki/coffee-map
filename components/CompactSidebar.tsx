// components/CompactSidebar.tsx
'use client'
import React, { useState, useCallback, useMemo } from 'react'
import { useUser } from '../contexts/UserContext'
import { showToast } from './ToastNotification'
import type { FilterState, SortState } from '../types/filters'

interface CompactSidebarProps {
  refreshTrigger: number
  isMobile?: boolean
}

// 定数
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

const SORT_OPTIONS = [
  { value: 'rating', label: '⭐ 評価順', description: '評価の高い順' },
  { value: 'distance', label: '📍 距離順', description: '現在地から近い順' },
  { value: 'review_count', label: '💬 レビュー数順', description: 'レビューが多い順' },
  { value: 'newest', label: '🆕 新着順', description: '新しく登録された順' },
  { value: 'price_low', label: '💰 価格安順', description: '価格帯が安い順' },
  { value: 'price_high', label: '💎 価格高順', description: '価格帯が高い順' },
  { value: 'name', label: '🔤 名前順', description: '店舗名のあいうえお順' },
  { value: 'random', label: '🎲 ランダム', description: 'ランダムな順番' }
] as const

// デフォルト値
const defaultFilters: FilterState = {
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
}

const defaultSort: SortState = {
  option: 'distance',
  direction: 'asc'
}

// フィルターセクションコンポーネント
function FilterSection({ 
  title, 
  icon, 
  isOpen, 
  onToggle, 
  children,
  isMobile = false 
}: {
  title: string
  icon: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  isMobile?: boolean
}) {
  return (
    <div className={`border-b border-gray-200 ${isMobile ? 'bg-white rounded-lg mb-2' : ''}`}>
      <button
        onClick={onToggle}
        className={`w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 transition-colors ${
          isMobile ? 'rounded-t-lg' : ''
        }`}
      >
        <span className="font-medium text-gray-800 flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </span>
        <span className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          ▶
        </span>
      </button>
      {isOpen && (
        <div className={`px-4 pb-4 ${isMobile ? 'rounded-b-lg bg-white' : ''}`}>
          {children}
        </div>
      )}
    </div>
  )
}

// クイックフィルタータグ
function QuickFilterTag({ 
  label, 
  active, 
  onClick 
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-blue-100 text-blue-800 border border-blue-200'
          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  )
}

export default function CompactSidebar({ refreshTrigger, isMobile = false }: CompactSidebarProps) {
  const { user } = useUser()
  
  // 状態管理
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [sortState, setSortState] = useState<SortState>(defaultSort)
  const [isLocating, setIsLocating] = useState(false)
  const [hasLocation, setHasLocation] = useState(false)
  const [filteredCount, setFilteredCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  
  // フィルターセクションの開閉状態
  const [openSections, setOpenSections] = useState({
    basic: true,
    advanced: false,
    sort: false
  })

  // セクション開閉制御
  const toggleSection = useCallback((section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }, [])

  // 現在地取得
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('このブラウザでは位置情報がサポートされていません', 'error')
      return
    }

    setIsLocating(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHasLocation(true)
        setIsLocating(false)
        showToast('現在地を取得しました', 'success')
      },
      (error) => {
        setIsLocating(false)
        let errorMessage = '位置情報取得中にエラーが発生しました'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '位置情報の取得が拒否されました'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置情報を取得できません'
            break
          case error.TIMEOUT:
            errorMessage = '位置情報取得がタイムアウトしました'
            break
        }
        showToast(errorMessage, 'error')
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 300000
      }
    )
  }, [])

  // フィルター更新
  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // クイックフィルタートグル
  const toggleQuickFilter = useCallback((type: string) => {
    switch (type) {
      case 'open':
        updateFilter('isOpenNow', !filters.isOpenNow)
        break
      case 'wifi':
        const hasWifi = filters.features.includes('wifi')
        updateFilter('features', hasWifi 
          ? filters.features.filter(f => f !== 'wifi')
          : [...filters.features, 'wifi']
        )
        break
      case 'power':
        const hasPower = filters.features.includes('power')
        updateFilter('features', hasPower 
          ? filters.features.filter(f => f !== 'power')
          : [...filters.features, 'power']
        )
        break
      case 'favorites':
        updateFilter('showFavoritesOnly', !filters.showFavoritesOnly)
        break
    }
  }, [filters, updateFilter])

  // フィルタークリア
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
    setSortState(defaultSort)
    showToast('フィルターをリセットしました', 'info')
  }, [])

  // アクティブフィルター数計算
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

  const containerClasses = isMobile 
    ? "space-y-2" 
    : "h-full bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col"

  const contentClasses = isMobile 
    ? "" 
    : "flex-1 overflow-y-auto"

  return (
    <div className={containerClasses}>
      {/* 検索セクション */}
      <div className={isMobile ? "bg-white rounded-lg p-4" : "p-4 border-b border-gray-200 flex-shrink-0"}>
        {/* 検索バー */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="店舗名・住所・説明で検索..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* クイックアクション */}
        <div className="flex gap-2">
          <button
            onClick={getCurrentLocation}
            disabled={isLocating}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isLocating 
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isLocating ? '📍 取得中...' : '📍 現在地取得'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors"
          >
            🔄 更新
          </button>
        </div>
      </div>

      {/* フィルターコンテンツ */}
      <div className={contentClasses}>
        {/* 基本フィルター */}
        <FilterSection
          title="基本フィルター"
          icon="🔧"
          isOpen={openSections.basic}
          onToggle={() => toggleSection('basic')}
          isMobile={isMobile}
        >
          {/* カテゴリー・価格帯 */}
          <div className="grid grid-cols-1 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">カテゴリー</label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value as FilterState['category'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                {Object.entries(CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">価格帯</label>
              <select
                value={filters.priceRange}
                onChange={(e) => updateFilter('priceRange', e.target.value as FilterState['priceRange'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                {Object.entries(PRICE_RANGES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* クイックフィルター */}
          <div className="flex flex-wrap gap-2">
            <QuickFilterTag
              label="🕐 現在営業中"
              active={filters.isOpenNow}
              onClick={() => toggleQuickFilter('open')}
            />
            <QuickFilterTag
              label="📶 Wi-Fi"
              active={filters.features.includes('wifi')}
              onClick={() => toggleQuickFilter('wifi')}
            />
            <QuickFilterTag
              label="🔌 電源"
              active={filters.features.includes('power')}
              onClick={() => toggleQuickFilter('power')}
            />
            <QuickFilterTag
              label="❤️ お気に入り"
              active={filters.showFavoritesOnly}
              onClick={() => toggleQuickFilter('favorites')}
            />
          </div>
        </FilterSection>

        {/* 詳細フィルター */}
        <FilterSection
          title="詳細フィルター"
          icon="🔍"
          isOpen={openSections.advanced}
          onToggle={() => toggleSection('advanced')}
          isMobile={isMobile}
        >
          {/* 評価フィルター */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              最小評価: {filters.minRating > 0 ? `${filters.minRating}⭐以上` : '指定なし'}
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={filters.minRating}
              onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>指定なし</span>
              <span>⭐⭐⭐⭐⭐</span>
            </div>
          </div>

          {/* その他フィルター */}
          <div className="space-y-2">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={filters.hasReviews}
                onChange={(e) => updateFilter('hasReviews', e.target.checked)}
                className="mr-2"
              />
              💬 レビューあり
            </label>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={filters.distance.enabled}
                onChange={(e) => updateFilter('distance', {
                  ...filters.distance,
                  enabled: e.target.checked
                })}
                className="mr-2"
                disabled={!hasLocation}
              />
              📍 距離で絞り込み {!hasLocation && '(位置情報が必要)'}
            </label>
            {filters.distance.enabled && hasLocation && (
              <div className="ml-6">
                <label className="block text-xs text-gray-600 mb-1">
                  {filters.distance.maxKm}km以内
                </label>
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
                  className="w-full"
                />
              </div>
            )}
          </div>
        </FilterSection>

        {/* ソート設定 */}
        <FilterSection
          title="並び順"
          icon="📊"
          isOpen={openSections.sort}
          onToggle={() => toggleSection('sort')}
          isMobile={isMobile}
        >
          <div className="space-y-3">
            <select
              value={sortState.option}
              onChange={(e) => setSortState(prev => ({ 
                ...prev, 
                option: e.target.value as SortState['option'] 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map(option => (
                <option 
                  key={option.value} 
                  value={option.value}
                  disabled={option.value === 'distance' && !hasLocation}
                >
                  {option.label}
                </option>
              ))}
            </select>
            
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={sortState.direction === 'desc'}
                onChange={(e) => setSortState(prev => ({
                  ...prev,
                  direction: e.target.checked ? 'desc' : 'asc'
                }))}
                className="mr-2"
              />
              逆順で表示
            </label>
          </div>
        </FilterSection>
      </div>

      {/* 統計・アクション */}
      <div className={isMobile ? "bg-white rounded-lg p-4" : "p-4 border-t border-gray-200 flex-shrink-0"}>
        <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
          <span>
            表示中: <strong className="text-blue-600">{filteredCount}件</strong>
            {filteredCount !== totalCount && (
              <span className="text-gray-500"> (全{totalCount}件中)</span>
            )}
          </span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {activeFilterCount}個のフィルター
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {hasLocation && (
              <span className="text-green-600">📍 現在地取得済み</span>
            )}
            {user && (
              <span className="text-purple-600">
                👤 {user.nickname || 'Coffee Lover'}
              </span>
            )}
          </div>
          
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              フィルタークリア
            </button>
          )}
        </div>
      </div>
    </div>
  )
}