import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface Review {
  id: number
  shop_id: number
  reviewer_name: string
  rating: number
  comment: string
  created_at: string
}

interface ReviewModalProps {
  shopId: number
  shopName: string
  isOpen: boolean
  onClose: () => void
}

export default function ReviewModal({ shopId, shopName, isOpen, onClose }: ReviewModalProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newReview, setNewReview] = useState({
    reviewer_name: '',
    rating: 5,
    comment: ''
  })
  const [submitLoading, setSubmitLoading] = useState(false)

  // レビューを取得
  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReviews(data || [])
    } catch (error) {
      console.error('レビュー取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }, [shopId])

  // レビューを投稿
  const submitReview = async () => {
    if (!newReview.reviewer_name.trim() || !newReview.comment.trim()) {
      alert('名前とコメントを入力してください')
      return
    }

    setSubmitLoading(true)
    try {
      const { error } = await supabase
        .from('reviews')
        .insert([{
          shop_id: shopId,
          reviewer_name: newReview.reviewer_name.trim(),
          rating: newReview.rating,
          comment: newReview.comment.trim()
        }])

      if (error) throw error

      // フォームをリセット
      setNewReview({ reviewer_name: '', rating: 5, comment: '' })
      setShowAddForm(false)
      
      // レビューを再取得
      await fetchReviews()
      
      alert('レビューを投稿しました！')
    } catch (error) {
      console.error('レビュー投稿エラー:', error)
      alert('レビューの投稿に失敗しました')
    } finally {
      setSubmitLoading(false)
    }
  }

  // 平均評価を計算
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0'

  // 星を表示
  const renderStars = (rating: number, interactive = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onChange && onChange(star)}
            className={`text-lg ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            } ${interactive ? 'hover:text-yellow-400 cursor-pointer' : ''}`}
            disabled={!interactive}
          >
            ⭐
          </button>
        ))}
      </div>
    )
  }

  useEffect(() => {
    if (isOpen && shopId) {
      fetchReviews()
    }
  }, [isOpen, shopId, fetchReviews])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">📝 {shopName} のレビュー</h2>
              <div className="flex items-center mt-2">
                {renderStars(Math.round(parseFloat(averageRating)))}
                <span className="ml-2 text-sm text-gray-600">
                  {averageRating} ({reviews.length}件のレビュー)
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>

          {/* レビュー投稿ボタン */}
          <div className="mb-4">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              {showAddForm ? '投稿をキャンセル' : '📝 レビューを書く'}
            </button>
          </div>

          {/* レビュー投稿フォーム */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-3">新しいレビューを投稿</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    お名前 *
                  </label>
                  <input
                    type="text"
                    value={newReview.reviewer_name}
                    onChange={(e) => setNewReview({ ...newReview, reviewer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: 田中太郎"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    評価 *
                  </label>
                  {renderStars(newReview.rating, true, (rating) => 
                    setNewReview({ ...newReview, rating })
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    コメント *
                  </label>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="このお店の感想を教えてください..."
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {newReview.comment.length}/500文字
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={submitReview}
                    disabled={submitLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {submitLoading ? '投稿中...' : '📝 投稿する'}
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* レビュー一覧 */}
          <div>
            <h3 className="text-lg font-medium mb-3">レビュー一覧</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">⏳</div>
                <div className="text-sm text-gray-600">レビューを読み込み中...</div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <div className="text-sm">まだレビューがありません</div>
                <div className="text-xs">最初のレビューを投稿してみませんか？</div>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-800">{review.reviewer_name}</div>
                        <div className="flex items-center">
                          {renderStars(review.rating)}
                          <span className="ml-2 text-sm text-gray-600">
                            {review.rating}/5
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}