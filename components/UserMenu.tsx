// components/UserMenu.tsx - 完成イメージに合わせて改善
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
      
      // ログアウト成功メッセージ
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
      <div className="user-avatar-skeleton" />
    )
  }

  // 未認証の場合
  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={openAuthModal}
          className="coffee-button"
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
      {/* ユーザーアバター */}
      <button
        onClick={handleMenuToggle}
        disabled={isLoggingOut}
        className="user-avatar"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={`${user.nickname || 'Coffee Lover'}のメニュー`}
      >
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.nickname || 'ユーザーアバター'}
            width={40}
            height={40}
            className="w-full h-full rounded-full object-cover"
            priority
          />
        ) : (
          <span className="text-white text-lg">
            {user.nickname?.charAt(0)?.toUpperCase() || '👤'}
          </span>
        )}

        {/* ローディング中 */}
        {isLoggingOut && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <>
          {/* 背景オーバーレイ（モバイル用） */}
          <div 
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="user-menu-dropdown">
            {/* ユーザー情報ヘッダー */}
            <div className="user-menu-header">
              <div className="flex items-center gap-3">
                <div className="user-avatar-large">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.nickname || 'ユーザーアバター'}
                      width={48}
                      height={48}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xl">
                      {user.nickname?.charAt(0)?.toUpperCase() || '👤'}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="user-name">
                    {user.nickname || '名無しユーザー'}
                  </div>
                  {user.email && (
                    <div className="user-email">
                      {user.email}
                    </div>
                  )}
                  <div className="user-badges">
                    <span className="user-badge verified">
                      ✓ 認証済み
                    </span>
                    {user.role === 'admin' && (
                      <span className="user-badge admin">
                        👑 管理者
                      </span>
                    )}
                    {user.role === 'moderator' && (
                      <span className="user-badge moderator">
                        🛡️ モデレーター
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* メニューアイテム */}
            <div className="user-menu-items">
              {/* プロフィール編集 */}
              <button
                className="user-menu-item"
                onClick={() => {
                  setIsOpen(false)
                  // TODO: プロフィール編集モーダルを開く
                  alert('プロフィール編集機能は今後実装予定です')
                }}
              >
                <span className="menu-icon">⚙️</span>
                <div className="menu-content">
                  <div className="menu-title">プロフィール設定</div>
                  <div className="menu-subtitle">アカウント情報を編集</div>
                </div>
              </button>

              {/* お気に入り店舗 */}
              <button
                className="user-menu-item"
                onClick={() => {
                  setIsOpen(false)
                  // TODO: お気に入り一覧を表示
                  alert('お気に入り一覧機能は今後実装予定です')
                }}
              >
                <span className="menu-icon">❤️</span>
                <div className="menu-content">
                  <div className="menu-title">お気に入り店舗</div>
                  <div className="menu-subtitle">保存した店舗を確認</div>
                </div>
              </button>

              {/* 投稿した店舗 */}
              <button
                className="user-menu-item"
                onClick={() => {
                  setIsOpen(false)
                  // TODO: 投稿した店舗一覧を表示
                  alert('投稿履歴機能は今後実装予定です')
                }}
              >
                <span className="menu-icon">🏪</span>
                <div className="menu-content">
                  <div className="menu-title">投稿した店舗</div>
                  <div className="menu-subtitle">あなたが追加した店舗</div>
                </div>
              </button>

              {/* レビュー履歴 */}
              <button
                className="user-menu-item"
                onClick={() => {
                  setIsOpen(false)
                  alert('レビュー履歴機能は今後実装予定です')
                }}
              >
                <span className="menu-icon">📝</span>
                <div className="menu-content">
                  <div className="menu-title">レビュー履歴</div>
                  <div className="menu-subtitle">投稿したレビューを確認</div>
                </div>
              </button>

              {/* 管理者専用メニュー */}
              {user.role === 'admin' && (
                <>
                  <hr className="menu-divider" />
                  <button
                    className="user-menu-item admin-item"
                    onClick={() => {
                      setIsOpen(false)
                      // TODO: 管理者ダッシュボードを開く
                      alert('管理者ダッシュボード機能は今後実装予定です')
                    }}
                  >
                    <span className="menu-icon">🛡️</span>
                    <div className="menu-content">
                      <div className="menu-title">管理者ダッシュボード</div>
                      <div className="menu-subtitle">サイト管理・統計</div>
                    </div>
                  </button>
                </>
              )}

              {/* ログアウト */}
              <hr className="menu-divider" />
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="user-menu-item logout-item"
              >
                <span className="menu-icon">
                  {isLoggingOut ? (
                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    '🚪'
                  )}
                </span>
                <div className="menu-content">
                  <div className="menu-title">
                    {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
                  </div>
                  <div className="menu-subtitle">アカウントからサインアウト</div>
                </div>
              </button>
            </div>

            {/* フッター情報 */}
            <div className="user-menu-footer">
              <div className="footer-message">
                💡 <strong>ヒント:</strong> サインインすると、お気に入り店舗やレビューが永続的に保存されます。
              </div>
            </div>
          </div>
        </>
      )}

      {/* カスタムスタイル */}
      <style jsx>{`
        .user-avatar-skeleton {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(45deg, var(--accent-coffee), var(--accent-gold));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: none;
          position: relative;
          overflow: hidden;
        }

        .user-avatar:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        }

        .user-avatar:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .user-menu-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 0.5rem);
          width: 320px;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          z-index: 50;
          overflow: hidden;
          animation: fade-in-up 0.2s ease-out;
        }

        .user-menu-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--current-border);
          background: var(--current-tertiary-bg);
        }

        .user-avatar-large {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(45deg, var(--accent-coffee), var(--accent-gold));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .user-name {
          font-weight: 600;
          color: var(--current-text-primary);
          font-size: 0.95rem;
          margin-bottom: 0.25rem;
        }

        .user-email {
          font-size: 0.8rem;
          color: var(--current-text-secondary);
          margin-bottom: 0.5rem;
          word-break: break-all;
        }

        .user-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .user-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 500;
        }

        .user-badge.verified {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .user-badge.admin {
          background: rgba(147, 51, 234, 0.1);
          color: #9333ea;
          border: 1px solid rgba(147, 51, 234, 0.2);
        }

        .user-badge.moderator {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .user-menu-items {
          padding: 0.5rem 0;
        }

        .user-menu-item {
          width: 100%;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .user-menu-item:hover {
          background: var(--current-tertiary-bg);
        }

        .user-menu-item:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .user-menu-item.admin-item:hover {
          background: rgba(147, 51, 234, 0.05);
        }

        .user-menu-item.logout-item:hover {
          background: rgba(239, 68, 68, 0.05);
        }

        .menu-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .menu-content {
          flex: 1;
          min-width: 0;
        }

        .menu-title {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--current-text-primary);
          margin-bottom: 0.125rem;
        }

        .menu-subtitle {
          font-size: 0.75rem;
          color: var(--current-text-secondary);
          line-height: 1.3;
        }

        .admin-item .menu-title {
          color: #9333ea;
        }

        .logout-item .menu-title {
          color: #ef4444;
        }

        .menu-divider {
          margin: 0.5rem 1.5rem;
          border: none;
          border-top: 1px solid var(--current-border);
        }

        .user-menu-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--current-border);
          background: var(--current-tertiary-bg);
        }

        .footer-message {
          font-size: 0.75rem;
          color: var(--current-text-secondary);
          line-height: 1.4;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
          .user-menu-dropdown {
            width: 280px;
            right: -1rem;
          }

          .user-menu-header,
          .user-menu-item,
          .user-menu-footer {
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .menu-divider {
            margin-left: 1rem;
            margin-right: 1rem;
          }
        }

        /* ダークモード対応 */
        .dark-mode .user-menu-dropdown {
          background: rgba(26, 26, 26, 0.95);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .dark-mode .user-menu-header,
        .dark-mode .user-menu-footer {
          background: rgba(45, 45, 45, 0.8);
        }

        /* アクセシビリティ */
        @media (prefers-reduced-motion: reduce) {
          .user-avatar,
          .user-menu-item {
            transition: none;
          }
          
          .user-menu-dropdown {
            animation: none;
          }
        }

        /* フォーカス管理 */
        .user-avatar:focus,
        .user-menu-item:focus {
          outline: 2px solid var(--accent-warm);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}