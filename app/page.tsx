'use client'
import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from '../contexts/ThemeContext'
import EnhancedHeader from '../components/EnhancedHeader'
import EnhancedSearchFilter from '../components/EnhancedSearchFilter'
import EnhancedShopCard from '../components/EnhancedShopCard'
import ToastNotification, { showToast } from '../components/ToastNotification'
import { supabase } from '../lib/supabase'
import type { ShopWithDetails } from '../types/shop'
import type { FilterState, SortOption } from '../types/filters'
import { sortShops } from '../utils/sorting'

// 動的インポート
const AddShopModal = dynamic(() => import('../components/AddShopModal'), {
  ssr: false,
  loading: () => null
})

const Map = dynamic(() => import('../components/EnhancedMap'), {
  ssr: false,
  loading: () => <MapSkeleton />
})

// スケルトンコンポーネント
function MapSkeleton() {
  return (
    <div className="h-[500px] glass rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-float">🗺️</div>
        <div className="text-xl font-medium text-gray-600 dark:text-gray-400">
          インタラクティブコーヒーマップ
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          マーカーをクリックして店舗詳細を確認
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass rounded-xl p-6 animate-pulse">
          <div className="flex gap-4">
            <div className="w-24 h-24 bg-gray-300 dark:bg-gray-700 rounded-xl" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3" />
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// デフォルトフィルター
const defaultFilters: FilterState = {
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

// メインコンポーネント（ThemeProviderの内側で使用される）
function HomeContent() {
  const { density } = useTheme()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showAddShopModal, setShowAddShopModal] = useState(false)
  const [shops, setShops] = useState<ShopWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [sortOption, setSortOption] = useState<SortOption>('distance')
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

  // 店舗データ取得
  const fetchShops = useCallback(async () => {
    setLoading(true)
    try {
      const { data: shopsData, error } = await supabase
        .from('shops')
        .select(`
          *,
          shop_images!shop_images_shop_id_fkey(*),
          shop_hours!shop_hours_shop_id_fkey(*),
          shop_tags!shop_tags_shop_id_fkey(*),
          reviews!reviews_shop_id_fkey(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // お気に入り情報を追加
      const shopsWithDetails: ShopWithDetails[] = (shopsData || []).map(shop => ({
        ...shop,
        images: shop.shop_images || [],
        hours: shop.shop_hours || [],
        tags: shop.shop_tags || [],
        reviews: shop.reviews || [],
        isFavorite: favorites.has(shop.id),
        distance: currentLocation ? calculateDistance(
          currentLocation[0], currentLocation[1],
          shop.latitude, shop.longitude
        ) : undefined
      }))

      setShops(shopsWithDetails)
    } catch (error) {
      console.error('店舗データ取得エラー:', error)
      showToast('店舗データの取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }, [favorites, currentLocation])

  // 距離計算
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // フィルタリング
  const filteredShops = useMemo(() => {
    let result = shops.filter(shop => {
      // 検索
      if (filters.search && !(
        shop.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        shop.address.toLowerCase().includes(filters.search.toLowerCase()) ||
        shop.description?.toLowerCase().includes(filters.search.toLowerCase())
      )) return false

      // カテゴリー
      if (filters.category !== 'all' && shop.category !== filters.category) return false

      // 価格帯
      if (filters.priceRange !== 'all' && shop.price_range.toString() !== filters.priceRange) return false

      // 設備
      if (filters.features.includes('wifi') && !shop.has_wifi) return false
      if (filters.features.includes('power') && !shop.has_power) return false

      // お気に入り
      if (filters.showFavoritesOnly && !shop.isFavorite) return false

      // 営業中
      if (filters.isOpenNow) {
        const now = new Date()
        const currentDay = now.getDay()
        const currentTime = now.toTimeString().slice(0, 5)
        const todayHours = shop.hours?.find(h => h.day_of_week === currentDay)
        
        if (!todayHours || todayHours.is_closed) return false
        if (!todayHours.open_time || !todayHours.close_time) return false
        if (currentTime < todayHours.open_time || currentTime > todayHours.close_time) return false
      }

      // レビュー
      if (filters.hasReviews && (!shop.reviews || shop.reviews.length === 0)) return false

      // 評価
      if (filters.minRating > 0 && shop.reviews && shop.reviews.length > 0) {
        const avgRating = shop.reviews.reduce((sum, r) => sum + r.rating, 0) / shop.reviews.length
        if (avgRating < filters.minRating) return false
      }

      // 距離
      if (filters.distance.enabled && currentLocation && shop.distance) {
        if (shop.distance > filters.distance.maxKm) return false
      }

      // タグ
      if (filters.tags.length > 0) {
        const shopTags = shop.tags?.map(t => t.tag) || []
        if (!filters.tags.some(tag => shopTags.includes(tag))) return false
      }

      return true
    })

    // ソート
    return sortShops(result, { option: sortOption, direction: 'asc' }, currentLocation || undefined)
  }, [shops, filters, sortOption, currentLocation])

  // 統計情報
  const stats = useMemo(() => {
    const openCount = filteredShops.filter(shop => {
      const now = new Date()
      const currentDay = now.getDay()
      const currentTime = now.toTimeString().slice(0, 5)
      const todayHours = shop.hours?.find(h => h.day_of_week === currentDay)
      
      if (!todayHours || todayHours.is_closed) return false
      if (!todayHours.open_time || !todayHours.close_time) return false
      
      return currentTime >= todayHours.open_time && currentTime <= todayHours.close_time
    }).length

    const totalRating = filteredShops.reduce((sum, shop) => {
      if (shop.reviews && shop.reviews.length > 0) {
        return sum + shop.reviews.reduce((s, r) => s + r.rating, 0) / shop.reviews.length
      }
      return sum
    }, 0)

    const shopsWithReviews = filteredShops.filter(s => s.reviews && s.reviews.length > 0).length
    const averageRating = shopsWithReviews > 0 ? totalRating / shopsWithReviews : 0

    const favoriteCount = filteredShops.filter(s => s.isFavorite).length

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const newCount = filteredShops.filter(s => 
      s.created_at && new Date(s.created_at) > oneWeekAgo
    ).length

    return {
      shopCount: filteredShops.length,
      openCount,
      averageRating,
      favoriteCount,
      newCount
    }
  }, [filteredShops])

  // お気に入り切り替え
  const toggleFavorite = useCallback((shopId: number) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(shopId)) {
        newFavorites.delete(shopId)
        showToast('お気に入りから削除しました', 'info')
      } else {
        newFavorites.add(shopId)
        showToast('お気に入りに追加しました', 'success')
      }
      return newFavorites
    })
  }, [])

  // 店舗詳細表示
  const showShopDetails = useCallback((shop: ShopWithDetails) => {
    // TODO: 詳細モーダル表示
    showToast(`${shop.name}の詳細を表示`, 'info')
  }, [])

  // レビュー表示
  const showReviews = useCallback((shop: ShopWithDetails) => {
    // TODO: レビューモーダル表示
    showToast(`${shop.name}のレビューを表示`, 'info')
  }, [])

  // ナビゲーション
  const navigateToShop = useCallback((shop: ShopWithDetails) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  // 現在地取得
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('位置情報がサポートされていません', 'error')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setCurrentLocation([latitude, longitude])
        showToast('現在地を取得しました', 'success')
      },
      (error) => {
        console.error('位置情報取得エラー:', error)
        showToast('位置情報の取得に失敗しました', 'error')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }, [])

  // 初期化
  useEffect(() => {
    fetchShops()
    getCurrentLocation()
  }, [fetchShops, getCurrentLocation, refreshTrigger])

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <EnhancedHeader onAddShop={() => setShowAddShopModal(true)} />

      {/* 検索・フィルター */}
      <EnhancedSearchFilter
        filters={filters}
        sortOption={sortOption}
        {...stats}
        onFiltersChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
        onSortChange={setSortOption}
        onGetCurrentLocation={getCurrentLocation}
        hasLocation={!!currentLocation}
      />

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ビューモード切り替え */}
        <div className="flex justify-center mb-6">
          <div className="glass-sm rounded-lg overflow-hidden inline-flex">
            <button
              onClick={() => setViewMode('map')}
              className={`px-6 py-3 text-sm font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              🗺️ 地図表示
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-6 py-3 text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              📋 リスト表示
            </button>
          </div>
        </div>

        {/* コンテンツ表示 */}
        {viewMode === 'map' ? (
          <Suspense fallback={<MapSkeleton />}>
            <Map refreshTrigger={refreshTrigger} />
          </Suspense>
        ) : (
          <div className={`grid gap-4 ${
            density === 'compact' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {loading ? (
              <LoadingSkeleton />
            ) : filteredShops.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center col-span-full">
                <div className="text-5xl mb-4">☕</div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  該当する店舗が見つかりません
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  フィルター条件を変更してみてください
                </p>
                <button
                  onClick={() => setFilters(defaultFilters)}
                  className="btn-glass bg-orange-500 text-white hover:bg-orange-600"
                >
                  フィルターをリセット
                </button>
              </div>
            ) : (
              filteredShops.map((shop, index) => (
                <div 
                  key={shop.id}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <EnhancedShopCard
                    shop={shop}
                    onToggleFavorite={toggleFavorite}
                    onShowDetails={showShopDetails}
                    onShowReviews={showReviews}
                    onNavigate={navigateToShop}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 店舗追加モーダル */}
      <AddShopModal
        isOpen={showAddShopModal}
        onClose={() => setShowAddShopModal(false)}
        onShopAdded={() => {
          setRefreshTrigger(prev => prev + 1)
          setShowAddShopModal(false)
        }}
      />

      {/* トースト通知 */}
      <ToastNotification />
    </div>
  )
}

// エラーバウンダリコンポーネント
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">エラーが発生しました</h2>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// デフォルトエクスポート（ThemeProviderでラップされる前）
export default function Home() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  )
}