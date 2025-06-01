// types/index.ts
export * from './filters'
export * from './shop'

// Shop関連の型定義
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

export interface ShopWithDetails extends Shop {
  images?: ShopImage[]
  hours?: ShopHours[]
  tags?: ShopTag[]
  reviews?: Review[]
  distance?: number
  isFavorite?: boolean
}