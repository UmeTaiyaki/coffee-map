// types/shop.ts
export interface Shop {
  id: number
  name: string
  address: string
  description?: string
  latitude: number
  longitude: number
  created_at?: string
  
  // Phase1で追加される新しいフィールド
  phone?: string
  website?: string
  has_wifi?: boolean
  has_power?: boolean
  category: 'cafe' | 'roastery' | 'chain' | 'specialty' | 'bakery'
  price_range: 1 | 2 | 3 | 4 // ¥ ¥¥ ¥¥¥ ¥¥¥¥
  main_image_url?: string
  payment_methods?: string[]
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
  day_of_week: number // 0=日曜, 1=月曜...6=土曜
  open_time?: string // "09:00"
  close_time?: string // "18:00"
  is_closed: boolean
}

export interface ShopTag {
  id: number
  shop_id: number
  tag: string
}

export interface ShopWithDetails extends Shop {
  images?: ShopImage[]
  hours?: ShopHours[]
  tags?: ShopTag[]
  distance?: number
  isFavorite?: boolean
}

// 営業時間の表示用
export interface DisplayHours {
  [key: string]: {
    open?: string
    close?: string
    closed: boolean
  }
}

// よく使われるタグの定数
export const COMMON_TAGS = [
  'wifi', 'quiet', 'meeting', 'takeout', 'outdoor', 
  'study', 'laptop', 'parking', 'pet-friendly', 'late-night',
  'breakfast', 'lunch', 'dessert', 'specialty-coffee', 'tea'
] as const

export const CATEGORIES = {
  cafe: '☕ カフェ',
  roastery: '🔥 焙煎所',
  chain: '🏪 チェーン店',
  specialty: '✨ スペシャルティ',
  bakery: '🥐 ベーカリーカフェ'
} as const

export const PRICE_RANGES = {
  1: '¥ (～500円)',
  2: '¥¥ (500～1000円)',
  3: '¥¥¥ (1000～2000円)',
  4: '¥¥¥¥ (2000円～)'
} as const

export const PAYMENT_METHODS = [
  'cash', 'credit', 'debit', 'qr-code', 'ic-card', 'paypay', 'line-pay'
] as const

export const DAY_NAMES = [
  '日', '月', '火', '水', '木', '金', '土'
] as const