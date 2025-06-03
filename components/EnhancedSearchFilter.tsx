'use client'
import React, { useState, useCallback } from 'react'
import type { FilterState, SortOption } from '../types/filters'
import { showToast } from './ToastNotification'

interface EnhancedSearchFilterProps {
  filters: FilterState
  sortOption: SortOption
  shopCount: number
  openCount: number
  averageRating: number
  favoriteCount: number
  newCount: number
  onFiltersChange: (filters: Partial<FilterState>) => void
  onSortChange: (sort: SortOption) => void
}

export default function EnhancedSearchFilter({
  filters,
  sortOption,
  shopCount,
  openCount,
  averageRating,
  favoriteCount,
  newCount,
  onFiltersChange,
  onSortChange
}: EnhancedSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search)
  const [quickFilters, setQuickFilters] = useState({
    nearMe: false,
    wifi: filters.features.includes('wifi'),
    power: filters.features.includes('power'),
    openNow: filters.isOpenNow,
    highRating: filters.minRating >= 4,
    reading: false,
    work: false,
    noSmoking: false,
    parking: false,
    nightOpen: false
  })

  // 検索実行
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    onFiltersChange({ search: query })
  }, [onFiltersChange])

  // クイックフィルター切り替え
  const toggleQuickFilter = (filterName: keyof typeof quickFilters) => {
    const newState = { ...quickFilters, [filterName]: !quickFilters[filterName] }
    setQuickFilters(newState)

    // フィルター更新ロジック
    switch (filterName) {
      case 'wifi':
        onFiltersChange({
          features: newState.wifi 
            ? [...filters.features.filter(f => f !== 'wifi'), 'wifi']
            : filters.features.filter(f => f !== 'wifi')
        })
        break
      case 'power':
        onFiltersChange({
          features: newState.power 
            ? [...filters.features.filter(f => f !== 'power'), 'power']
            : filters.features.filter(f => f !== 'power')
        })
        break
      case 'openNow':
        onFiltersChange({ isOpenNow: newState.openNow })
        break
      case 'highRating':
        onFiltersChange({ minRating: newState.highRating ? 4 : 0 })
        break
      case 'nearMe':
        if (newState.nearMe) {
          onFiltersChange({ distance: { enabled: true, maxKm: 1 } })
        } else {
          onFiltersChange({ distance: { enabled: false, maxKm: 5 } })
        }
        break
      default:
        // タグベースのフィルター
        const tagMap = {
          reading: '読書歓迎',
          work: 'PC作業可',
          noSmoking: '完全禁煙',
          parking: '駐車場あり',
          nightOpen: '夜営業'
        }
        const tag = tagMap[filterName as keyof typeof tagMap]
        if (tag) {
          onFiltersChange({
            tags: newState[filterName]
              ? [...filters.tags, tag]
              : filters.tags.filter(t => t !== tag)
          })
        }
    }

    showToast(`${filterName}フィルターを${newState[filterName] ? '有効' : '無効'}にしました`, 'info')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div className="glass rounded-2xl p-6 space-y-4">
        {/* 検索バー */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl text-orange-500">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="店舗名・住所・こだわり・雰囲気で検索..."
            className="w-full pl-12 pr-4 py-4 glass-sm rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          />
        </div>

        {/* フィルターグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* カテゴリー */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <span>📂</span> カテゴリー
            </label>
            <select
              value={filters.category}
              onChange={(e) => onFiltersChange({ category: e.target.value as FilterState['category'] })}
              className="w-full glass-sm rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">すべてのカテゴリー</option>
              <option value="cafe">☕ カフェ</option>
              <option value="roastery">🔥 自家焙煎</option>
              <option value="chain">🏪 チェーン店</option>
              <option value="specialty">✨ スペシャルティ</option>
              <option value="bakery">🥐 ベーカリーカフェ</option>
            </select>
          </div>

          {/* 価格帯 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <span>💰</span> 価格帯
            </label>
            <select
              value={filters.priceRange}
              onChange={(e) => onFiltersChange({ priceRange: e.target.value as FilterState['priceRange'] })}
              className="w-full glass-sm rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">すべての価格帯</option>
              <option value="1">¥ (～500円)</option>
              <option value="2">¥¥ (500～1000円)</option>
              <option value="3">¥¥¥ (1000～2000円)</option>
              <option value="4">¥¥¥¥ (2000円～)</option>
            </select>
          </div>

          {/* 距離 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <span>📍</span> 距離
            </label>
            <select
              value={filters.distance.enabled ? filters.distance.maxKm : 'all'}
              onChange={(e) => {
                const value = e.target.value
                if (value === 'all') {
                  onFiltersChange({ distance: { enabled: false, maxKm: 5 } })
                } else {
                  onFiltersChange({ distance: { enabled: true, maxKm: parseInt(value) } })
                }
              }}
              className="w-full glass-sm rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">距離指定なし</option>
              <option value="1">1km以内</option>
              <option value="2">2km以内</option>
              <option value="3">3km以内</option>
              <option value="5">5km以内</option>
            </select>
          </div>

          {/* 並び順 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <span>📊</span> 並び順
            </label>
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full glass-sm rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="distance">📍 近い順</option>
              <option value="rating">⭐ 評価順</option>
              <option value="review_count">💬 レビュー数順</option>
              <option value="newest">🆕 新着順</option>
              <option value="price_low">💰 価格安順</option>
              <option value="random">🎲 ランダム</option>
            </select>
          </div>
        </div>

        {/* クイックフィルター */}
        <div className="flex flex-wrap gap-2">
          {Object.entries({
            nearMe: { label: '📍 現在地周辺', icon: '' },
            wifi: { label: '📶 Wi-Fi完備', icon: '' },
            power: { label: '🔌 電源あり', icon: '' },
            openNow: { label: '🕐 営業中', icon: '' },
            highRating: { label: '⭐ 高評価', icon: '' },
            reading: { label: '📚 読書向け', icon: '' },
            work: { label: '💻 PC作業可', icon: '' },
            noSmoking: { label: '🚭 完全禁煙', icon: '' },
            parking: { label: '🅿️ 駐車場あり', icon: '' },
            nightOpen: { label: '🌙 夜も営業', icon: '' }
          }).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => toggleQuickFilter(key as keyof typeof quickFilters)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all hover-lift ${
                quickFilters[key as keyof typeof quickFilters]
                  ? 'bg-orange-500 text-white shadow-glow'
                  : 'glass-sm text-gray-700 dark:text-gray-300 hover:bg-orange-500/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 統計ダッシュボード */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="glass-sm rounded-lg p-4 text-center hover-lift cursor-pointer">
            <div className="text-2xl font-bold text-orange-600">{shopCount}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">該当店舗</div>
          </div>
          <div className="glass-sm rounded-lg p-4 text-center hover-lift cursor-pointer">
            <div className="text-2xl font-bold text-green-600">{openCount}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">営業中</div>
          </div>
          <div className="glass-sm rounded-lg p-4 text-center hover-lift cursor-pointer">
            <div className="text-2xl font-bold text-yellow-600">{averageRating.toFixed(1)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">平均評価</div>
          </div>
          <div className="glass-sm rounded-lg p-4 text-center hover-lift cursor-pointer">
            <div className="text-2xl font-bold text-red-600">{favoriteCount}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">お気に入り</div>
          </div>
          <div className="glass-sm rounded-lg p-4 text-center hover-lift cursor-pointer">
            <div className="text-2xl font-bold text-blue-600">{newCount}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">新着</div>
          </div>
        </div>
      </div>
    </div>
  )
}