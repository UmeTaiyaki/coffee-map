// components/UpdatedReviewModal.tsx - 未使用変数修正版
import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import { useAuthModal } from './AuthModal'

interface Review {
  id: number
  shop_id: number
  user_id?: string
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

export default function UpdatedReviewModal({ shopId, shopName, isOpen, onClose }: ReviewModalProps) {
  // ユーザー認証
  const { user } = useUser()
  const { isOpen: _authModalOpen, openAuthModal, closeAuthModal: _closeAuthModal, AuthModal } = useAuthModal()

  // 状態管理
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newReview, setNewReview] = useState({
    reviewer_name: '',
    rating: 5,
    comment: ''
  })
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // レビューを取得
  const fetchReviews = useCallback(async () => {
    setLoading(true)
    setError(null)
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
      setError('レビューの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [shopId])

  // レビューフォーム表示
  const handleShowAddForm = () => {
    if (!user) {
      openAuthModal()
      return
    }

    // ユーザー情報から初期値を設定
    setNewReview({
      reviewer_name: user.nickname || '匿名ユーザー',
      rating: 5,
      comment: ''
    })
    setShowAddForm(true)
    setError(null)
  }

  // レビューを投稿
  const submitReview = async () => {
    if (!user) {
      openAuthModal()
      return
    }

    if (!newReview.reviewer_name.trim() || !newReview.comment.trim()) {
      setError('名前とコメントを入力してください')
      return
    }

    if (newReview.comment.trim().length < 10) {
      setError('コメントは10文字以上で入力してください')
      return
    }

    // 既存レビューチェック（認証済みユーザーのみ）
    if (!user.is_anonymous) {
      const existingReview = reviews.find(review => review.user_id === user.id)
      if (existingReview) {
        setError('既にこの店舗にレビューを投稿済みです。編集機能は今後追加予定です。')
        return
      }
    }

    setSubmitLoading(true)
    setError(null)

    try {
      const reviewData = {
        shop_id: shopId,
        user_id: user.id,
        reviewer_name: newReview.reviewer_name.trim(),
        rating: newReview.rating,
        comment: newReview.comment.trim()
      }

      const { error } = await supabase
        .from('reviews')
        .insert([reviewData])

      if (error) throw error

      // フォームをリセット
      setNewReview({ 
        reviewer_name: user.nickname || '匿名ユーザー', 
        rating: 5, 
        comment: '' 
      })
      setShowAddForm(false)
      
      // レビューを再取得
      await fetchReviews()
      
      // 成功メッセージ
      alert('レビューを投稿しました！ありがとうございます。')
    } catch (error) {
      console.error('レビュー投稿エラー:', error)
      setError(error instanceof Error ? error.message : 'レビューの投稿に失敗しました')
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
            type="button"
          >
            ⭐
          </button>
        ))}
      </div>
    )
  }

  // レビューの日付フォーマット
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
  const userHasReviewed = user && !user.is_anonymous && 
    reviews.some(review => review.user_id === user.id)

  useEffect(() => {
    if (isOpen && shopId) {
      fetchReviews()
    }
  }, [isOpen, shopId, fetchReviews])

  if (!isOpen) return null

  return (
    <>
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

            {/* エラー表示 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* レビュー投稿ボタン */}
            <div className="mb-4">
              {user ? (
                userHasReviewed ? (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                    ✅ このお店にレビュー投稿済みです。編集機能は今後追加予定です。
                  </div>
                ) : (
                  <button
                    onClick={handleShowAddForm}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {showAddForm ? '投稿をキャンセル' : '📝 レビューを書く'}
                  </button>
                )
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-800 text-sm font-medium">レビューを投稿するにはサインインが必要です</p>
                      <p className="text-blue-600 text-xs mt-1">Googleアカウントまたは匿名ログインが利用できます</p>
                    </div>
                    <button
                      onClick={openAuthModal}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition-colors"
                    >
                      サインイン
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* レビュー投稿フォーム */}
            {showAddForm && user && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium mb-3">新しいレビューを投稿</h3>
                
                <div className="space-y-4">
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
                    <p className="text-xs text-gray-500 mt-1">
                      {user.is_anonymous ? '匿名ユーザーとして投稿されます' : 'Googleアカウント連携済み'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      評価 *
                    </label>
                    {renderStars(newReview.rating, true, (rating) => 
                      setNewReview({ ...newReview, rating })
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      星をクリックして評価してください
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      コメント *
                    </label>
                    <textarea
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="このお店の感想を詳しく教えてください..."
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                      <span>10文字以上で入力してください</span>
                      <span>{newReview.comment.length}/500文字</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={submitReview}
                      disabled={submitLoading || newReview.comment.trim().length < 10}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitLoading ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          投稿中...
                        </div>
                      ) : (
                        '📝 投稿する'
                      )}
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                      disabled={submitLoading}
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
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-gray-800">{review.reviewer_name}</div>
                            {review.user_id === user?.id && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                                あなたの投稿
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {renderStars(review.rating)}
                            <span className="text-sm text-gray-600">
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(review.created_at)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 認証モーダル */}
      <AuthModal 
        title="レビュー投稿にはサインインが必要です"
        message="コミュニティの品質維持のため、レビュー投稿にはサインインをお願いしています。"
      />

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  )
}