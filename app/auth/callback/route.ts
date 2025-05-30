// app/auth/callback/route.ts - 無限ローディング修正版
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// サーバーサイド用のSupabaseクライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const error = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')
    const origin = requestUrl.origin

    console.log('OAuth callback received:', { code: !!code, error, errorDescription })

    // エラーがある場合
    if (error) {
      console.error('OAuth Error:', error, errorDescription)
      const errorMessage = encodeURIComponent(errorDescription || error)
      return NextResponse.redirect(`${origin}/?auth_error=${errorMessage}`)
    }

    // 認証コードがない場合（ログイン成功後の通常リダイレクト）
    if (!code) {
      console.log('No code - redirecting to home')
      return NextResponse.redirect(`${origin}/`)
    }

    // 認証コードをセッションに交換
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Session exchange error:', sessionError)
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(sessionError.message)}`)
    }

    if (!data.user) {
      console.error('No user data received after session exchange')
      return NextResponse.redirect(`${origin}/?auth_error=no_user_data`)
    }

    console.log('Auth success:', {
      user_id: data.user.id,
      email: data.user.email,
      is_anonymous: data.user.is_anonymous
    })

    // 認証成功 - ホームページにリダイレクト（フラグメントを除去）
    return NextResponse.redirect(`${origin}/?auth_success=true`)

  } catch (error) {
    console.error('Auth callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const origin = new URL(request.url).origin
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(errorMessage)}`)
  }
}