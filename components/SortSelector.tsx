// components/SortSelector.tsx
'use client'
import React from 'react'
import type { SortState, SortOption } from '../types/filters'

interface SortSelectorProps {
  sortState: SortState
  onSortChange: (sortState: SortState) => void
  hasLocation: boolean
  className?: string
}

// SORT_OPTIONSを内部で定義
const SORT_OPTIONS = [
  { 
    value: 'rating' as SortOption, 
    label: '評価順', 
    icon: '⭐', 
    description: '評価の高い順',
    requiresLocation: false
  },
  { 
    value: 'distance' as SortOption, 
    label: '距離順', 
    icon: '📍', 
    description: '現在地から近い順',
    requiresLocation: true
  },
  { 
    value: 'review_count' as SortOption, 
    label: 'レビュー数順', 
    icon: '💬', 
    description: 'レビューが多い順',
    requiresLocation: false
  },
  { 
    value: 'newest' as SortOption, 
    label: '新着順', 
    icon: '🆕', 
    description: '新しく登録された順',
    requiresLocation: false
  },
  { 
    value: 'price_low' as SortOption, 
    label: '価格安順', 
    icon: '💰', 
    description: '価格帯が安い順',
    requiresLocation: false
  },
  { 
    value: 'price_high' as SortOption, 
    label: '価格高順', 
    icon: '💎', 
    description: '価格帯が高い順',
    requiresLocation: false
  },
  { 
    value: 'name' as SortOption, 
    label: '名前順', 
    icon: '🔤', 
    description: '店舗名のあいうえお順',
    requiresLocation: false
  },
  { 
    value: 'random' as SortOption, 
    label: 'ランダム', 
    icon: '🎲', 
    description: 'ランダムな順番',
    requiresLocation: false
  }
]

export default function SortSelector({
  sortState,
  onSortChange,
  hasLocation,
  className = ''
}: SortSelectorProps) {
  const availableOptions = SORT_OPTIONS.filter(option => 
    !option.requiresLocation || hasLocation
  )

  const currentOption = availableOptions.find(opt => opt.value === sortState.option)

  return (
    <div className={`bg-white rounded-lg border p-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        {/* ソート選択 */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            並び順:
          </span>
          <select
            value={sortState.option}
            onChange={(e) => onSortChange({
              ...sortState,
              option: e.target.value as SortOption
            })}
            className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {availableOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 昇順/降順切り替え */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSortChange({
              ...sortState,
              direction: sortState.direction === 'asc' ? 'desc' : 'asc'
            })}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            title={`${sortState.direction === 'asc' ? '昇順' : '降順'}で表示中 (クリックで切り替え)`}
          >
            <span className="text-lg">
              {sortState.direction === 'asc' ? '⬆️' : '⬇️'}
            </span>
          </button>
        </div>
      </div>

      {/* 現在のソート状態の説明 */}
      {currentOption && (
        <div className="mt-2 text-xs text-gray-500">
          {currentOption.icon} {currentOption.description}
          {sortState.direction === 'desc' && 
           !['rating', 'review_count', 'newest', 'price_high', 'random', 'name'].includes(sortState.option) && 
           ' (逆順)'}
        </div>
      )}
    </div>
  )
}