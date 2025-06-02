// components/UserMenu.tsx
'use client'
import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useUser } from '../contexts/UserContext'
import { useAuthModal } from './AuthModal'

export default function UserMenu() {
  const { user, signOut, loading } = useUser()
  const { openAuthModal, AuthModal } = useAuthModal()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // メニュー外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ESCキーでメニューを閉じる
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true)
      setIsOpen(false)
      
      await signOut()
      
      // ログアウト成功メッセージ（オプション）
      const event = new CustomEvent('showToast', {
        detail: {
          message: 'ログアウトしました',
          type: 'success'
        }
      })
      window.dispatchEvent(event)
      
    } catch (error) {
      console.error('ログアウトエラー:', error)
      
      // エラーメッセージ表示
      const event = new CustomEvent('showToast', {
        detail: {
          message: 'ログアウトに失敗しました',
          type: 'error'
        }
      })
      window.dispatchEvent(event)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleMenuToggle = () => {
    setIsOpen(!isOpen)
  }

  // 初期ローディング中の表示
  if (loading) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 text-sm hidden sm:inline">読み込み中...</span>
        </div>
      </div>
    )
  }

  // 未認証の場合
  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={openAuthModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span className="text-lg">👤</span>
          <span className="hidden sm:inline">サインイン</span>
        </button>
        
        <AuthModal 
          title="Coffee Mapにサインイン"
          message="お気に入り店舗の保存やレビューの投稿をするにはサインインしてください。"
        />
      </div>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* ユーザーボタン */}
      <button
        onClick={handleMenuToggle}
        disabled={isLoggingOut}
        className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* アバター */}
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.nickname || 'ユーザーアバター'}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
              priority
            />) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 text-sm">👤</span>
            </div>
          )}
        </div>

        {/* ユーザー情報 */}
        <div className="flex-1 text-left min-w-0 hidden sm:block">
          <div className="font-medium text-gray-900 text-sm truncate">
            {user.nickname || '名無しユーザー'}
          </div>
          <div className="text-xs text-gray-500">認証済み</div>
        </div>

        {/* ドロップダウン矢印 */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>

        {/* ローディング中 */}
        {isLoggingOut && (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        )}
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-100">
            {/* ユーザー情報詳細 */}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.nickname || 'ユーザーアバター'}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 text-lg">👤</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {user.nickname || '名無しユーザー'}
                </div>
                {user.email && (
                  <div className="text-sm text-gray-500 truncate">
                    {user.email}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ 認証済み
                  </span>
                  {user.role === 'admin' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      👑 管理者
                    </span>
                  )}
                  {user.role === 'moderator' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      🛡️ モデレーター
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* メニューアイテム */}
          <div className="py-2">
            {/* プロフィール編集（今後の実装予定） */}
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              onClick={() => {
                setIsOpen(false)
                // TODO: プロフィール編集モーダルを開く
                alert('プロフィール編集機能は今後実装予定です')
              }}
            >
              <span className="text-gray-400">⚙️</span>
              プロフィール設定
            </button>

            {/* お気に入り店舗（今後の実装予定） */}
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              onClick={() => {
                setIsOpen(false)
                // TODO: お気に入り一覧を表示
                alert('お気に入り一覧機能は今後実装予定です')
              }}
            >
              <span className="text-gray-400">❤️</span>
              お気に入り店舗
            </button>

            {/* 投稿した店舗（今後の実装予定） */}
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              onClick={() => {
                setIsOpen(false)
                // TODO: 投稿した店舗一覧を表示
                alert('投稿履歴機能は今後実装予定です')
              }}
            >
              <span className="text-gray-400">🏪</span>
              投稿した店舗
            </button>

            {/* 管理者専用メニュー */}
            {user.role === 'admin' && (
              <>
                <hr className="my-2" />
                <button
                  className="w-full px-4 py-2 text-left text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-3"
                  onClick={() => {
                    setIsOpen(false)
                    // TODO: 管理者ダッシュボードを開く
                    alert('管理者ダッシュボード機能は今後実装予定です')
                  }}
                >
                  <span className="text-purple-500">🛡️</span>
                  管理者ダッシュボード
                </button>
              </>
            )}

            {/* ログアウト */}
            <hr className="my-2" />
            <button
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-red-500">🚪</span>
              )}
              {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
            </button>
          </div>

          {/* ヘルプ情報 */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="text-xs text-gray-500">
              💡 <strong>ヒント:</strong> サインインすると、お気に入り店舗やレビューが保存されます。
            </div>
          </div>
        </div>
      )}

      {/* 背景オーバーレイ（モバイル用） */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

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