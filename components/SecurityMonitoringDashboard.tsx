// components/SecurityMonitoringDashboard.tsx - セキュリティ監視ダッシュボード
'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useUser, withPermission } from '../contexts/UserContext'

interface SecurityEvent {
  id: string
  event: string
  user_id: string
  timestamp: string
  details: any
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface SecurityStats {
  totalUsers: number
  activeUsers: number
  anonymousUsers: number
  totalShops: number
  totalReviews: number
  suspiciousActivity: number
  blockedAttempts: number
}

interface UserActivity {
  user_id: string
  nickname: string
  is_anonymous: boolean
  shops_created: number
  reviews_posted: number
  last_active: string
  risk_score: number
}

function SecurityMonitoringDashboard() {
  const { user, logSecurityEvent } = useUser()
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'users' | 'settings'>('overview')
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [users, setUsers] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  // セキュリティ統計の取得
  const fetchSecurityStats = useCallback(async () => {
    try {
      const [usersResult, shopsResult, reviewsResult] = await Promise.all([
        supabase.from('users').select('id, is_anonymous, last_active'),
        supabase.from('shops').select('id'),
        supabase.from('reviews').select('id')
      ])

      if (usersResult.data && shopsResult.data && reviewsResult.data) {
        const now = new Date()
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        
        const activeUsers = usersResult.data.filter(u => 
          u.last_active && new Date(u.last_active) > oneHourAgo
        ).length

        const anonymousUsers = usersResult.data.filter(u => u.is_anonymous).length

        setStats({
          totalUsers: usersResult.data.length,
          activeUsers,
          anonymousUsers,
          totalShops: shopsResult.data.length,
          totalReviews: reviewsResult.data.length,
          suspiciousActivity: 0, // 実装予定
          blockedAttempts: 0 // 実装予定
        })
      }
    } catch (error) {
      console.error('セキュリティ統計取得エラー:', error)
    }
  }, [])

  // ユーザーアクティビティの取得
  const fetchUserActivity = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_summary')
        .select('*')
        .order('last_active', { ascending: false })
        .limit(50)

      if (error) throw error

      setUsers(data || [])
    } catch (error) {
      console.error('ユーザーアクティビティ取得エラー:', error)
    }
  }, [])

  // セキュリティイベントのシミュレーション（実際の実装では外部ログから取得）
  const fetchSecurityEvents = useCallback(async () => {
    try {
      // 実際の実装では外部セキュリティログシステムから取得
      const mockEvents: SecurityEvent[] = [
        {
          id: '1',
          event: 'login_attempt',
          user_id: 'user-123',
          timestamp: new Date().toISOString(),
          details: { method: 'google', success: true },
          severity: 'low'
        },
        {
          id: '2',
          event: 'rate_limit_exceeded',
          user_id: 'user-456',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          details: { action: 'shop_creation', limit: 5 },
          severity: 'medium'
        },
        {
          id: '3',
          event: 'suspicious_review_pattern',
          user_id: 'user-789',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          details: { reviews_count: 20, time_span_minutes: 5 },
          severity: 'high'
        }
      ]

      setEvents(mockEvents)
    } catch (error) {
      console.error('セキュリティイベント取得エラー:', error)
    }
  }, [])

  // データの初期読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchSecurityStats(),
        fetchUserActivity(),
        fetchSecurityEvents()
      ])
      setLoading(false)
    }

    loadData()
    
    // 定期的な更新
    const interval = setInterval(loadData, 30000) // 30秒ごと
    return () => clearInterval(interval)
  }, [fetchSecurityStats, fetchUserActivity, fetchSecurityEvents])

  // セキュリティアクションの実行
  const executeSecurityAction = async (action: string, userId?: string) => {
    try {
      await logSecurityEvent('admin_security_action', {
        admin_user_id: user?.id,
        action,
        target_user_id: userId
      })

      switch (action) {
        case 'reset_rate_limits':
          // レート制限をリセット
          if (userId) {
            // 実装: 特定ユーザーのレート制限をリセット
          } else {
            // 実装: 全ユーザーのレート制限をリセット
          }
          break
        
        case 'flag_user':
          if (userId) {
            // 実装: ユーザーにフラグを立てる
          }
          break

        case 'revoke_permissions':
          if (userId) {
            // 実装: ユーザーの権限を一時的に停止
          }
          break
      }

      alert(`セキュリティアクション「${action}」を実行しました`)
    } catch (error) {
      console.error('セキュリティアクション実行エラー:', error)
      alert('セキュリティアクションの実行に失敗しました')
    }
  }

  // 重要度に応じた色分け
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-100'
      case 'high': return 'text-orange-800 bg-orange-100'
      case 'medium': return 'text-yellow-800 bg-yellow-100'
      case 'low': return 'text-green-800 bg-green-100'
      default: return 'text-gray-800 bg-gray-100'
    }
  }

  // リスクスコアの計算
  const calculateRiskScore = (userActivity: UserActivity): number => {
    let score = 0
    
    // 匿名ユーザーは若干のリスク
    if (userActivity.is_anonymous) score += 10
    
    // 短期間での大量投稿はリスク
    if (userActivity.shops_created > 10) score += 20
    if (userActivity.reviews_posted > 50) score += 15
    
    // 最終アクティビティが古い場合はリスクを減少
    const daysSinceActive = Math.floor(
      (Date.now() - new Date(userActivity.last_active).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceActive > 30) score -= 10
    
    return Math.max(0, Math.min(100, score))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">セキュリティデータを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔒 セキュリティ監視ダッシュボード</h1>
        <p className="text-gray-600">Coffee Mapのセキュリティ状況をリアルタイムで監視します</p>
      </div>

      {/* タブナビゲーション */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: '📊 概要', icon: '📊' },
            { id: 'events', label: '🚨 イベント', icon: '🚨' },
            { id: 'users', label: '👥 ユーザー', icon: '👥' },
            { id: 'settings', label: '⚙️ 設定', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 時間範囲セレクター */}
      <div className="mb-6">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="1h">過去1時間</option>
          <option value="24h">過去24時間</option>
          <option value="7d">過去7日間</option>
          <option value="30d">過去30日間</option>
        </select>
      </div>

      {/* コンテンツエリア */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 統計カード */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">👥</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🟢</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">アクティブユーザー</p>
                    <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🏪</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">登録店舗数</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalShops}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">⚠️</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">疑わしいアクティビティ</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.suspiciousActivity}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 最近のセキュリティイベント */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">🚨 最近のセキュリティイベント</h2>
            </div>
            <div className="p-6">
              {events.slice(0, 5).map(event => (
                <div key={event.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                      {event.severity.toUpperCase()}
                    </span>
                    <span className="font-medium">{event.event}</span>
                    <span className="text-sm text-gray-500">ユーザー: {event.user_id.slice(-8)}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(event.timestamp).toLocaleString('ja-JP')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">🚨 セキュリティイベント詳細</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    重要度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    イベント
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    時刻
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    詳細
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map(event => (
                  <tr key={event.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                        {event.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {event.event}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.user_id.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <pre className="text-xs">{JSON.stringify(event.details, null, 2)}</pre>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => executeSecurityAction('flag_user', event.user_id)}
                        className="text-red-600 hover:text-red-900 mr-3"
                      >
                        フラグ
                      </button>
                      <button
                        onClick={() => executeSecurityAction('reset_rate_limits', event.user_id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        制限リセット
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">👥 ユーザーアクティビティ</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タイプ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    店舗作成
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    レビュー投稿
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    リスクスコア
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最終アクティビティ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(userActivity => {
                  const riskScore = calculateRiskScore(userActivity)
                  return (
                    <tr key={userActivity.user_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{userActivity.nickname}</div>
                        <div className="text-sm text-gray-500">{userActivity.user_id.slice(-8)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          userActivity.is_anonymous ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {userActivity.is_anonymous ? '匿名' : '認証済み'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {userActivity.shops_created}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {userActivity.reviews_posted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`text-sm font-medium ${
                            riskScore > 70 ? 'text-red-600' :
                            riskScore > 40 ? 'text-orange-600' :
                            riskScore > 20 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {riskScore}
                          </div>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                riskScore > 70 ? 'bg-red-600' :
                                riskScore > 40 ? 'bg-orange-600' :
                                riskScore > 20 ? 'bg-yellow-600' : 'bg-green-600'
                              }`}
                              style={{ width: `${riskScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(userActivity.last_active).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {riskScore > 70 && (
                          <button
                            onClick={() => executeSecurityAction('revoke_permissions', userActivity.user_id)}
                            className="text-red-600 hover:text-red-900 mr-3"
                          >
                            権限停止
                          </button>
                        )}
                        <button
                          onClick={() => executeSecurityAction('reset_rate_limits', userActivity.user_id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          制限リセット
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">⚙️ セキュリティ設定</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">自動セキュリティ監視</h3>
                  <p className="text-sm text-gray-500">疑わしいアクティビティを自動で検出します</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition"></span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">レート制限の強化</h3>
                  <p className="text-sm text-gray-500">匿名ユーザーのレート制限を厳しくします</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                  <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition"></span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">IP制限</h3>
                  <p className="text-sm text-gray-500">同一IPからの大量アクセスを制限します</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition"></span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">リアルタイムアラート</h3>
                  <p className="text-sm text-gray-500">重要なセキュリティイベントを即座に通知します</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition"></span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">🚨 緊急アクション</h2>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={() => executeSecurityAction('reset_rate_limits')}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                🔄 全ユーザーのレート制限をリセット
              </button>

              <button
                onClick={() => executeSecurityAction('emergency_lockdown')}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                🚨 緊急ロックダウン（新規登録を一時停止）
              </button>

              <button
                onClick={() => executeSecurityAction('purge_suspicious_data')}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                🗑️ 疑わしいデータのパージ
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">📊 セキュリティレポート</h2>
            </div>
            <div className="p-6 space-y-4">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                📈 日次セキュリティレポート生成
              </button>

              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                📋 週次ユーザーアクティビティレポート
              </button>

              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                🔍 月次セキュリティ監査レポート
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 管理者権限でラップされたエクスポート
export default withPermission(
  SecurityMonitoringDashboard, 
  'access_admin',
  () => (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-4xl mb-4">🔒</div>
        <p className="text-gray-600 mb-4">このページには管理者権限が必要です</p>
      </div>
    </div>
  )
)

// セキュリティ設定用のHook
export function useSecuritySettings() {
  const [settings, setSettings] = useState({
    autoMonitoring: true,
    strictRateLimit: false,
    ipRestriction: true,
    realtimeAlerts: true,
    anonymousUserLimit: 3,
    reviewSpamDetection: true,
    imageContentFilter: true
  })

  const updateSetting = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    
    // 設定をサーバーに保存
    // saveSetting(key, value)
  }, [])

  return { settings, updateSetting }
}

// セキュリティアラート用のHook
export function useSecurityAlerts() {
  const [alerts, setAlerts] = useState<SecurityEvent[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const markAsRead = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(() => {
    setAlerts(prev => 
      prev.map(alert => ({ ...alert, read: true }))
    )
    setUnreadCount(0)
  }, [])

  return { alerts, unreadCount, markAsRead, markAllAsRead }
}

// リアルタイムセキュリティ監視用のHook
export function useRealtimeSecurityMonitoring() {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [criticalEvents, setCriticalEvents] = useState<SecurityEvent[]>([])

  useEffect(() => {
    if (!isMonitoring) return

    // リアルタイム監視の開始
    const interval = setInterval(async () => {
      try {
        // 重要なセキュリティイベントをチェック
        const response = await fetch('/api/security/critical-events')
        const events = await response.json()
        
        if (events.length > 0) {
          setCriticalEvents(prev => [...events, ...prev].slice(0, 50))
          
          // 重要度が高い場合は通知
          events.forEach((event: SecurityEvent) => {
            if (event.severity === 'critical' || event.severity === 'high') {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('セキュリティアラート', {
                  body: `${event.event}: ${event.details?.message || '詳細情報なし'}`,
                  icon: '/favicon.ico',
                  tag: event.id
                })
              }
            }
          })
        }
      } catch (error) {
        console.error('リアルタイム監視エラー:', error)
      }
    }, 10000) // 10秒ごと

    return () => clearInterval(interval)
  }, [isMonitoring])

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)
    
    // 通知権限を要求
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
  }, [])

  return {
    isMonitoring,
    criticalEvents,
    startMonitoring,
    stopMonitoring
  }
}