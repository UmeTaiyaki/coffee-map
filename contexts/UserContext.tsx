// contexts/UserContext.tsx
'use client'
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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
}

// コンテキスト型定義
interface UserContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInAnonymously: (nickname: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  upgradeFromAnonymous: () => Promise<void>
  refreshUser: () => Promise<void>
}

// コンテキスト作成
const UserContext = createContext<UserContextType | undefined>(undefined)

// プロバイダーコンポーネント
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

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
      last_active: new Date().toISOString()
    }
  }

  // ユーザープロファイルをデータベースに保存/更新
  const saveUserProfile = async (userData: User) => {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userData.id,
          email: userData.email,
          nickname: userData.nickname,
          avatar_url: userData.avatar_url,
          full_name: userData.full_name,
          is_anonymous: userData.is_anonymous,
          last_active: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (error) {
        console.error('ユーザープロファイル保存エラー:', error)
      }
    } catch (error) {
      console.error('ユーザープロファイル保存エラー:', error)
    }
  }

  // お気に入りをローカルストレージからデータベースに移行
  const migrateFavorites = async (userId: string) => {
    try {
      const localFavorites = localStorage.getItem('coffee-map-favorites')
      if (localFavorites) {
        const favoriteIds = JSON.parse(localFavorites) as number[]
        
        if (favoriteIds.length > 0) {
          const favoritesData = favoriteIds.map(shopId => ({
            user_id: userId,
            shop_id: shopId
          }))

          const { error } = await supabase
            .from('user_favorites')
            .upsert(favoritesData, { onConflict: 'user_id,shop_id' })

          if (!error) {
            localStorage.removeItem('coffee-map-favorites')
            console.log('お気に入り移行完了:', favoriteIds.length, '件')
          }
        }
      }
    } catch (error) {
      console.error('お気に入り移行エラー:', error)
    }
  }

  // Googleサインイン
  const signInWithGoogle = async () => {
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

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Googleサインインエラー:', error)
      throw new Error('Googleサインインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 匿名サインイン
  const signInAnonymously = async (nickname: string) => {
    try {
      setLoading(true)
      
      // Supabaseの匿名認証
      const { data, error } = await supabase.auth.signInAnonymously()
      
      if (error) throw error
      
      if (data.user) {
        // ニックネームをメタデータに保存
        const { error: updateError } = await supabase.auth.updateUser({
          data: { 
            nickname: nickname.trim(),
            is_anonymous: true
          }
        })

        if (updateError) {
          console.error('匿名ユーザーメタデータ更新エラー:', updateError)
        }

        const userData = convertSupabaseUser(data.user, true)
        userData.nickname = nickname.trim()
        
        setUser(userData)
        await saveUserProfile(userData)
        await migrateFavorites(userData.id)
      }
    } catch (error) {
      console.error('匿名サインインエラー:', error)
      throw new Error('匿名サインインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // サインアウト
  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error
      
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('サインアウトエラー:', error)
      throw new Error('サインアウトに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // プロファイル更新
  const updateProfile = async (data: Partial<User>) => {
    if (!user) throw new Error('ユーザーがサインインしていません')

    try {
      setLoading(true)

      // Supabaseのユーザーメタデータを更新
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          nickname: data.nickname,
          full_name: data.full_name
        }
      })

      if (authError) throw authError

      // ローカル状態を更新
      const updatedUser = { ...user, ...data }
      setUser(updatedUser)

      // データベースのプロファイルを更新
      await saveUserProfile(updatedUser)

    } catch (error) {
      console.error('プロファイル更新エラー:', error)
      throw new Error('プロファイルの更新に失敗しました')
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
      // Googleサインインを実行
      await signInWithGoogle()
    } catch (error) {
      console.error('アカウントアップグレードエラー:', error)
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

  // 認証状態の監視
  useEffect(() => {
    // 現在のセッションを取得
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('セッション取得エラー:', error)
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
        }
      } catch (error) {
        console.error('初期セッション取得エラー:', error)
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
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value: UserContextType = {
    user,
    session,
    loading,
    signInWithGoogle,
    signInAnonymously,
    signOut,
    updateProfile,
    upgradeFromAnonymous,
    refreshUser
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

// 認証が必要なコンポーネント用のHOC
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