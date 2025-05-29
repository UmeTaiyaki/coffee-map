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

export default function SortSelector({
  sortState,
  onSortChange,
  hasLocation,
  className = ''
}: SortSelectorProps) {
  const sortOptions: Array<{
    value: SortOption
    label: string
    icon: string
    available: boolean
    description: string
  }> = [
    { 
      value: 'rating', 
      label: '評価順', 
      icon: '⭐', 
      available: true,
      description: '評価の高い順'
    },
    { 
      value: 'distance', 
      label: '距離順', 
      icon: '📍', 
      available: hasLocation,
      description: '現在地から近い順'
    },
    { 
      value: 'review_count', 
      label: 'レビュー数順', 
      icon: '💬', 
      available: true,
      description: 'レビューが多い順'
    },
    { 
      value: 'newest', 
      label: '新着順', 
      icon: '🆕', 
      available: true,
      description: '新しく登録された順'
    },
    { 
      value: 'price_low', 
      label: '価格安順', 
      icon: '💰', 
      available: true,
      description: '価格帯が安い順'
    },
    { 
      value: 'price_high', 
      label: '価格高順', 
      icon: '💎', 
      available: true,
      description: '価格帯が高い順'
    },
    { 
      value: 'name', 
      label: '名前順', 
      icon: '🔤', 
      available: true,
      description: '店舗名のあいうえお順'
    },
    { 
      value: 'random', 
      label: 'ランダム', 
      icon: '🎲', 
      available: true,
      description: 'ランダムな順番'
    }
  ]

  const currentOption = sortOptions.find(opt => opt.value === sortState.option)

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
            {sortOptions
              .filter(option => option.available)
              .map(option => (
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
          {sortState.direction === 'desc' && sortState.option !== 'rating' && ' (逆順)'}
        </div>
      )}
    </div>
  )
}

// utils/sorting.ts - ソート処理関数
import type { ShopWithDetails } from '../types/shop'
import type { SortState } from '../types/filters'

// 平均評価を計算
function calculateAverageRating(reviews: any[]): number {
  if (!reviews || reviews.length === 0) return 0
  const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0)
  return sum / reviews.length
}

// ランダムソート用のシード（ページ読み込み時に固定）
let randomSeed = Date.now()

// ランダム関数（シード値を使用して一定時間同じ順序を保つ）
function seededRandom(seed: number): number {
  seed = (seed * 9301 + 49297) % 233280
  return seed / 233280
}

export function sortShops(
  shops: ShopWithDetails[], 
  sortState: SortState,
  currentLocation?: [number, number]
): ShopWithDetails[] {
  if (shops.length === 0) return shops

  const sorted = [...shops].sort((a, b) => {
    let comparison = 0

    switch (sortState.option) {
      case 'rating':
        const aRating = calculateAverageRating(a.reviews || [])
        const bRating = calculateAverageRating(b.reviews || [])
        comparison = bRating - aRating // 高評価が先
        // 評価が同じ場合はレビュー数で比較
        if (comparison === 0) {
          comparison = (b.reviews?.length || 0) - (a.reviews?.length || 0)
        }
        break

      case 'review_count':
        comparison = (b.reviews?.length || 0) - (a.reviews?.length || 0)
        // レビュー数が同じ場合は評価で比較
        if (comparison === 0) {
          const aRating = calculateAverageRating(a.reviews || [])
          const bRating = calculateAverageRating(b.reviews || [])
          comparison = bRating - aRating
        }
        break

      case 'newest':
        const aDate = new Date(a.created_at || 0).getTime()
        const bDate = new Date(b.created_at || 0).getTime()
        comparison = bDate - aDate // 新しいものが先
        break

      case 'price_low':
        comparison = a.price_range - b.price_range
        break

      case 'price_high':
        comparison = b.price_range - a.price_range
        break

      case 'distance':
        if (!currentLocation) {
          comparison = 0
        } else {
          comparison = (a.distance || Infinity) - (b.distance || Infinity)
        }
        break

      case 'name':
        comparison = a.name.localeCompare(b.name, 'ja', { 
          numeric: true, 
          sensitivity: 'base' 
        })
        break

      case 'random':
        // シード値とID を使用してランダムだが一定の順序を生成
        const aHash = (a.id * randomSeed) % 1000000
        const bHash = (b.id * randomSeed) % 1000000
        comparison = aHash - bHash
        break

      default:
        comparison = 0
    }

    // 同じ値の場合は名前でソート（安定ソート）
    if (comparison === 0) {
      comparison = a.name.localeCompare(b.name, 'ja')
    }

    return comparison
  })

  // 降順の場合は逆転（ランダムとnameは除く）
  if (sortState.direction === 'desc' && 
      !['random', 'name'].includes(sortState.option)) {
    return sorted.reverse()
  }

  return sorted
}

// ソート状態の説明文を生成
export function getSortDescription(
  sortState: SortState, 
  hasLocation: boolean
): string {
  const sortOptions = {
    rating: '評価の高い順',
    distance: hasLocation ? '現在地から近い順' : '距離順（位置情報が必要）',
    review_count: 'レビュー数の多い順',
    newest: '新しく登録された順',
    price_low: '価格帯の安い順',
    price_high: '価格帯の高い順',
    name: '店舗名のあいうえお順',
    random: 'ランダムな順番'
  }

  let description = sortOptions[sortState.option] || 'デフォルト順'
  
  if (sortState.direction === 'desc' && 
      !['rating', 'review_count', 'newest', 'price_high', 'random'].includes(sortState.option)) {
    description += ' (逆順)'
  }

  return description
}

// ソートオプションが利用可能かチェック
export function isSortOptionAvailable(
  option: SortOption, 
  hasLocation: boolean
): boolean {
  if (option === 'distance') {
    return hasLocation
  }
  return true
}

// 新しいランダムシードを生成（ランダムソートをリセット）
export function resetRandomSort(): void {
  randomSeed = Date.now()
}