// types/shop.ts
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

// Phase 3: 詳細レビューシステム
export interface DetailedReview {
  id: number
  shop_id: number
  user_id?: string
  reviewer_name: string
  // 総合評価（従来のrating）
  rating: number
  // 詳細評価項目
  atmosphere_rating: number
  coffee_quality_rating: number
  service_rating: number
  value_rating: number
  // 訪問目的
  visit_purpose: 'work' | 'date' | 'friends' | 'solo'
  // レビュー本文
  comment: string
  // レビュー画像
  images?: string[]
  // 訪問日
  visit_date?: string
  created_at: string
  updated_at?: string
  // いいね数
  helpful_count?: number
  // 不適切フラグ
  is_flagged?: boolean
}

// 古いReview型（互換性のため）
export interface Review {
  id: number
  shop_id: number
  user_id?: string
  reviewer_name: string
  rating: number
  comment: string
  created_at: string
}

export interface ShopWithDetails extends Shop {
  images?: ShopImage[]
  hours?: ShopHours[]
  tags?: ShopTag[]
  reviews?: Review[]
  distance?: number
  isFavorite?: boolean
  // 平均評価
  average_ratings?: {
    overall: number
    atmosphere: number
    coffee_quality: number
    service: number
    value: number
  }
  review_count?: number
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