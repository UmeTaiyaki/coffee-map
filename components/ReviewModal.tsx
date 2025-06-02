// components/ReviewModal.tsx - 完全版（サインインボタン削除）
import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import { showToast } from './ToastNotification'

// 型定義
interface Review {
  id: number
  shop_id: number
  user_id?: string
  reviewer_name: string
  rating: number
  comment: string
  created_at: string
}

// Phase 3: 詳細レビュー型
interface DetailedReview extends Review {
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

interface ReviewModalProps {
  shopId: number
  shopName: string
  isOpen: boolean
  onClose: () => void
  onReviewAdded?: () => void
}

// 定数
const VISIT_PURPOSES = {
  work: '仕事・作業',
  date: 'デート',
  friends: '友人と',
  solo: 'ひとりで'
} as const

const RATING_CATEGORIES = {
  atmosphere: '雰囲気',
  coffee_quality: 'コーヒーの質',
  service: 'サービス',
  value: 'コスパ'
} as const

// 評価星コンポーネント
const RatingStars = ({ 
  rating, 
  onRatingChange,
  label,
  disabled = false,
  size = 'normal'
}: { 
  rating: number
  onRatingChange?: (rating: number) => void
  label?: string
  disabled?: boolean
  size?: 'small' | 'normal' | 'large'
}) => {
  const sizeClasses = {
    small: 'text-sm',
    normal: 'text-lg',
    large: 'text-2xl'
  }

  return (
    <div className={label ? "flex items-center justify-between" : "flex"}>
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange?.(star)}
            disabled={disabled}
            className={`${sizeClasses[size]} transition-colors ${
              star <= rating 
                ? 'text-yellow-400' 
                : 'text-gray-300'
            } ${!disabled && onRatingChange ? 'hover:text-yellow-400 cursor-pointer' : ''}`}
          >
            ⭐
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ReviewModal({
  shopId,
  shopName,
  isOpen,
  onClose,
  onReviewAdded
}: ReviewModalProps) {
  const { user } = useUser()

  // 状態管理
  const [reviews, setReviews] = useState<DetailedReview[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'reviews' | 'add'>('reviews')
  const [uploadProgress, setUploadProgress] = useState(0)

  // 基本レビューフォーム
  const [basicReview, setBasicReview] = useState({
    reviewer_name: '',
    rating: 5,
    comment: ''
  })

  // 詳細レビューフォーム（Phase 3）
  const [detailedReview, setDetailedReview] = useState({
    rating: 5,
    atmosphere_rating: 5,
    coffee_quality_rating: 5,
    service_rating: 5,
    value_rating: 5,
    visit_purpose: 'solo' as keyof typeof VISIT_PURPOSES,
    comment: '',
    visit_date: new Date().toISOString().split('T')[0]
  })

  const [reviewImages, setReviewImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [useDetailedReview, setUseDetailedReview] = useState(false)

  // レビュー取得
  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      // 基本レビューを取得（後で詳細レビューも統合）
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // DetailedReviewも試しに取得（存在する場合）
      const { data: detailedData } = await supabase
        .from('detailed_reviews')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })

      // 詳細レビューがある場合は基本レビューに変換して統合
      const allReviews = [
        ...(data || []),
        ...(detailedData || []).map(review => ({
          id: review.id,
          shop_id: review.shop_id,
          user_id: review.user_id,
          reviewer_name: review.reviewer_name,
          rating: review.rating,
          comment: review.comment,
          created_at: review.created_at,
          // 詳細情報も保持
          atmosphere_rating: review.atmosphere_rating,
          coffee_quality_rating: review.coffee_quality_rating,
          service_rating: review.service_rating,
          value_rating: review.value_rating,
          visit_purpose: review.visit_purpose,
          images: review.images,
          visit_date: review.visit_date,
          helpful_count: review.helpful_count,
          is_flagged: review.is_flagged
        }))
      ]

      setReviews(allReviews)
    } catch (error) {
      console.error('レビュー取得エラー:', error)
      showToast('レビューの取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }, [shopId])

  // 画像アップロード
  const uploadReviewImages = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${shopId}_${user?.id}_${Date.now()}_${i}.${fileExt}`
      const filePath = `reviews/${fileName}`

      const { error, data } = await supabase.storage
        .from('shop_images')
        .upload(filePath, file)

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('shop_images')
          .getPublicUrl(filePath)
        
        uploadedUrls.push(publicUrl)
        setUploadProgress(((i + 1) / files.length) * 100)
      }
    }

    return uploadedUrls
  }

  // 画像選択
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + reviewImages.length > 5) {
      showToast('画像は最大5枚まで選択できます', 'warning')
      return
    }

    setReviewImages([...reviewImages, ...files])
    
    // プレビュー生成
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviewUrls(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  // 画像削除
  const removeImage = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  // レビュー投稿フォーム表示
  const handleShowAddForm = () => {
    if (!user) {
      showToast('レビューの投稿にはサインインが必要です。右上のサインインボタンからログインしてください。', 'warning', 6000)
      return
    }

    // ユーザー情報から初期値を設定
    setBasicReview({
      reviewer_name: user.nickname || 'Coffee Lover',
      rating: 5,
      comment: ''
    })

    setShowAddForm(true)
    setActiveTab('add')
  }

  // 基本レビュー投稿
  const submitBasicReview = async () => {
    if (!user) {
      showToast('レビューの投稿にはサインインが必要です。右上のサインインボタンからログインしてください。', 'warning', 6000)
      return
    }

    if (!basicReview.reviewer_name.trim() || !basicReview.comment.trim()) {
      showToast('名前とコメントを入力してください', 'error')
      return
    }

    if (basicReview.comment.trim().length < 10) {
      showToast('コメントは10文字以上で入力してください', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const reviewData = {
        shop_id: shopId,
        user_id: user.id,
        reviewer_name: basicReview.reviewer_name.trim(),
        rating: basicReview.rating,
        comment: basicReview.comment.trim()
      }

      const { error } = await supabase
        .from('reviews')
        .insert([reviewData])

      if (error) throw error

      showToast('レビューを投稿しました！', 'success')
      await resetForm()
      await fetchReviews()
      onReviewAdded?.()

    } catch (error) {
      console.error('レビュー投稿エラー:', error)
      showToast('レビューの投稿に失敗しました', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 詳細レビュー投稿（Phase 3）
  const submitDetailedReview = async () => {
    if (!user) {
      showToast('レビューの投稿にはサインインが必要です。右上のサインインボタンからログインしてください。', 'warning', 6000)
      return
    }

    if (detailedReview.comment.length < 20) {
      showToast('詳細レビューは20文字以上で入力してください', 'error')
      return
    }

    setIsSubmitting(true)
    setUploadProgress(0)

    try {
      // 画像アップロード
      let imageUrls: string[] = []
      if (reviewImages.length > 0) {
        imageUrls = await uploadReviewImages(reviewImages)
      }

      // 詳細レビューデータ
      const reviewData = {
        shop_id: shopId,
        user_id: user.id,
        reviewer_name: user.nickname || 'Coffee Lover',
        ...detailedReview,
        images: imageUrls,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('detailed_reviews')
        .insert([reviewData])

      if (error) throw error

      showToast('詳細レビューを投稿しました！', 'success')
      await resetForm()
      await fetchReviews()
      onReviewAdded?.()

    } catch (error) {
      console.error('詳細レビュー投稿エラー:', error)
      showToast('詳細レビューの投稿に失敗しました', 'error')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  // フォームリセット
  const resetForm = async () => {
    setBasicReview({
      reviewer_name: user?.nickname || 'Coffee Lover',
      rating: 5,
      comment: ''
    })
    setDetailedReview({
      rating: 5,
      atmosphere_rating: 5,
      coffee_quality_rating: 5,
      service_rating: 5,
      value_rating: 5,
      visit_purpose: 'solo',
      comment: '',
      visit_date: new Date().toISOString().split('T')[0]
    })
    setReviewImages([])
    setImagePreviewUrls([])
    setShowAddForm(false)
    setActiveTab('reviews')
    setUseDetailedReview(false)
  }

  // 平均評価計算
  const calculateAverageRatings = useCallback(() => {
    if (reviews.length === 0) return null

    const basicReviews = reviews.filter(r => !r.atmosphere_rating)
    const detailedReviews = reviews.filter(r => r.atmosphere_rating)

    const overallSum = reviews.reduce((acc, review) => acc + review.rating, 0)
    const overall = (overallSum / reviews.length).toFixed(1)

    if (detailedReviews.length === 0) {
      return { overall, detailed: null }
    }

    const detailedSum = detailedReviews.reduce((acc, review) => ({
      atmosphere: acc.atmosphere + review.atmosphere_rating,
      coffee_quality: acc.coffee_quality + review.coffee_quality_rating,
      service: acc.service + review.service_rating,
      value: acc.value + review.value_rating
    }), { atmosphere: 0, coffee_quality: 0, service: 0, value: 0 })

    const count = detailedReviews.length
    return {
      overall,
      detailed: {
        atmosphere: (detailedSum.atmosphere / count).toFixed(1),
        coffee_quality: (detailedSum.coffee_quality / count).toFixed(1),
        service: (detailedSum.service / count).toFixed(1),
        value: (detailedSum.value / count).toFixed(1)
      }
    }
  }, [reviews])

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '今日'
    if (diffDays === 2) return '昨日'
    if (diffDays <= 7) return `${diffDays - 1}日前`
    
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // ユーザーのレビュー有無チェック
  const userHasReviewed = user && reviews.some(review => review.user_id === user.id)

  useEffect(() => {
    if (isOpen && shopId) {
      fetchReviews()
    }
  }, [isOpen, shopId, fetchReviews])

  if (!isOpen) return null

  const averageRatings = calculateAverageRatings()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                📝 {shopName} のレビュー
              </h2>
              {averageRatings && (
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <RatingStars rating={Math.round(parseFloat(averageRatings.overall))} size="small" />
                    <span className="font-semibold">{averageRatings.overall}</span>
                    <span className="text-gray-500">({reviews.length}件)</span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* タブナビゲーション */}
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'reviews'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              レビュー一覧
            </button>
            {user && !userHasReviewed && (
              <button
                onClick={() => {
                  setActiveTab('add')
                  setShowAddForm(true)
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'add'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                レビューを書く
              </button>
            )}
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'reviews' && (
            <div className="p-6">
              {/* 平均評価サマリー */}
              {averageRatings?.detailed && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-3">詳細評価サマリー</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(RATING_CATEGORIES).map(([key, label]) => (
                      <div key={key}>
                        <div className="text-sm text-gray-600">{label}</div>
                        <div className="flex items-center gap-1">
                          <RatingStars 
                            rating={Math.round(parseFloat(averageRatings.detailed![key as keyof typeof averageRatings.detailed]))} 
                            size="small" 
                          />
                          <span className="font-semibold text-sm">
                            {averageRatings.detailed[key as keyof typeof averageRatings.detailed]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* レビュー投稿ボタン - サインインボタンを削除 */}
              {!user ? (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-800 text-sm font-medium">レビューを投稿するにはサインインが必要です</p>
                      <p className="text-blue-600 text-xs mt-1">右上のサインインボタンからGoogleアカウントでサインインできます</p>
                    </div>
                  </div>
                </div>
              ) : userHasReviewed ? (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  ✅ このお店にレビュー投稿済みです
                </div>
              ) : (
                <div className="mb-6">
                  <button
                    onClick={handleShowAddForm}
                    className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📝 レビューを書く
                  </button>
                </div>
              )}

              {/* レビュー一覧 */}
              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <div className="text-sm text-gray-600">レビューを読み込み中...</div>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📝</div>
                    <div className="text-sm">まだレビューがありません</div>
                    <div className="text-xs">最初のレビューを投稿してみませんか？</div>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="border-b pb-6 last:border-b-0">
                      {/* レビューヘッダー */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold">{review.reviewer_name}</div>
                            {review.user_id === user?.id && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                                あなたの投稿
                              </span>
                            )}
                            {review.visit_purpose && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                                {VISIT_PURPOSES[review.visit_purpose]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>{formatDate(review.created_at)}</span>
                            {review.visit_date && (
                              <span>訪問: {new Date(review.visit_date).toLocaleDateString('ja-JP')}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <RatingStars rating={review.rating} size="small" />
                          <span className="font-semibold">{review.rating}</span>
                        </div>
                      </div>

                      {/* 詳細評価（ある場合） */}
                      {review.atmosphere_rating && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 rounded">
                          {Object.entries(RATING_CATEGORIES).map(([key, label]) => (
                            <div key={key} className="text-sm">
                              <span className="text-gray-600">{label}:</span>
                              <span className="ml-1 font-medium">
                                ⭐{review[`${key}_rating` as keyof DetailedReview]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* コメント */}
                      <p className="text-gray-700 whitespace-pre-wrap mb-3 leading-relaxed">{review.comment}</p>

                      {/* 画像 */}
                      {review.images && review.images.length > 0 && (
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                          {review.images.map((imageUrl, index) => (
                            <Image
                              key={index}
                              src={imageUrl}
                              alt={`レビュー画像 ${index + 1}`}
                              width={120}
                              height={120}
                              className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-90"
                              onClick={() => window.open(imageUrl, '_blank')}
                            />
                          ))}
                        </div>
                      )}

                      {/* アクション */}
                      <div className="flex items-center gap-4 text-sm">
                        <button className="text-gray-600 hover:text-blue-600 transition-colors">
                          👍 役に立った ({review.helpful_count || 0})
                        </button>
                        <button className="text-gray-600 hover:text-red-600 transition-colors">
                          🚩 報告
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'add' && showAddForm && user && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">レビューを投稿</h3>
              
              {/* レビュータイプ選択 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">レビュータイプを選択</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!useDetailedReview}
                      onChange={() => setUseDetailedReview(false)}
                      className="mr-2"
                    />
                    <span className="text-sm">基本レビュー（簡単）</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={useDetailedReview}
                      onChange={() => setUseDetailedReview(true)}
                      className="mr-2"
                    />
                    <span className="text-sm">詳細レビュー（写真・詳細評価付き）</span>
                  </label>
                </div>
              </div>

              {!useDetailedReview ? (
                /* 基本レビューフォーム */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      お名前 *
                    </label>
                    <input
                      type="text"
                      value={basicReview.reviewer_name}
                      onChange={(e) => setBasicReview({ ...basicReview, reviewer_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      評価 *
                    </label>
                    <RatingStars
                      rating={basicReview.rating}
                      onRatingChange={(rating) => setBasicReview({ ...basicReview, rating })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      コメント * (10文字以上)
                    </label>
                    <textarea
                      value={basicReview.comment}
                      onChange={(e) => setBasicReview({ ...basicReview, comment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      maxLength={500}
                      placeholder="このお店の感想を教えてください..."
                    />
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {basicReview.comment.length}/500文字
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={submitBasicReview}
                      disabled={isSubmitting || basicReview.comment.length < 10}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {isSubmitting ? '投稿中...' : '投稿する'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      disabled={isSubmitting}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                /* 詳細レビューフォーム */
                <div className="space-y-6">
                  {/* 訪問情報 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        訪問日
                      </label>
                      <input
                        type="date"
                        value={detailedReview.visit_date}
                        onChange={(e) => setDetailedReview({ ...detailedReview, visit_date: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        訪問目的
                      </label>
                      <select
                        value={detailedReview.visit_purpose}
                        onChange={(e) => setDetailedReview({ ...detailedReview, visit_purpose: e.target.value as keyof typeof VISIT_PURPOSES })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(VISIT_PURPOSES).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 詳細評価 */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">詳細評価</label>
                    <RatingStars
                      rating={detailedReview.rating}
                      onRatingChange={(rating) => setDetailedReview({ ...detailedReview, rating })}
                      label="総合評価"
                    />
                    {Object.entries(RATING_CATEGORIES).map(([key, label]) => (
                      <RatingStars
                        key={key}
                        rating={detailedReview[`${key}_rating` as keyof typeof detailedReview] as number}
                        onRatingChange={(rating) => setDetailedReview({ 
                          ...detailedReview, 
                          [`${key}_rating`]: rating 
                        })}
                        label={label}
                      />
                    ))}
                  </div>

                  {/* コメント */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      コメント * (20文字以上)
                    </label>
                    <textarea
                      value={detailedReview.comment}
                      onChange={(e) => setDetailedReview({ ...detailedReview, comment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      maxLength={1000}
                      placeholder="お店の雰囲気、コーヒーの味、サービスなどについて詳しく教えてください..."
                    />
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {detailedReview.comment.length}/1000文字
                    </div>
                  </div>

                  {/* 画像アップロード */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      写真（最大5枚）
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      id="review-images"
                      disabled={reviewImages.length >= 5}
                    />
                    <label
                      htmlFor="review-images"
                      className={`inline-block px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        reviewImages.length >= 5
                          ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'border-blue-300 hover:border-blue-400 text-blue-600'
                      }`}
                    >
                      📷 写真を追加
                    </label>
                    
                    {/* プレビュー */}
                    {imagePreviewUrls.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 md:grid-cols-5 gap-2">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <Image
                              src={url}
                              alt={`プレビュー ${index + 1}`}
                              width={100}
                              height={100}
                              className="w-full h-20 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* アップロード進捗 */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">画像アップロード中... {uploadProgress.toFixed(0)}%</p>
                    </div>
                  )}

                  {/* 送信ボタン */}
                  <div className="flex gap-3">
                    <button
                      onClick={submitDetailedReview}
                      disabled={isSubmitting || detailedReview.comment.length < 20}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {isSubmitting ? '投稿中...' : '詳細レビューを投稿'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      disabled={isSubmitting}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}