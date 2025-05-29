// components/AuthModal.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
  showAnonymousOption?: boolean
}

export default function AuthModal({
  isOpen,
  onClose,
  title = 'サインインが必要です',
  message = 'この機能を利用するには、サインインまたは匿名ログインを行ってください。',
  showAnonymousOption = true
}: AuthModalProps) {
  const { signInWithGoogle, signInAnonymously, loading } = useUser()
  const [nickname, setNickname] = useState('')
  const [showAnonymousForm, setShowAnonymousForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // モーダルが開かれたときの初期化
  useEffect(() => {
    if (isOpen) {
      setNickname('')
      setShowAnonymousForm(false)
      setError(null)
    }
  }, [isOpen])

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Googleサインインの処理
  const handleGoogleSignIn = async () => {
    try {
      setError(null)
      await signInWithGoogle()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'サインインに失敗しました')
    }
  }

  // 匿名サインインの処理
  const handleAnonymousSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nickname.trim()) {
      setError('ニックネームを入力してください')
      return
    }

    if (nickname.trim().length < 2) {
      setError('ニックネームは2文字以上で入力してください')
      return
    }

    if (nickname.trim().length > 20) {
      setError('ニックネームは20文字以下で入力してください')
      return
    }

    try {
      setError(null)
      await signInAnonymously(nickname.trim())
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : '匿名サインインに失敗しました')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl transform transition-all">
        {/* ヘッダー */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl p-1"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* メインコンテンツ */}
        <div className="space-y-4">
          {!showAnonymousForm ? (
            <>
              {/* Googleサインインボタン */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="font-medium text-gray-700">Googleでサインイン</span>
                  </>
                )}
              </button>

              {/* 区切り線 */}
              {showAnonymousOption && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">または</span>
                  </div>
                </div>
              )}

              {/* 匿名サインインオプション */}
              {showAnonymousOption && (
                <button
                  onClick={() => setShowAnonymousForm(true)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xl">👤</span>
                  <span className="font-medium text-gray-700">匿名でサインイン</span>
                </button>
              )}
            </>
          ) : (
            /* 匿名サインインフォーム */
            <form onSubmit={handleAnonymousSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ニックネーム *
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value)
                    setError(null)
                  }}
                  placeholder="例: コーヒー太郎"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={20}
                  disabled={loading}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  2〜20文字で入力してください。後で変更できます。
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAnonymousForm(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={loading || !nickname.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      処理中...
                    </div>
                  ) : (
                    '匿名でサインイン'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* フッター情報 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Googleアカウントでサインインすると、お気に入りやレビューが永続的に保存されます</span>
            </div>
            {showAnonymousOption && (
              <div className="flex items-start gap-2">
                <span className="text-blue-500">ℹ️</span>
                <span>匿名サインインでも基本機能をご利用いただけます。後でGoogleアカウントに移行することも可能です</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

// 使用例用の簡易版フック
export function useAuthModal() {
  const [isOpen, setIsOpen] = useState(false)
  
  const openAuthModal = () => setIsOpen(true)
  const closeAuthModal = () => setIsOpen(false)
  
  return {
    isOpen,
    openAuthModal,
    closeAuthModal,
    AuthModal: ({ title, message, showAnonymousOption }: Partial<AuthModalProps>) => (
      <AuthModal
        isOpen={isOpen}
        onClose={closeAuthModal}
        title={title}
        message={message}
        showAnonymousOption={showAnonymousOption}
      />
    )
  }
}