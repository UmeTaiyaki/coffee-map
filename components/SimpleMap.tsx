// components/SimpleMap.tsx - シンプルな代替案
'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ShopWithDetails } from '../types/shop'

interface SimpleMapProps {
  refreshTrigger: number
}

export default function SimpleMap({ refreshTrigger }: SimpleMapProps) {
  const [shops, setShops] = useState<ShopWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchShops = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setShops(data || [])
      } catch (error) {
        console.error('店舗データ取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchShops()
  }, [refreshTrigger])

  if (loading) {
    return (
      <div className="h-[600px] glass rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <div className="text-xl font-medium text-gray-600 dark:text-gray-400">
            Coffee Map を読み込み中...
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            お気に入りのコーヒーショップを探しましょう
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="map-container">
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(45deg, rgba(111, 78, 55, 0.1), rgba(255, 140, 66, 0.1))',
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--current-text-secondary)' }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '1rem',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
            animation: 'float 3s ease-in-out infinite'
          }}>🗺️</div>
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            インタラクティブコーヒーマップ
          </div>
          <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
            マーカーをクリックして店舗詳細を確認
          </div>
        </div>
        
        {/* 模擬店舗マーカー */}
        {shops.slice(0, 5).map((shop, index) => {
          const positions = [
            { top: '20%', left: '25%' },
            { top: '35%', left: '60%' },
            { top: '25%', left: '75%' },
            { top: '60%', left: '30%' },
            { top: '70%', left: '65%' }
          ]
          
          return (
            <div
              key={shop.id}
              style={{
                position: 'absolute',
                ...positions[index],
                width: '40px',
                height: '40px',
                background: 'linear-gradient(45deg, var(--accent-warm), var(--accent-coffee))',
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                border: '3px solid white',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 4px 12px rgba(255, 140, 66, 0.4)',
                zIndex: 10,
                animation: `marker-appear 0.5s ease-out ${index * 0.1}s both`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(-45deg) scale(1.3)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 140, 66, 0.6)'
                e.currentTarget.style.zIndex = '20'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotate(-45deg) scale(1)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 140, 66, 0.4)'
                e.currentTarget.style.zIndex = '10'
              }}
              onClick={() => alert(`${shop.name}の詳細を表示`)}
            >
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(45deg)',
                fontSize: '1rem',
                color: 'white',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                ☕
              </div>
            </div>
          )
        })}
        
        {/* 現在地マーカー */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '45%',
          width: '24px',
          height: '24px',
          background: 'var(--accent-blue)',
          borderRadius: '50%',
          border: '3px solid white',
          animation: 'pulse-location 2s infinite',
          zIndex: 5,
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
        }} />
      </div>
    </div>
  )
}