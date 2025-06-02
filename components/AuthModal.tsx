// components/AuthModal.tsx - 完全版
'use client'
import React, { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
}

export default function AuthModal({
  isOpen,
  onClose,
  title = 'サインインが必要です',
  message = 'この機能を利用するには、Googleアカウントでサインインしてください。'
}: AuthModalProps) {
  const { signInWithGoogle, loading } = useUser()
  const [error, setError] = useState<string | null>(null)

  // モーダルが開かれたときの初期化
  useEffect(() => {
    if (isOpen) {
      setError(null)
      // モーダル表示時にスクロールを無効化
      document.body.style.overflow = 'hidden'
    } else {
      // モーダル非表示時にスクロールを復元
      document.body.style.overflow = 'unset'
    }

    // クリーンアップ
    return () => {
      document.body.style.overflow = 'unset'
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

  // 背景クリックでモーダルを閉じる
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ 
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl transform transition-all relative"
        style={{ zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl p-1 rounded-full hover:bg-gray-100 transition-colors"
            disabled={loading}
            aria-label="モーダルを閉じる"
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
          {/* Googleサインインボタン */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        </div>

        {/* フッター情報 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Googleアカウントでサインインすると、お気に入りやレビューが永続的に保存されます</span>
            </div>
          </div>
        </div>
      </div>

      {/* CSS-in-JS でアニメーション定義 */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        /* アクセシビリティ向上 */
        .focus\\:ring-2:focus {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
        }
        
        .focus\\:ring-gray-500:focus {
          box-shadow: 0 0 0 2px rgba(107, 114, 128, 0.5);
        }
        
        /* モバイル対応 */
        @media (max-width: 640px) {
          .max-w-md {
            max-width: calc(100vw - 2rem);
            margin: 1rem;
          }
        }
        
        /* ハイコントラストモード対応 */
        @media (prefers-contrast: high) {
          .border-gray-300 {
            border-color: #000;
          }
          
          .text-gray-500 {
            color: #000;
          }
        }
        
        /* 動きを減らす設定への対応 */
        @media (prefers-reduced-motion: reduce) {
          .transition-all,
          .transition-colors {
            transition: none;
          }
          
          .animate-spin {
            animation: none;
          }
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
    AuthModal: ({ title, message }: Partial<AuthModalProps>) => (
      <AuthModal
        isOpen={isOpen}
        onClose={closeAuthModal}
        title={title}
        message={message}
      />
    )
  }
}