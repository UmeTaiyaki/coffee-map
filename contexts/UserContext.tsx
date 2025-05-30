// contexts/UserContext.tsx - 認証処理最適化版
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

  // レート制限チェック（簡素化）
  const isRateLimited = useCallback((action: string): boolean => {
    if (!user) return true
    
    const key = `rate_limit_${action}_${user.id}`
    const stored = localStorage.getItem(key)
    
    if (!stored) {
      localStorage.setItem(key, JSON.stringify({ count: 1, timestamp: Date.now() }))
      return false
    }
    
    try {
      const data = JSON.parse(stored)
      const now = Date.now()
      const hourAgo = now - (60 * 60 * 1000)
      
      if (data.timestamp < hourAgo) {
        localStorage.setItem(key, JSON.stringify({ count: 1, timestamp: now }))
        return false
      }
      
      const limits: Record<string, number> = {
        'SHOP_CREATION': 5,
        'REVIEW_CREATION': 20,
        'PROFILE_UPDATES': 10
      }
      
      const limit = limits[action.toUpperCase()] || 10
      if (data.count >= limit) return true
      
      localStorage.setItem(key, JSON.stringify({ count: data.count + 1, timestamp: data.timestamp }))
      return false
    } catch {
      return false
    }
  }, [user])

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

  // Supabaseユーザーを内部User型に変換（軽量化）
  const convertSupabaseUser = useCallback((supabaseUser: SupabaseUser, isAnonymous = false): User => {
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
  }, [])

  // セキュリティイベントのログ（非同期処理を避ける）
  const logSecurityEvent = useCallback(async (event: string, details?: any): Promise<void> => {
    // 開発環境のみログ出力
    if (process.env.NODE_ENV === 'development') {
      console.log('Security Event:', event, details)
    }
  }, [])

  // ユーザープロファイルをデータベースに保存（非同期で実行）
  const saveUserProfile = useCallback(async (userData: User): Promise<void> => {
    // バックグラウンドで実行
    setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('users')
          .upsert({
            id: userData.id,
            email: userData.email,
            nickname: sanitizeInput(userData.nickname || ''),
            avatar_url: userData.avatar_url,
            full_name: sanitizeInput(userData.full_name || ''),
            is_anonymous: userData.is_anonymous,
            last_active: new Date().toISOString()
          }, {
            onConflict: 'id'
          })

        if (error && error.code !== '42P01') {
          console.warn('User profile save error:', error)
        }
      } catch (error) {
        console.warn('User profile save error:', error)
      }
    }, 100)
  }, [])

  // お気に入りをローカルストレージからデータベースに移行（バックグラウンド）
  const migrateFavorites = useCallback(async (userId: string): Promise<void> => {
    setTimeout(async () => {
      try {
        const localFavorites = localStorage.getItem('coffee-map-favorites')
        if (!localFavorites) return

        const favoriteIds = JSON.parse(localFavorites) as number[]
        if (favoriteIds.length === 0) return

        // バッチ処理で移行
        const favoritesData = favoriteIds.map(shopId => ({
          user_id: userId,
          shop_id: shopId
        }))

        await supabase
          .from('user_favorites')
          .upsert(favoritesData, { onConflict: 'user_id,shop_id' })

        localStorage.removeItem('coffee-map-favorites')
      } catch (error) {
        console.warn('Favorites migration error:', error)
      }
    }, 1000)
  }, [])

  // Googleサインイン
  const signInWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true)
      
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

      if (error) throw error
    } catch (error) {
      console.error('Googleサインインエラー:', error)
      setLoading(false)
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
      
      const { data, error } = await supabase.auth.signInAnonymously()
      
      if (error) throw error
      
      if (data.user) {
        await supabase.auth.updateUser({
          data: { 
            nickname: sanitizedNickname,
            is_anonymous: true
          }
        })

        const userData = convertSupabaseUser(data.user, true)
        userData.nickname = sanitizedNickname
        
        setUser(userData)
        setLoading(false)
        
        // バックグラウンドで処理
        saveUserProfile(userData)
        migrateFavorites(userData.id)
      }
    } catch (error) {
      console.error('匿名サインインエラー:', error)
      throw new Error('匿名サインインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // サインアウト（修正版）
  const signOut = async (): Promise<void> => {
    try {
      // すぐにユーザー情報をクリア
      setUser(null)
      setSession(null)
      
      // バックグラウンドでサインアウト処理
      await supabase.auth.signOut()
    } catch (error) {
      console.error('サインアウトエラー:', error)
      // エラーでも状態はクリア済みなので問題なし
    }
  }

  // プロファイル更新
  const updateProfile = async (data: Partial<User>): Promise<void> => {
    if (!user) throw new Error('ユーザーがサインインしていません')

    try {
      const sanitizedData = {
        nickname: data.nickname ? sanitizeInput(data.nickname) : undefined,
        full_name: data.full_name ? sanitizeInput(data.full_name) : undefined,
        ...data
      }

      await supabase.auth.updateUser({
        data: {
          nickname: sanitizedData.nickname,
          full_name: sanitizedData.full_name
        }
      })

      const updatedUser = { ...user, ...sanitizedData }
      setUser(updatedUser)
      saveUserProfile(updatedUser)
    } catch (error) {
      console.error('プロファイル更新エラー:', error)
      throw new Error('プロフィールの更新に失敗しました')
    }
  }

  // 匿名ユーザーから正式ユーザーへのアップグレード
  const upgradeFromAnonymous = async (): Promise<void> => {
    if (!user || !user.is_anonymous) {
      throw new Error('匿名ユーザーではありません')
    }

    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('アカウントアップグレードエラー:', error)
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
        saveUserProfile(userData)
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

  // 認証状態の監視（最適化版）
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        // セッション取得
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return

        setSession(session)
        
        if (session?.user) {
          const isAnonymous = session.user.is_anonymous || false
          const userData = convertSupabaseUser(session.user, isAnonymous)
          setUser(userData)
          
          // バックグラウンド処理
          if (!isAnonymous) {
            migrateFavorites(userData.id)
          }
          saveUserProfile(userData)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) {
          setLoading(false)
          setAuthInitialized(true)
        }
      }
    }

    initAuth()

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted || !authInitialized) return
        
        setSession(session)
        
        if (session?.user) {
          const isAnonymous = session.user.is_anonymous || false
          const userData = convertSupabaseUser(session.user, isAnonymous)
          setUser(userData)
          
          if (event === 'SIGNED_IN' && !isAnonymous) {
            migrateFavorites(userData.id)
          }
          saveUserProfile(userData)
        } else {
          setUser(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [authInitialized, convertSupabaseUser, migrateFavorites, saveUserProfile])

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

// HOC（変更なし）
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