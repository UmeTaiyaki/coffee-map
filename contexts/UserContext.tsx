'use client'
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

// 型定義
export interface User {
  id: string
  email?: string
  nickname?: string
  avatar_url?: string
  full_name?: string
  created_at?: string
  last_active?: string
  role?: 'user' | 'moderator' | 'admin'
  is_verified?: boolean
  security_level?: number
}

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

interface UserContextType {
  user: User | null
  session: Session | null
  loading: boolean
  security: SecurityContext
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  refreshUser: () => Promise<void>
  validateUserAction: (action: string, resourceOwner?: string) => boolean
  logSecurityEvent: (event: string, details?: any) => Promise<void>
}

// 定数
const RATE_LIMITS = {
  SHOP_CREATION: 5,
  REVIEW_CREATION: 20,
  PROFILE_UPDATES: 10
} as const

const NICKNAME_MIN_LENGTH = 2
const NICKNAME_MAX_LENGTH = 20
const INPUT_MAX_LENGTH = 100

// コンテキスト作成
const UserContext = createContext<UserContextType | undefined>(undefined)

// ユーティリティ関数
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .substring(0, INPUT_MAX_LENGTH)
}

const validateNickname = (nickname: string): string | null => {
  const sanitized = sanitizeInput(nickname)
  if (sanitized.length < NICKNAME_MIN_LENGTH || sanitized.length > NICKNAME_MAX_LENGTH) {
    return `ニックネームは${NICKNAME_MIN_LENGTH}文字以上${NICKNAME_MAX_LENGTH}文字以下で入力してください`
  }
  return null
}

// Provider コンポーネント
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // 権限チェック
  const isModeratorOrAdmin = useCallback((): boolean => {
    return !!user && (user.role === 'moderator' || user.role === 'admin')
  }, [user])

  // レート制限チェック
  const checkRateLimit = useCallback((action: string): boolean => {
    if (!user) return false
    
    try {
      const key = `rate_limit_${action}_${user.id}`
      const stored = localStorage.getItem(key)
      
      if (!stored) {
        localStorage.setItem(key, JSON.stringify({ count: 1, timestamp: Date.now() }))
        return true
      }
      
      const data = JSON.parse(stored)
      const hourAgo = Date.now() - (60 * 60 * 1000)
      
      if (data.timestamp < hourAgo) {
        localStorage.setItem(key, JSON.stringify({ count: 1, timestamp: Date.now() }))
        return true
      }
      
      const limit = RATE_LIMITS[action.toUpperCase() as keyof typeof RATE_LIMITS] || 10
      if (data.count >= limit) return false
      
      data.count++
      localStorage.setItem(key, JSON.stringify(data))
      return true
      
    } catch (error) {
      console.error('Rate limit check error:', error)
      return true
    }
  }, [user])

  // セキュリティコンテキスト
  const security: SecurityContext = {
    canCreateShop: !!user && checkRateLimit('shop_creation'),
    canEditShop: (shopCreatedBy?: string) => 
      !!user && (user.id === shopCreatedBy || isModeratorOrAdmin()),
    canDeleteShop: (shopCreatedBy?: string) => 
      !!user && (user.id === shopCreatedBy || isModeratorOrAdmin()),
    canPostReview: !!user && checkRateLimit('review_creation'),
    canEditReview: (reviewUserId?: string) => 
      !!user && user.id === reviewUserId,
    canDeleteReview: (reviewUserId?: string) => 
      !!user && (user.id === reviewUserId || isModeratorOrAdmin()),
    canModerateContent: isModeratorOrAdmin(),
    canAccessAdminFeatures: !!user && user.role === 'admin'
  }

  // Supabaseユーザーを内部User型に変換
  const convertSupabaseUser = useCallback((supabaseUser: SupabaseUser): User => {
    const metadata = supabaseUser.user_metadata || {}
    
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      nickname: metadata.nickname || metadata.name || metadata.full_name?.split(' ')[0] || '名無しユーザー',
      avatar_url: metadata.avatar_url || metadata.picture,
      full_name: metadata.full_name || metadata.name,
      created_at: supabaseUser.created_at,
      last_active: new Date().toISOString(),
      role: metadata.role || 'user',
      is_verified: !!supabaseUser.email_confirmed_at,
      security_level: metadata.role === 'admin' ? 3 : 2
    }
  }, [])

  // セキュリティイベントログ
  const logSecurityEvent = useCallback(async (event: string, details?: any): Promise<void> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Security Event:', {
        event,
        user_id: user?.id || 'anonymous',
        timestamp: new Date().toISOString(),
        details
      })
    }
  }, [user])

  // ユーザープロファイル保存
  const saveUserProfile = useCallback(async (userData: User): Promise<void> => {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userData.id,
          email: userData.email,
          nickname: userData.nickname,
          avatar_url: userData.avatar_url,
          full_name: userData.full_name,
          last_active: new Date().toISOString(),
          user_metadata: {
            role: userData.role,
            is_verified: userData.is_verified,
            security_level: userData.security_level
          }
        }, {
          onConflict: 'id'
        })

      if (error && error.code !== '42P01') {
        throw error
      }
    } catch (error) {
      console.warn('ユーザープロファイル保存エラー:', error)
    }
  }, [])

  // お気に入り移行
  const migrateFavorites = useCallback(async (userId: string): Promise<void> => {
    try {
      const localFavorites = localStorage.getItem('coffee-map-favorites')
      if (!localFavorites) return

      const favoriteIds = JSON.parse(localFavorites) as number[]
      if (favoriteIds.length === 0) return

      const favoritesData = favoriteIds.map(shopId => ({
        user_id: userId,
        shop_id: shopId
      }))

      const { error } = await supabase
        .from('user_favorites')
        .upsert(favoritesData, { onConflict: 'user_id,shop_id' })

      if (!error || error.code === '42P01') {
        localStorage.removeItem('coffee-map-favorites')
      }
    } catch (error) {
      console.warn('お気に入り移行エラー:', error)
    }
  }, [])

  // Googleサインイン
  const signInWithGoogle = useCallback(async (): Promise<void> => {
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
      setLoading(false)
      throw new Error('Googleサインインに失敗しました')
    }
  }, [logSecurityEvent])

  // サインアウト
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await logSecurityEvent('logout_attempt', { user_id: user?.id })
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setSession(null)
      await logSecurityEvent('logout_success')
    } catch (error) {
      throw new Error('サインアウトに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [user, logSecurityEvent])

  // プロファイル更新
  const updateProfile = useCallback(async (data: Partial<User>): Promise<void> => {
    if (!user) throw new Error('ユーザーがサインインしていません')

    if (!checkRateLimit('profile_updates')) {
      throw new Error('プロフィール更新の制限に達しました。しばらく時間をおいてから再試行してください。')
    }

    try {
      setLoading(true)

      let updatedData: any = {}
      
      if (data.nickname) {
        const validationError = validateNickname(data.nickname)
        if (validationError) throw new Error(validationError)
        updatedData.nickname = sanitizeInput(data.nickname)
      }
      
      if (data.full_name) {
        updatedData.full_name = sanitizeInput(data.full_name)
      }

      await logSecurityEvent('profile_update_attempt', { 
        user_id: user.id, 
        fields: Object.keys(updatedData) 
      })

      const { error } = await supabase.auth.updateUser({ data: updatedData })
      if (error) throw error

      const updatedUser = { ...user, ...updatedData }
      setUser(updatedUser)
      await saveUserProfile(updatedUser)
      await logSecurityEvent('profile_update_success', { user_id: user.id })

    } catch (error) {
      await logSecurityEvent('profile_update_failed', { 
        user_id: user.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw new Error(error instanceof Error ? error.message : 'プロフィールの更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [user, checkRateLimit, saveUserProfile, logSecurityEvent])

  // ユーザー情報更新
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (currentUser) {
        const userData = convertSupabaseUser(currentUser)
        setUser(userData)
        await saveUserProfile(userData)
      }
    } catch (error) {
      console.error('ユーザー情報更新エラー:', error)
    }
  }, [convertSupabaseUser, saveUserProfile])

  // アクション検証
  const validateUserAction = useCallback((action: string, resourceOwner?: string): boolean => {
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
  }, [user, security])

  // 認証状態の初期化
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (error) {
          console.error('セッション取得エラー:', error)
          setLoading(false)
          return
        }

        setSession(session)
        
        if (session?.user) {
          const userData = convertSupabaseUser(session.user)
          setUser(userData)
          await saveUserProfile(userData)
          await migrateFavorites(userData.id)
        }
        
      } catch (error) {
        console.error('初期化エラー:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      setSession(session)
      
      if (session?.user) {
        const userData = convertSupabaseUser(session.user)
        setUser(userData)
        await saveUserProfile(userData)
        
        if (event === 'SIGNED_IN') {
          await migrateFavorites(userData.id)
        }
      } else {
        setUser(null)
      }
      
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [convertSupabaseUser, saveUserProfile, migrateFavorites])

  const value: UserContextType = {
    user,
    session,
    loading,
    security,
    signInWithGoogle,
    signOut,
    updateProfile,
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

// HOC: 認証必須
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

// HOC: 権限チェック
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