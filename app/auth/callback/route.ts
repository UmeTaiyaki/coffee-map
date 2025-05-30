// app/auth/callback/route.ts - 完全修正版
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

    // エラーがある場合
    if (error) {
      console.error('OAuth Error:', error, errorDescription)
      const errorMessage = encodeURIComponent(errorDescription || error)
      return NextResponse.redirect(`${origin}/?error=oauth_error&message=${errorMessage}`)
    }

    // 認証コードがない場合
    if (!code) {
      console.error('No authorization code received')
      return NextResponse.redirect(`${origin}/?error=no_code`)
    }

    // 認証コードをセッションに交換
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Session exchange error:', sessionError)
      return NextResponse.redirect(`${origin}/?error=session_error&message=${encodeURIComponent(sessionError.message)}`)
    }

    if (!data.user) {
      console.error('No user data received after session exchange')
      return NextResponse.redirect(`${origin}/?error=no_user_data`)
    }

    console.log('Auth success:', {
      user_id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata
    })

    // 認証成功 - ユーザープロファイル作成は フロントエンドで処理
    return NextResponse.redirect(`${origin}/?auth=success`)

  } catch (error) {
    console.error('Auth callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const origin = new URL(request.url).origin
    return NextResponse.redirect(`${origin}/?error=callback_error&message=${encodeURIComponent(errorMessage)}`)
  }
}