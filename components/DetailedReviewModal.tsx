// components/DetailedReviewModal.tsx
import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import { useAuthModal } from './AuthModal'
import { showToast } from './ToastNotification'
import type { DetailedReview } from '../types/shop'

// VISIT_PURPOSESとRATING_CATEGORIESを直接定義
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

interface DetailedReviewModalProps {
  shopId: number
  shopName: string
  isOpen: boolean
  onClose: () => void
  onReviewAdded?: () => void
}

const RatingStars = ({ 
  rating, 
  onRatingChange,
  label,
  disabled = false 
}: { 
  rating: number
  onRatingChange?: (rating: number) => void
  label: string
  disabled?: boolean
}) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange?.(star)}
            disabled={disabled}
            className={`text-2xl transition-colors ${
              star <= rating 
                ? 'text-yellow-400' 
                : 'text-gray-300'
            } ${!disabled && 'hover:text-yellow-400 cursor-pointer'}`}
          >
            ⭐
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DetailedReviewModal({
  shopId,
  shopName,
  isOpen,
  onClose,
  onReviewAdded
}: DetailedReviewModalProps) {
  const { user } = useUser()
  const { openAuthModal, AuthModal } = useAuthModal()

  // レビューフォーム状態
  const [formData, setFormData] = useState({
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // 既存レビュー
  const [existingReviews, setExistingReviews] = useState<DetailedReview[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)

  // レビュー取得
  const fetchReviews = useCallback(async () => {
    setIsLoadingReviews(true)
    try {
      const { data, error } = await supabase
        .from('detailed_reviews')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setExistingReviews(data || [])
    } catch (error) {
      console.error('レビュー取得エラー:', error)
      showToast('レビューの取得に失敗しました', 'error')
    } finally {
      setIsLoadingReviews(false)
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

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      openAuthModal()
      return
    }

    if (formData.comment.length < 20) {
      showToast('レビューは20文字以上で入力してください', 'error')
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

      // レビューデータ
      const reviewData = {
        shop_id: shopId,
        user_id: user.id,
        reviewer_name: user.nickname || 'Coffee Lover',
        ...formData,
        images: imageUrls,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('detailed_reviews')
        .insert([reviewData])

      if (error) throw error

      showToast('レビューを投稿しました！', 'success')
      
      // フォームリセット
      setFormData({
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
      setShowReviewForm(false)
      
      // レビュー再取得
      await fetchReviews()
      onReviewAdded?.()

    } catch (error) {
      console.error('レビュー投稿エラー:', error)
      showToast('レビューの投稿に失敗しました', 'error')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  // 平均評価計算
  const calculateAverageRatings = useCallback(() => {
    if (existingReviews.length === 0) return null

    const sum = existingReviews.reduce((acc, review) => ({
      overall: acc.overall + review.rating,
      atmosphere: acc.atmosphere + review.atmosphere_rating,
      coffee_quality: acc.coffee_quality + review.coffee_quality_rating,
      service: acc.service + review.service_rating,
      value: acc.value + review.value_rating
    }), { overall: 0, atmosphere: 0, coffee_quality: 0, service: 0, value: 0 })

    const count = existingReviews.length
    return {
      overall: (sum.overall / count).toFixed(1),
      atmosphere: (sum.atmosphere / count).toFixed(1),
      coffee_quality: (sum.coffee_quality / count).toFixed(1),
      service: (sum.service / count).toFixed(1),
      value: (sum.value / count).toFixed(1)
    }
  }, [existingReviews])

  useEffect(() => {
    if (isOpen && shopId) {
      fetchReviews()
    }
  }, [isOpen, shopId, fetchReviews])

  if (!isOpen) return null

  const averageRatings = calculateAverageRatings()

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* ヘッダー */}
          <div className="p-6 border-b flex-shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {shopName} のレビュー
                </h2>
                {averageRatings && (
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="font-semibold">{averageRatings.overall}</span>
                      <span className="text-gray-500">({existingReviews.length}件)</span>
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
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* 平均評価サマリー */}
            {averageRatings && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-3">評価サマリー</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">雰囲気</div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="font-semibold">{averageRatings.atmosphere}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">コーヒーの質</div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="font-semibold">{averageRatings.coffee_quality}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">サービス</div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="font-semibold">{averageRatings.service}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">コスパ</div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="font-semibold">{averageRatings.value}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* レビュー投稿ボタン */}
            {!showReviewForm && (
              <div className="mb-6">
                <button
                  onClick={() => user ? setShowReviewForm(true) : openAuthModal()}
                  className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📝 レビューを書く
                </button>
              </div>
            )}

            {/* レビューフォーム */}
            {showReviewForm && user && (
              <form onSubmit={handleSubmit} className="mb-8 p-6 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">レビューを投稿</h3>
                
                {/* 訪問日 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    訪問日
                  </label>
                  <input
                    type="date"
                    value={formData.visit_date}
                    onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 訪問目的 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    訪問目的
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(VISIT_PURPOSES).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, visit_purpose: key as keyof typeof VISIT_PURPOSES })}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          formData.visit_purpose === key
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 詳細評価 */}
                <div className="mb-4 space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    詳細評価
                  </label>
                  <RatingStars
                    rating={formData.rating}
                    onRatingChange={(rating) => setFormData({ ...formData, rating })}
                    label="総合評価"
                  />
                  <RatingStars
                    rating={formData.atmosphere_rating}
                    onRatingChange={(rating) => setFormData({ ...formData, atmosphere_rating: rating })}
                    label="雰囲気"
                  />
                  <RatingStars
                    rating={formData.coffee_quality_rating}
                    onRatingChange={(rating) => setFormData({ ...formData, coffee_quality_rating: rating })}
                    label="コーヒーの質"
                  />
                  <RatingStars
                    rating={formData.service_rating}
                    onRatingChange={(rating) => setFormData({ ...formData, service_rating: rating })}
                    label="サービス"
                  />
                  <RatingStars
                    rating={formData.value_rating}
                    onRatingChange={(rating) => setFormData({ ...formData, value_rating: rating })}
                    label="コスパ"
                  />
                </div>

                {/* コメント */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    コメント（20文字以上）
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="お店の雰囲気、コーヒーの味、サービスなどについて詳しく教えてください..."
                    required
                    minLength={20}
                    maxLength={1000}
                  />
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {formData.comment.length}/1000文字
                  </div>
                </div>

                {/* 画像アップロード */}
                <div className="mb-4">
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
                  <div className="mb-4">
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
                    type="submit"
                    disabled={isSubmitting || formData.comment.length < 20}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isSubmitting ? '投稿中...' : '投稿する'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            )}

            {/* レビュー一覧 */}
            <div className="space-y-6">
              {isLoadingReviews ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-600 mt-2">レビューを読み込み中...</p>
                </div>
              ) : existingReviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg">まだレビューがありません</p>
                  <p className="text-sm mt-2">最初のレビューを投稿してみませんか？</p>
                </div>
              ) : (
                existingReviews.map((review) => (
                  <div key={review.id} className="border-b pb-6 last:border-b-0">
                    {/* レビューヘッダー */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold">{review.reviewer_name}</div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span>{new Date(review.created_at).toLocaleDateString('ja-JP')}</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                            {VISIT_PURPOSES[review.visit_purpose]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">⭐</span>
                        <span className="font-semibold">{review.rating}</span>
                      </div>
                    </div>

                    {/* 詳細評価 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 rounded">
                      <div className="text-sm">
                        <span className="text-gray-600">雰囲気:</span>
                        <span className="ml-1 font-medium">⭐{review.atmosphere_rating}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">コーヒー:</span>
                        <span className="ml-1 font-medium">⭐{review.coffee_quality_rating}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">サービス:</span>
                        <span className="ml-1 font-medium">⭐{review.service_rating}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">コスパ:</span>
                        <span className="ml-1 font-medium">⭐{review.value_rating}</span>
                      </div>
                    </div>

                    {/* コメント */}
                    <p className="text-gray-700 whitespace-pre-wrap mb-3">{review.comment}</p>

                    {/* 画像 */}
                    {review.images && review.images.length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                        {review.images.map((imageUrl, index) => (
                          <Image
                            key={index}
                            src={imageUrl}
                            alt={`レビュー画像 ${index + 1}`}
                            width={150}
                            height={150}
                            className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-90"
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
        </div>
      </div>

      <AuthModal 
        title="レビュー投稿にはサインインが必要です"
        message="コミュニティの品質維持のため、レビュー投稿にはサインインをお願いしています。"
      />
    </>
  )
}