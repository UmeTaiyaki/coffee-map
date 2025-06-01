// utils/sorting.ts - ソート処理関数

// 型定義のインポート
export type SortOption = 
  | 'distance'    // 距離順
  | 'rating'      // 評価順
  | 'review_count' // レビュー数順
  | 'newest'      // 新着順
  | 'price_low'   // 価格安順
  | 'price_high'  // 価格高順
  | 'name'        // 名前順
  | 'random'      // ランダム

export interface SortState {
  option: SortOption
  direction: 'asc' | 'desc'
}

// 店舗の詳細型定義
interface Review {
  id: number
  shop_id: number
  user_id?: string
  reviewer_name: string
  rating: number
  comment: string
  created_at: string
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

export interface ShopWithDetails extends Shop {
  images?: ShopImage[]
  hours?: ShopHours[]
  tags?: ShopTag[]
  reviews?: Review[]
  distance?: number
  isFavorite?: boolean
}

// 平均評価を計算
function calculateAverageRating(reviews: Review[]): number {
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

// メインのソート処理関数
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
      !['random', 'name', 'rating', 'review_count', 'newest', 'price_high'].includes(sortState.option)) {
    return sorted.reverse()
  }

  return sorted
}

// ソート状態の説明文を生成
export function getSortDescription(
  sortState: SortState, 
  hasLocation: boolean
): string {
  const sortOptions: Record<SortOption, string> = {
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
      !['rating', 'review_count', 'newest', 'price_high', 'random', 'name'].includes(sortState.option)) {
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

// ソートオプションの設定定数
export const SORT_OPTIONS = [
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

// デフォルトのソート状態
export const defaultSort: SortState = {
  option: 'distance',
  direction: 'asc'
}

// ソート状態をローカルストレージに保存
export function saveSortState(sortState: SortState): void {
  try {
    localStorage.setItem('coffee-map-sort-state', JSON.stringify(sortState))
  } catch (error) {
    console.error('ソート状態の保存に失敗しました:', error)
  }
}

// ソート状態をローカルストレージから読み込み
export function loadSortState(): SortState {
  try {
    const saved = localStorage.getItem('coffee-map-sort-state')
    if (saved) {
      const parsed = JSON.parse(saved) as SortState
      // バリデーション
      if (SORT_OPTIONS.some(opt => opt.value === parsed.option) &&
          ['asc', 'desc'].includes(parsed.direction)) {
        return parsed
      }
    }
  } catch (error) {
    console.error('ソート状態の読み込みに失敗しました:', error)
  }
  return defaultSort
}

// 店舗の統計情報を計算
export function calculateShopStats(shops: ShopWithDetails[]) {
  const totalShops = shops.length
  const shopsWithReviews = shops.filter(shop => shop.reviews && shop.reviews.length > 0).length
  const totalReviews = shops.reduce((sum, shop) => sum + (shop.reviews?.length || 0), 0)
  const averageRating = shops
    .filter(shop => shop.reviews && shop.reviews.length > 0)
    .reduce((sum, shop) => sum + calculateAverageRating(shop.reviews || []), 0) / 
    (shopsWithReviews || 1)

  const categoryStats = shops.reduce((stats, shop) => {
    stats[shop.category] = (stats[shop.category] || 0) + 1
    return stats
  }, {} as Record<string, number>)

  const priceRangeStats = shops.reduce((stats, shop) => {
    stats[shop.price_range] = (stats[shop.price_range] || 0) + 1
    return stats
  }, {} as Record<number, number>)

  return {
    totalShops,
    shopsWithReviews,
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
    categoryStats,
    priceRangeStats
  }
}