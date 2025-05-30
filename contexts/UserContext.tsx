// contexts/UserContext.tsx - 無限ローディング修正版
'use client'
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

// ユーザー型定義
export interface User {
  id: string
  email?: string
  nickname?: string
  avatar_url?: string
  full_name?: string
  is_anonymous: boolean
  created_at?: string
  last_active?: string
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
  validateUserAction: (action: string, resourceOwner?: string) => boolean
  logSecurityEvent: (event: string, details?: any) => Promise<void>
}

// コンテキスト作成
const UserContext = createContext<UserContextType | undefined>(undefined)

// 入力値のサニタイズ
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .substring(0, 100)
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authInitialized, setAuthInitialized] = useState(false)

  // 権限チェック関数
  const isModeratorOrAdmin = (): boolean => {
    return !!user && (user.role === 'moderator' || user.role === 'admin')
  }

  // レート制限チェック
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
      
      if (data.timestamp < hourAgo) {
        localStorage.setItem(key, JSON.stringify({ count: 0, timestamp: now }))
        return false
      }
      
      const limits: Record<string, number> = {
        'SHOP_CREATION': 5,
        'REVIEW_CREATION': 20,
        'PROFILE_UPDATES': 10
      }
      
      const limit = limits[action.toUpperCase()] || 10
      return data.count >= limit
      
    } catch (error) {
      console.error('Rate limit check error:', error)
      return false
    }
  }

  // セキュリティコンテキストの計算
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

  // Supabaseユーザーを内部User型に変換
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
      role: userData.role || 'user',
      is_verified: !isAnonymous && !!supabaseUser.email_confirmed_at,
      security_level: isAnonymous ? 1 : (userData.role === 'admin' ? 3 : 2)
    }
  }

  // セキュリティイベントのログ（開発版）
  const logSecurityEvent = async (event: string, details?: any): Promise<void> => {
    try {
      const logData = {
        event,
        user_id: user?.id || 'anonymous',
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        details: details || {}
      }

      // 開発環境ではコンソールに出力
      if (process.env.NODE_ENV === 'development') {
        console.log('Security Event:', logData)
      }
    } catch (error) {
      console.error('セキュリティログエラー:', error)
    }
  }

  // ユーザープロファイルをデータベースに保存/更新（エラーハンドリング強化）
  const saveUserProfile = async (userData: User): Promise<void> => {
    try {
      // usersテーブルの存在確認とupsert
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
        // テーブルが存在しない場合は警告のみ
        if (error.code === '42P01') {
          console.warn('Users table does not exist. Please run database setup.')
          return
        }
        throw error
      }

      await logSecurityEvent('profile_updated', { user_id: userData.id })
    } catch (error) {
      console.error('ユーザープロファイル保存エラー:', error)
      // プロファイル保存の失敗は致命的ではないので、エラーを投げない
    }
  }

  // お気に入りをローカルストレージからデータベースに移行
  const migrateFavorites = async (userId: string): Promise<void> => {
    try {
      const localFavorites = localStorage.getItem('coffee-map-favorites')
      if (localFavorites) {
        const favoriteIds = JSON.parse(localFavorites) as number[]
        
        if (favoriteIds.length > 0) {
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
              // テーブルが存在しない場合は警告のみ
              if (error.code === '42P01') {
                console.warn('user_favorites table does not exist. Please run database setup.')
                break
              }
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

  // Googleサインイン
  const signInWithGoogle = async (): Promise<void> => {
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
      setLoading(false) // エラー時はローディングを解除
      throw new Error('Googleサインインに失敗しました')
    }
  }

  // 匿名サインイン
  const signInAnonymously = async (nickname: string): Promise<void> => {
    try {
      setLoading(true)
      
      const sanitizedNickname = sanitizeInput(nickname)
      if (sanitizedNickname.length < 2 || sanitizedNickname.length > 20) {
        throw new Error('ニックネームは2文字以上20文字以下で入力してください')
      }

      await logSecurityEvent('anonymous_login_attempt', { nickname: sanitizedNickname })
      
      const { data, error } = await supabase.auth.signInAnonymously()
      
      if (error) throw error
      
      if (data.user) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { 
            nickname: sanitizedNickname,
            is_anonymous: true,
            security_level: 1
          }
        })

        if (updateError) {
          console.warn('匿名ユーザーメタデータ更新エラー:', updateError)
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
      await logSecurityEvent('anonymous_login_failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw new Error('匿名サインインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // サインアウト
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true)
      
      await logSecurityEvent('logout_attempt', { user_id: user?.id })
      
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error
      
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

  // プロファイル更新
  const updateProfile = async (data: Partial<User>): Promise<void> => {
    if (!user) throw new Error('ユーザーがサインインしていません')

    if (isRateLimited('profile_updates')) {
      throw new Error('プロフィール更新の制限に達しました。しばらく時間をおいてから再試行してください。')
    }

    try {
      setLoading(true)

      const sanitizedData = {
        nickname: data.nickname ? sanitizeInput(data.nickname) : undefined,
        full_name: data.full_name ? sanitizeInput(data.full_name) : undefined,
        ...data
      }

      if (sanitizedData.nickname && (sanitizedData.nickname.length < 2 || sanitizedData.nickname.length > 20)) {
        throw new Error('ニックネームは2文字以上20文字以下で入力してください')
      }

      await logSecurityEvent('profile_update_attempt', { 
        user_id: user.id, 
        fields: Object.keys(sanitizedData) 
      })

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          nickname: sanitizedData.nickname,
          full_name: sanitizedData.full_name
        }
      })

      if (authError) throw authError

      const updatedUser = { ...user, ...sanitizedData }
      setUser(updatedUser)
      await saveUserProfile(updatedUser)

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
  const upgradeFromAnonymous = async (): Promise<void> => {
    if (!user || !user.is_anonymous) {
      throw new Error('匿名ユーザーではありません')
    }

    try {
      await logSecurityEvent('account_upgrade_attempt', { user_id: user.id })
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
  const refreshUser = async (): Promise<void> => {
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

  // URLからauth状態をクリア
  const clearAuthParams = useCallback(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.has('auth_success') || url.searchParams.has('auth_error')) {
        url.searchParams.delete('auth_success')
        url.searchParams.delete('auth_error')
        window.history.replaceState({}, document.title, url.toString())
      }
    }
  }, [])

  // 認証状態の監視（エラーハンドリング強化）
  useEffect(() => {
    let mounted = true

    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (error) {
          console.error('セッション取得エラー:', error)
          await logSecurityEvent('session_error', { error: error.message })
          setLoading(false)
          setAuthInitialized(true)
          return
        }

        console.log('Initial session:', session ? 'found' : 'not found')
        setSession(session)
        
        if (session?.user) {
          const isAnonymous = session.user.is_anonymous || 
                            session.user.user_metadata?.is_anonymous || 
                            false
                            
          const userData = convertSupabaseUser(session.user, isAnonymous)
          setUser(userData)
          await saveUserProfile(userData)
          
          if (!isAnonymous) {
            await migrateFavorites(userData.id)
          }

          await logSecurityEvent('session_restored', { user_id: userData.id })
        }

        // URL の auth パラメータをクリア
        clearAuthParams()
        
      } catch (error) {
        console.error('初期セッション取得エラー:', error)
        await logSecurityEvent('session_restore_failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      } finally {
        if (mounted) {
          setLoading(false)
          setAuthInitialized(true)
        }
      }
    }

    getInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id)
      
      if (!mounted) return
      
      setSession(session)
      
      await logSecurityEvent('auth_state_change', { event })
      
      if (session?.user) {
        const isAnonymous = session.user.is_anonymous || 
                          session.user.user_metadata?.is_anonymous || 
                          false
                          
        const userData = convertSupabaseUser(session.user, isAnonymous)
        setUser(userData)
        await saveUserProfile(userData)
        
        if (event === 'SIGNED_IN' && !isAnonymous) {
          await migrateFavorites(userData.id)
        }
      } else {
        setUser(null)
      }
      
      if (authInitialized) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [clearAuthParams, authInitialized])

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