// types/filters.ts

// リテラル型の定義
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