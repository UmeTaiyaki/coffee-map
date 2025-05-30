// contexts/UserContext.tsx - TypeScriptエラー修正版
'use client'
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

// ユーザー型定義（セキュリティ強化）
export interface User {
  id: string
  email?: string
  nickname?: string
  avatar_url?: string
  full_name?: string
  is_anonymous: boolean
  created_at?: string
  last_active?: string
  // セキュリティ関連フィールド
  role?: 'user' | 'moderator' | 'admin'
  is_verified?: boolean
  security_level?: number
}

// セキュリティコンテキスト型定義
interface SecurityContext {
  canCreateShop: boolean
  canEditShop: (shopCreatedBy?: string) => boolean
  canDeleteShop: (shopCreatedBy?: string) => boolean
  canPostReview: boolean
  canEditReview: (reviewUserId?: string) => boolean
  canDeleteReview: (reviewUserId?: string) => boolean
  canModerateContent: boolean
  canAccessAdminFeatures: boolean
}

// コンテキスト型定義
interface UserContextType {
  user: User | null
  session: Session | null
  loading: boolean
  security: SecurityContext
  signInWithGoogle: () => Promise<void>
  signInAnonymously: (nickname: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  upgradeFromAnonymous: () => Promise<void>
  refreshUser: () => Promise<void>
  // セキュリティ関連メソッド
  validateUserAction: (action: string, resourceOwner?: string) => boolean
  logSecurityEvent: (event: string, details?: any) => Promise<void>
}

// コンテキスト作成
const UserContext = createContext<UserContextType | undefined>(undefined)

// セキュリティ設定
const SECURITY_CONFIG = {
  ANONYMOUS_RESTRICTIONS: {
    MAX_SHOPS_PER_DAY: 3,
    MAX_REVIEWS_PER_DAY: 10,
    MAX_IMAGES_PER_SHOP: 1
  },
  RATE_LIMITS: {
    SHOP_CREATION: 5, // per hour for authenticated users
    REVIEW_CREATION: 20, // per hour
    PROFILE_UPDATES: 10 // per hour
  }
}

// プロバイダーコンポーネント
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // 権限チェック関数（先に定義）
  const isModeratorOrAdmin = (): boolean => {
    return !!user && (user.role === 'moderator' || user.role === 'admin')
  }

  // レート制限チェック（先に定義）
  const isRateLimited = (action: string): boolean => {
    if (!user) return true
    
    try {
      const key = `rate_limit_${action}_${user.id}`
      const stored = localStorage.getItem(key)
      
      if (!stored) {
        localStorage.setItem(key, JSON.stringify({ count: 0, timestamp: Date.now() }))
        return false
      }
      
      const data = JSON.parse(stored)
      const now = Date.now()
      const hourAgo = now - (60 * 60 * 1000)
      
      // 1時間以上経過していればリセット
      if (data.timestamp < hourAgo) {
        localStorage.setItem(key, JSON.stringify({ count: 0, timestamp: now }))
        return false
      }
      
      // レート制限チェック
      const limit = SECURITY_CONFIG.RATE_LIMITS[action.toUpperCase() as keyof typeof SECURITY_CONFIG.RATE_LIMITS] || 10
      return data.count >= limit
      
    } catch (error) {
      console.error('Rate limit check error:', error)
      return false
    }
  }

  // セキュリティコンテキストの計算（関数定義後に配置）
  const security: SecurityContext = {
    canCreateShop: !!user && !isRateLimited('shop_creation'),
    canEditShop: (shopCreatedBy?: string) => 
      !!user && (user.id === shopCreatedBy || isModeratorOrAdmin()),
    canDeleteShop: (shopCreatedBy?: string) => 
      !!user && (user.id === shopCreatedBy || isModeratorOrAdmin()),
    canPostReview: !!user && !isRateLimited('review_creation'),
    canEditReview: (reviewUserId?: string) => 
      !!user && user.id === reviewUserId,
    canDeleteReview: (reviewUserId?: string) => 
      !!user && (user.id === reviewUserId || isModeratorOrAdmin()),
    canModerateContent: !!user && isModeratorOrAdmin(),
    canAccessAdminFeatures: !!user && user.role === 'admin'
  }

  // レート制限カウンターを増加
  const incrementRateLimit = (action: string): void => {
    if (!user) return
    
    try {
      const key = `rate_limit_${action}_${user.id}`
      const stored = localStorage.getItem(key)
      const data = stored ? JSON.parse(stored) : { count: 0, timestamp: Date.now() }
      
      data.count += 1
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error('Rate limit increment error:', error)
    }
  }

  // Supabaseユーザーを内部User型に変換（セキュリティ強化）
  const convertSupabaseUser = (supabaseUser: SupabaseUser, isAnonymous = false): User => {
    const userData = supabaseUser.user_metadata || {}
    
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      nickname: userData.nickname || userData.name || userData.full_name?.split(' ')[0] || '匿名ユーザー',
      avatar_url: userData.avatar_url || userData.picture,
      full_name: userData.full_name || userData.name,
      is_anonymous: isAnonymous,
      created_at: supabaseUser.created_at,
      last_active: new Date().toISOString(),
      // セキュリティ関連フィールド
      role: userData.role || 'user',
      is_verified: !isAnonymous && !!supabaseUser.email_confirmed_at,
      security_level: isAnonymous ? 1 : (userData.role === 'admin' ? 3 : 2)
    }
  }

  // 入力値のサニタイズ
  const sanitizeInput = (input: string): string => {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .substring(0, 100) // 最大長制限
  }

  // セキュリティイベントのログ
  const logSecurityEvent = async (event: string, details?: any): Promise<void> => {
    try {
      // 本番環境では適切なログシステムに送信
      const logData = {
        event,
        user_id: user?.id || 'anonymous',
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ip: 'client-side', // サーバーサイドで実際のIPを記録
        details: details || {}
      }

      // 開発環境ではコンソールに出力
      if (process.env.NODE_ENV === 'development') {
        console.log('Security Event:', logData)
      }

      // 本番環境では外部ログサービスに送信
      // await fetch('/api/security/log', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logData)
      // })
    } catch (error) {
      console.error('セキュリティログエラー:', error)
    }
  }

  // ユーザープロファイルをデータベースに保存/更新（セキュリティ強化）
  const saveUserProfile = async (userData: User) => {
    try {
      // RLSポリシーにより、自分のプロフィールのみ更新可能
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userData.id,
          email: userData.email,
          nickname: sanitizeInput(userData.nickname || ''),
          avatar_url: userData.avatar_url,
          full_name: sanitizeInput(userData.full_name || ''),
          is_anonymous: userData.is_anonymous,
          last_active: new Date().toISOString(),
          user_metadata: {
            role: userData.role || 'user',
            is_verified: userData.is_verified,
            security_level: userData.security_level
          }
        }, {
          onConflict: 'id'
        })

      if (error) {
        console.error('ユーザープロファイル保存エラー:', error)
        throw error
      }

      await logSecurityEvent('profile_updated', { user_id: userData.id })
    } catch (error) {
      console.error('ユーザープロファイル保存エラー:', error)
      throw error
    }
  }

  // お気に入りをローカルストレージからデータベースに移行（セキュリティ強化）
  const migrateFavorites = async (userId: string) => {
    try {
      const localFavorites = localStorage.getItem('coffee-map-favorites')
      if (localFavorites) {
        const favoriteIds = JSON.parse(localFavorites) as number[]
        
        if (favoriteIds.length > 0) {
          // バッチサイズを制限してスパム防止
          const batchSize = 50
          const batches = []
          
          for (let i = 0; i < favoriteIds.length; i += batchSize) {
            batches.push(favoriteIds.slice(i, i + batchSize))
          }

          for (const batch of batches) {
            const favoritesData = batch.map(shopId => ({
              user_id: userId,
              shop_id: shopId
            }))

            const { error } = await supabase
              .from('user_favorites')
              .upsert(favoritesData, { onConflict: 'user_id,shop_id' })

            if (error) {
              console.error('お気に入り移行エラー:', error)
              break
            }
          }

          localStorage.removeItem('coffee-map-favorites')
          await logSecurityEvent('favorites_migrated', { 
            user_id: userId, 
            count: favoriteIds.length 
          })
        }
      }
    } catch (error) {
      console.error('お気に入り移行エラー:', error)
    }
  }

  // Googleサインイン（セキュリティ強化）
  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      
      await logSecurityEvent('login_attempt', { method: 'google' })
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        await logSecurityEvent('login_failed', { method: 'google', error: error.message })
        throw error
      }
    } catch (error) {
      console.error('Googleサインインエラー:', error)
      throw new Error('Googleサインインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 匿名サインイン（セキュリティ強化）
  const signInAnonymously = async (nickname: string) => {
    try {
      setLoading(true)
      
      // 入力値の検証とサニタイズ
      const sanitizedNickname = sanitizeInput(nickname)
      if (sanitizedNickname.length < 2 || sanitizedNickname.length > 20) {
        throw new Error('ニックネームは2文字以上20文字以下で入力してください')
      }

      await logSecurityEvent('anonymous_login_attempt', { nickname: sanitizedNickname })
      
      // Supabaseの匿名認証
      const { data, error } = await supabase.auth.signInAnonymously()
      
      if (error) throw error
      
      if (data.user) {
        // ニックネームをメタデータに保存
        const { error: updateError } = await supabase.auth.updateUser({
          data: { 
            nickname: sanitizedNickname,
            is_anonymous: true,
            security_level: 1
          }
        })

        if (updateError) {
          console.error('匿名ユーザーメタデータ更新エラー:', updateError)
        }

        const userData = convertSupabaseUser(data.user, true)
        userData.nickname = sanitizedNickname
        
        setUser(userData)
        await saveUserProfile(userData)
        await migrateFavorites(userData.id)
        await logSecurityEvent('anonymous_login_success', { user_id: userData.id })
      }
    } catch (error) {
      console.error('匿名サインインエラー:', error)
      await logSecurityEvent('anonymous_login_failed', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw new Error('匿名サインインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // サインアウト（セキュリティ強化）
  const signOut = async () => {
    try {
      setLoading(true)
      
      await logSecurityEvent('logout_attempt', { user_id: user?.id })
      
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error
      
      // セキュリティ関連データのクリア
      clearSecurityData()
      
      setUser(null)
      setSession(null)
      
      await logSecurityEvent('logout_success')
    } catch (error) {
      console.error('サインアウトエラー:', error)
      throw new Error('サインアウトに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // セキュリティデータのクリア
  const clearSecurityData = () => {
    try {
      // レート制限データをクリア
      const keys = Object.keys(localStorage).filter(key => key.startsWith('rate_limit_'))
      keys.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.error('セキュリティデータクリアエラー:', error)
    }
  }

  // プロファイル更新（セキュリティ強化）
  const updateProfile = async (data: Partial<User>) => {
    if (!user) throw new Error('ユーザーがサインインしていません')

    // レート制限チェック
    if (isRateLimited('profile_updates')) {
      throw new Error('プロフィール更新の制限に達しました。しばらく時間をおいてから再試行してください。')
    }

    try {
      setLoading(true)

      // 入力値のサニタイズ
      const sanitizedData = {
        nickname: data.nickname ? sanitizeInput(data.nickname) : undefined,
        full_name: data.full_name ? sanitizeInput(data.full_name) : undefined,
        ...data
      }

      // バリデーション
      if (sanitizedData.nickname && (sanitizedData.nickname.length < 2 || sanitizedData.nickname.length > 20)) {
        throw new Error('ニックネームは2文字以上20文字以下で入力してください')
      }

      await logSecurityEvent('profile_update_attempt', { 
        user_id: user.id, 
        fields: Object.keys(sanitizedData) 
      })

      // Supabaseのユーザーメタデータを更新
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          nickname: sanitizedData.nickname,
          full_name: sanitizedData.full_name
        }
      })

      if (authError) throw authError

      // ローカル状態を更新
      const updatedUser = { ...user, ...sanitizedData }
      setUser(updatedUser)

      // データベースのプロフィールを更新
      await saveUserProfile(updatedUser)

      // レート制限カウンターを増加
      incrementRateLimit('profile_updates')

      await logSecurityEvent('profile_update_success', { user_id: user.id })

    } catch (error) {
      console.error('プロファイル更新エラー:', error)
      await logSecurityEvent('profile_update_failed', { 
        user_id: user.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw new Error('プロフィールの更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 匿名ユーザーから正式ユーザーへのアップグレード
  const upgradeFromAnonymous = async () => {
    if (!user || !user.is_anonymous) {
      throw new Error('匿名ユーザーではありません')
    }

    try {
      await logSecurityEvent('account_upgrade_attempt', { user_id: user.id })
      // Googleサインインを実行
      await signInWithGoogle()
      await logSecurityEvent('account_upgrade_success', { user_id: user.id })
    } catch (error) {
      console.error('アカウントアップグレードエラー:', error)
      await logSecurityEvent('account_upgrade_failed', { 
        user_id: user.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw new Error('アカウントのアップグレードに失敗しました')
    }
  }

  // ユーザー情報を再取得
  const refreshUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (currentUser) {
        const isAnonymous = currentUser.is_anonymous || 
                          currentUser.user_metadata?.is_anonymous || 
                          false
                          
        const userData = convertSupabaseUser(currentUser, isAnonymous)
        setUser(userData)
        await saveUserProfile(userData)
      }
    } catch (error) {
      console.error('ユーザー情報更新エラー:', error)
    }
  }

  // ユーザーアクションの検証
  const validateUserAction = (action: string, resourceOwner?: string): boolean => {
    if (!user) return false

    switch (action) {
      case 'create_shop':
        return security.canCreateShop
      case 'edit_shop':
        return security.canEditShop(resourceOwner)
      case 'delete_shop':
        return security.canDeleteShop(resourceOwner)
      case 'post_review':
        return security.canPostReview
      case 'edit_review':
        return security.canEditReview(resourceOwner)
      case 'delete_review':
        return security.canDeleteReview(resourceOwner)
      case 'moderate_content':
        return security.canModerateContent
      case 'access_admin':
        return security.canAccessAdminFeatures
      default:
        return false
    }
  }

  // 認証状態の監視（セキュリティ強化）
  useEffect(() => {
    // 現在のセッションを取得
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('セッション取得エラー:', error)
          await logSecurityEvent('session_error', { error: error.message })
          return
        }

        setSession(session)
        
        if (session?.user) {
          const isAnonymous = session.user.is_anonymous || 
                            session.user.user_metadata?.is_anonymous || 
                            false
                            
          const userData = convertSupabaseUser(session.user, isAnonymous)
          setUser(userData)
          await saveUserProfile(userData)
          
          // 初回ログイン時のお気に入り移行
          if (!isAnonymous) {
            await migrateFavorites(userData.id)
          }

          await logSecurityEvent('session_restored', { user_id: userData.id })
        }
      } catch (error) {
        console.error('初期セッション取得エラー:', error)
        await logSecurityEvent('session_restore_failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // 認証状態変更の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      
      await logSecurityEvent('auth_state_change', { event })
      
      if (session?.user) {
        const isAnonymous = session.user.is_anonymous || 
                          session.user.user_metadata?.is_anonymous || 
                          false
                          
        const userData = convertSupabaseUser(session.user, isAnonymous)
        setUser(userData)
        await saveUserProfile(userData)
        
        // サインイン時のお気に入り移行
        if (event === 'SIGNED_IN' && !isAnonymous) {
          await migrateFavorites(userData.id)
        }
      } else {
        setUser(null)
        clearSecurityData()
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value: UserContextType = {
    user,
    session,
    loading,
    security,
    signInWithGoogle,
    signInAnonymously,
    signOut,
    updateProfile,
    upgradeFromAnonymous,
    refreshUser,
    validateUserAction,
    logSecurityEvent
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

// カスタムフック
export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

// セキュリティ強化されたHOC
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useUser()

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">認証情報を確認中...</p>
          </div>
        </div>
      )
    }

    if (!user) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-4xl mb-4">🔒</div>
            <p className="text-gray-600 mb-4">この機能を利用するにはサインインが必要です</p>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}

// 権限チェック付きHOC
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredAction: string,
  fallbackComponent?: React.ComponentType
) {
  return function PermissionGuardedComponent(props: P) {
    const { user, validateUserAction } = useUser()

    if (!user || !validateUserAction(requiredAction)) {
      if (fallbackComponent) {
        const FallbackComponent = fallbackComponent
        return <FallbackComponent />
      }

      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-gray-600 mb-4">この操作を実行する権限がありません</p>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}