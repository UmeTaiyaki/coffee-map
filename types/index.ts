// types/index.ts - 統合版
// 基本型定義
export interface Shop {
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

export interface ShopImage {
  id: number
  shop_id: number
  image_url: string
  is_main: boolean
  uploaded_by?: string
  created_at: string
}

export interface ShopHours {
  id: number
  shop_id: number
  day_of_week: number
  open_time?: string
  close_time?: string
  is_closed: boolean
}

export interface ShopTag {
  id: number
  shop_id: number
  tag: string
}

export interface Review {
  id: number
  shop_id: number
  user_id?: string
  reviewer_name: string
  rating: number
  comment: string
  created_at: string
}

// Phase 3: 詳細レビューシステム
export interface DetailedReview extends Review {
  atmosphere_rating: number
  coffee_quality_rating: number
  service_rating: number
  value_rating: number
  visit_purpose: 'work' | 'date' | 'friends' | 'solo'
  images?: string[]
  visit_date?: string
  helpful_count?: number
  is_flagged?: boolean
}

export interface ShopWithDetails extends Shop {
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

// フィルター関連
export type FeatureType = 'wifi' | 'power'
export type PaymentMethodType = 'cash' | 'credit' | 'debit' | 'qr-code' | 'ic-card' | 'paypay' | 'line-pay'
export type CategoryType = 'cafe' | 'roastery' | 'chain' | 'specialty' | 'bakery'
export type PriceRangeType = '1' | '2' | '3' | '4' | 'all'

export interface FilterState {
  search: string
  category: CategoryType | 'all'
  priceRange: PriceRangeType
  features: FeatureType[]
  showFavoritesOnly: boolean
  isOpenNow: boolean
  openAt: {
    enabled: boolean
    day: number
    time: string
  }
  hasReviews: boolean
  minRating: number
  distance: {
    enabled: boolean
    maxKm: number
  }
  tags: string[]
  paymentMethods: PaymentMethodType[]
}

export type SortOption = 
  | 'distance'
  | 'rating'
  | 'review_count'
  | 'newest'
  | 'price_low'
  | 'price_high'
  | 'name'
  | 'random'

export interface SortState {
  option: SortOption
  direction: 'asc' | 'desc'
}

// 定数
export const CATEGORIES = {
  cafe: '☕ カフェ',
  roastery: '🔥 焙煎所',
  chain: '🏪 チェーン店',
  specialty: '✨ スペシャルティ',
  bakery: '🥐 ベーカリーカフェ'
} as const

export const PRICE_RANGES = {
  1: '¥',
  2: '¥¥',
  3: '¥¥¥',
  4: '¥¥¥¥'
} as const

export const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'] as const

export const VISIT_PURPOSES = {
  work: '仕事・作業',
  date: 'デート',
  friends: '友人と',
  solo: 'ひとりで'
} as const

export const RATING_CATEGORIES = {
  atmosphere: '雰囲気',
  coffee_quality: 'コーヒーの質',
  service: 'サービス',
  value: 'コスパ'
} as const

// デフォルト値
export const defaultFilters: FilterState = {
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

export const defaultSort: SortState = {
  option: 'distance',
  direction: 'asc'
}