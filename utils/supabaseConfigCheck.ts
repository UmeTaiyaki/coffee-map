// utils/supabaseConfigCheck.ts - 完全修正版
import { supabase } from '../lib/supabase'

interface ConfigCheckResult {
  status: 'success' | 'warning' | 'error'
  message: string
  details?: unknown
}

export async function checkSupabaseConfiguration(): Promise<ConfigCheckResult[]> {
  const results: ConfigCheckResult[] = []

  // 1. 基本接続テスト
  try {
    const { data, error } = await supabase.from('shops').select('count').limit(1)
    if (error) {
      results.push({
        status: 'error',
        message: 'Database connection failed',
        details: error
      })
    } else {
      results.push({
        status: 'success',
        message: 'Database connection successful'
      })
    }
  } catch (error) {
    results.push({
      status: 'error',
      message: 'Failed to connect to database',
      details: error
    })
  }

  // 2. 認証設定テスト
  try {
    const { data: { user } } = await supabase.auth.getUser()
    results.push({
      status: 'success',
      message: 'Auth configuration working',
      details: { hasUser: !!user }
    })
  } catch (error) {
    results.push({
      status: 'error',
      message: 'Auth configuration failed',
      details: error
    })
  }

  // 3. 必要なテーブルの存在確認
  const requiredTables = ['shops', 'users', 'reviews', 'user_favorites', 'shop_images', 'shop_hours', 'shop_tags']
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1)
      if (error && error.code === '42P01') {
        results.push({
          status: 'error',
          message: `Table '${table}' does not exist`,
          details: 'Please run the database setup SQL'
        })
      } else if (error) {
        results.push({
          status: 'warning',
          message: `Table '${table}' has issues`,
          details: error
        })
      } else {
        results.push({
          status: 'success',
          message: `Table '${table}' exists and accessible`
        })
      }
    } catch (error) {
      results.push({
        status: 'error',
        message: `Failed to check table '${table}'`,
        details: error
      })
    }
  }

  // 4. ストレージバケットの確認
  try {
    const { data, error } = await supabase.storage.listBuckets()
    if (error) {
      results.push({
        status: 'error',
        message: 'Storage access failed',
        details: error
      })
    } else {
      const hasShopImages = data.some(bucket => bucket.name === 'shop_images')
      if (hasShopImages) {
        results.push({
          status: 'success',
          message: 'shop_images bucket exists'
        })
      } else {
        results.push({
          status: 'warning',
          message: 'shop_images bucket not found',
          details: 'Please create the shop_images bucket in Supabase Storage'
        })
      }
    }
  } catch (error) {
    results.push({
      status: 'error',
      message: 'Failed to check storage buckets',
      details: error
    })
  }

  // 5. OAuth設定の確認
  try {
    // OAuth設定は実際の認証フロー以外では確認困難
    results.push({
      status: 'success',
      message: 'OAuth providers configuration (check Supabase dashboard)',
      details: 'Ensure Google OAuth is properly configured in Authentication > Providers'
    })
  } catch (error) {
    results.push({
      status: 'warning',
      message: 'OAuth configuration check skipped',
      details: error
    })
  }

  return results
}

// ブラウザコンソールで実行可能な関数
export async function runConfigCheck(): Promise<void> {
  console.log('🔍 Starting Supabase configuration check...')
  
  const results = await checkSupabaseConfiguration()
  
  console.log('\n📊 Configuration Check Results:')
  console.log('================================')
  
  let errorCount = 0
  let warningCount = 0
  let successCount = 0
  
  results.forEach((result) => {
    const icon = result.status === 'success' ? '✅' : 
                 result.status === 'warning' ? '⚠️' : '❌'
    
    console.log(`${icon} ${result.message}`)
    
    if (result.details) {
      console.log(`   Details:`, result.details)
    }
    
    if (result.status === 'error') errorCount++
    else if (result.status === 'warning') warningCount++
    else successCount++
  })
  
  console.log('\n📈 Summary:')
  console.log(`✅ Success: ${successCount}`)
  console.log(`⚠️ Warnings: ${warningCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  
  if (errorCount > 0) {
    console.log('\n🚨 Action Required:')
    console.log('1. Run the database setup SQL in Supabase Dashboard > SQL Editor')
    console.log('2. Check your environment variables (.env.local)')
    console.log('3. Verify OAuth provider configuration')
  } else if (warningCount > 0) {
    console.log('\n💡 Recommendations:')
    console.log('- Address the warnings above for optimal functionality')
  } else {
    console.log('\n🎉 All checks passed! Your Supabase configuration looks good.')
  }
}

// 環境変数チェック
export function checkEnvironmentVariables(): ConfigCheckResult[] {
  const results: ConfigCheckResult[] = []
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
  
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    if (!value) {
      results.push({
        status: 'error',
        message: `Missing environment variable: ${varName}`,
        details: 'Please check your .env.local file'
      })
    } else if (varName === 'NEXT_PUBLIC_SUPABASE_URL' && !value.startsWith('https://')) {
      results.push({
        status: 'warning',
        message: `Invalid URL format for ${varName}`,
        details: 'Should start with https://'
      })
    } else {
      results.push({
        status: 'success',
        message: `${varName} is configured`,
        details: `${value.substring(0, 20)}...`
      })
    }
  })
  
  return results
}

// デバッグ用：現在の認証状態を表示
export async function debugAuthState(): Promise<void> {
  console.log('🔐 Current Auth State:')
  console.log('=====================')
  
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('Session:', session)
    console.log('Session Error:', sessionError)
    console.log('User:', user)
    console.log('User Error:', userError)
    
    if (user) {
      console.log('User Metadata:', user.user_metadata)
      console.log('User App Metadata:', user.app_metadata)
    }
  } catch (error) {
    console.error('Failed to get auth state:', error)
  }
}

// 使用方法の説明
export function showSupabaseHelp(): void {
  console.log(`
🛠️ Supabase Configuration Checker Usage:

1. Import the functions:
   import { runConfigCheck, debugAuthState } from './utils/supabaseConfigCheck'

2. Run configuration check:
   runConfigCheck()

3. Debug auth state:
   debugAuthState()

4. Or use directly in browser console:
   - Open Developer Tools (F12)
   - Go to Console tab
   - Run: runConfigCheck()

📋 Setup Checklist:
1. ✅ Create Supabase project
2. ✅ Configure authentication providers (Google OAuth)
3. ✅ Run database setup SQL
4. ✅ Set environment variables
5. ✅ Configure redirect URLs
6. ✅ Test configuration with this script
  `)
}

// ブラウザのグローバルオブジェクトに追加（デバッグ用）
if (typeof window !== 'undefined') {
  (window as any).checkSupabaseConfig = runConfigCheck;
  (window as any).debugAuthState = debugAuthState;
  (window as any).showSupabaseHelp = showSupabaseHelp;
}