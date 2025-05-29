// types/filters.ts - フィルター・ソート型定義

// ソートオプション型
export type SortOption = 
  | 'distance'    // 距離順
  | 'rating'      // 評価順
  | 'review_count' // レビュー数順
  | 'newest'      // 新着順
  | 'price_low'   // 価格安順
  | 'price_high'  // 価格高順
  | 'name'        // 名前順
  | 'random'      // ランダム

// ソート状態
export interface SortState {
  option: SortOption
  direction: 'asc' | 'desc'
}

// フィルター状態
export interface FilterState {
  // 基本フィルター
  search: string
  category: string
  priceRange: string
  features: string[]
  showFavoritesOnly: boolean
  
  // 高度フィルター
  isOpenNow: boolean
  openAt: {
    enabled: boolean
    day: number // 0-6 (日-土)
    time: string // "HH:MM"
  }
  hasReviews: boolean
  minRating: number
  distance: {
    enabled: boolean
    maxKm: number
  }
  tags: string[]
  paymentMethods: string[]
}

// デフォルトフィルター状態
export const defaultFilters: FilterState = {
  search: '',
  category: 'all',
  priceRange: 'all',
  features: [],
  showFavoritesOnly: false,
  isOpenNow: false,
  openAt: {
    enabled: false,
    day: 0,
    time: '09:00'
  },
  hasReviews: false,
  minRating: 0,
  distance: {
    enabled: false,
    maxKm: 5
  },
  tags: [],
  paymentMethods: []
}

// デフォルトソート状態
export const defaultSort: SortState = {
  option: 'distance',
  direction: 'asc'
}

// 店舗カテゴリー
export const CATEGORIES = {
  cafe: '☕ カフェ',
  roastery: '🔥 焙煎所',
  chain: '🏪 チェーン店',
  specialty: '✨ スペシャルティ',
  bakery: '🥐 ベーカリーカフェ'
} as const

// 価格帯
export const PRICE_RANGES = {
  1: '¥',
  2: '¥¥',
  3: '¥¥¥',
  4: '¥¥¥¥'
} as const

// 曜日名
export const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'] as const

// よく使われるタグ
export const COMMON_TAGS = [
  'wifi', 'quiet', 'meeting', 'takeout', 'outdoor',
  'study', 'laptop', 'parking', 'pet-friendly', 'late-night',
  'breakfast', 'lunch', 'dessert', 'specialty-coffee', 'tea'
] as const

// 決済方法
export const PAYMENT_METHODS = [
  { value: 'cash', label: '💰 現金', icon: '💰' },
  { value: 'credit', label: '💳 クレジットカード', icon: '💳' },
  { value: 'debit', label: '💳 デビットカード', icon: '💳' },
  { value: 'qr-code', label: '📱 QRコード決済', icon: '📱' },
  { value: 'ic-card', label: '💳 ICカード', icon: '💳' },
  { value: 'paypay', label: '📱 PayPay', icon: '📱' },
  { value: 'line-pay', label: '📱 LINE Pay', icon: '📱' }
] as const

// ソートオプション設定
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
] as const

// フィルター関連のユーティリティ型
export type CategoryType = keyof typeof CATEGORIES
export type PriceRangeType = keyof typeof PRICE_RANGES
export type PaymentMethodType = typeof PAYMENT_METHODS[number]['value']
export type CommonTagType = typeof COMMON_TAGS[number]

// フィルター適用結果の型
export interface FilterResult {
  shops: any[] // 実際の店舗型に置き換え
  totalCount: number
  filteredCount: number
  activeFiltersCount: number
}

// 検索履歴の型
export interface SearchHistory {
  id: string
  query: string
  filters: Partial<FilterState>
  timestamp: number
  resultCount: number
}

// フィルター統計の型
export interface FilterStats {
  totalShops: number
  categories: Record<CategoryType, number>
  priceRanges: Record<PriceRangeType, number>
  features: Record<string, number>
  averageRating: number
  topTags: Array<{ tag: string; count: number }>
}