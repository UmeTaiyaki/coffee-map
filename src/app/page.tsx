'use client'
import dynamic from 'next/dynamic'
import AddShopForm from '@/components/AddShopForm'
import { useState } from 'react'

// SSR（サーバーサイドレンダリング）を無効化（Leafletのため）
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-96 w-full bg-gray-100 animate-pulse rounded-lg" />
})

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0)

  // 店舗が追加されたときに地図を更新
  const handleShopAdded = () => {
    setRefreshKey(prev => prev + 1)
    // ページを再読み込みして地図を更新
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-gray-800 text-center">
            ☕ コーヒー豆マップ
          </h1>
          <p className="text-gray-600 text-center mt-2">
            全国のコーヒー豆専門店・焙煎所を探そう
          </p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 地図エリア */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                店舗マップ
              </h2>
              <Map key={refreshKey} />
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            <AddShopForm onShopAdded={handleShopAdded} />
            
            {/* 使い方ガイド */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                📖 使い方
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 地図上のマーカーをクリックすると店舗情報が表示されます</li>
                <li>• 新しい店舗を知っている場合は、左のフォームから登録できます</li>
                <li>• 住所は正確に入力すると、地図上の正しい位置に表示されます</li>
              </ul>
            </div>

            {/* 今後の機能予告 */}
            <div className="bg-blue-50 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-3 text-blue-800">
                🚀 今後追加予定の機能
              </h3>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• 店舗検索・フィルタ機能</li>
                <li>• 写真投稿機能</li>
                <li>• レビュー・評価機能</li>
                <li>• お気に入り機能</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600">
          <p>&copy; 2025 コーヒー豆マップ - コーヒー愛好家のためのプラットフォーム</p>
        </div>
      </footer>
    </div>
  )
}