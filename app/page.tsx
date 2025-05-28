'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// 地図コンポーネントを動的インポート（SSRを無効化）
const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-gray-500">🗺️ 地図を読み込み中...</div>
    </div>
  )
})

// AddShopFormも動的インポート
const AddShopForm = dynamic(() => import('../components/AddShopForm'), {
  ssr: false,
  loading: () => (
    <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4"></div>
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
})

export default function Home() {
  const [shops, setShops] = useState([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isClient, setIsClient] = useState(false)

  // クライアントサイドでのみレンダリング
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleShopAdded = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  // サーバーサイドでは基本的なHTMLを返す
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">☕ Coffee Map</h1>
            <p className="text-gray-600">あなたの街のコーヒーショップを発見・共有しよう</p>
          </header>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">店舗マップ</h2>
                <div className="h-96 w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
                  <div className="text-gray-500">🗺️ 地図を読み込み中...</div>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-24 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">☕ Coffee Map</h1>
          <p className="text-gray-600">あなたの街のコーヒーショップを発見・共有しよう</p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">店舗マップ</h2>
              <Map refreshTrigger={refreshTrigger} />
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <AddShopForm onShopAdded={handleShopAdded} />
          </div>
        </div>
      </div>
    </div>
  )
}