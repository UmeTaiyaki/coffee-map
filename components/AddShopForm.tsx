'use client'
import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'

// Leafletのアイコン問題を解決
const AdjustableIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" width="32px" height="32px">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

// Geolonia Community Geocoder のタイプ定義
interface GeoloniaLatLng {
  lat: number
  lng: number
}

// Geolonia API関数の型定義
declare global {
  interface Window {
    getLatLng: (
      address: string,
      callback: (latlng: GeoloniaLatLng) => void,
      errorCallback?: (error: Error) => void
    ) => void
  }
}

interface AddShopFormProps {
  onShopAdded?: () => void
}

// ドラッグ可能マーカーコンポーネント
function DraggableMarker({ 
  position, 
  onPositionChange 
}: { 
  position: [number, number]
  onPositionChange: (lat: number, lng: number) => void 
}) {
  const markerRef = useRef<L.Marker>(null)
  
  const eventHandlers = {
    dragend() {
      const marker = markerRef.current
      if (marker != null) {
        const newPos = marker.getLatLng()
        onPositionChange(newPos.lat, newPos.lng)
      }
    },
  }

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={AdjustableIcon}
    >
      <Popup>
        <div className="text-center">
          <strong>📍 店舗位置</strong>
          <br />
          <small>ドラッグして位置を調整できます</small>
          <br />
          <small>緯度: {position[0].toFixed(6)}</small>
          <br />
          <small>経度: {position[1].toFixed(6)}</small>
        </div>
      </Popup>
    </Marker>
  )
}

// 地図クリックハンドラーコンポーネント
function MapClickHandler({ 
  onLocationSelect 
}: { 
  onLocationSelect: (lat: number, lng: number) => void 
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function AddShopForm({ onShopAdded }: AddShopFormProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [geocodingStatus, setGeocodingStatus] = useState<string>('')
  const [showMap, setShowMap] = useState(false)
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6762, 139.6503]) // 東京駅

  // Geolonia Community Geocoder のスクリプトを読み込み
  useEffect(() => {
    if (document.getElementById('geolonia-geocoder')) {
      return
    }

    const script = document.createElement('script')
    script.id = 'geolonia-geocoder'
    script.src = 'https://cdn.geolonia.com/community-geocoder.js'
    script.async = true
    script.onload = () => {
      console.log('Geolonia Community Geocoder が読み込まれました')
    }
    script.onerror = () => {
      console.error('Geolonia Community Geocoder の読み込みに失敗しました')
    }
    document.head.appendChild(script)

    return () => {
      const existingScript = document.getElementById('geolonia-geocoder')
      if (existingScript) {
        document.head.removeChild(existingScript)
      }
    }
  }, [])

  // 住所から座標を取得してマップを表示
  const handleGeocodeAndShowMap = () => {
    if (!address.trim()) {
      alert('住所を入力してください')
      return
    }

    if (!window.getLatLng) {
      alert('Geolonia Community Geocoder が読み込まれていません。しばらく待ってから再試行してください。')
      return
    }

    setGeocodingStatus('住所を解析しています...')
    
    window.getLatLng(
      address.trim(),
      (latlng) => {
        console.log('Geolonia で取得した座標:', latlng)
        setMarkerPosition([latlng.lat, latlng.lng])
        setMapCenter([latlng.lat, latlng.lng])
        setShowMap(true)
        setGeocodingStatus(`✅ 座標を取得しました！地図上で位置を微調整してください`)
      },
      (error) => {
        console.error('Geolonia geocoding error:', error)
        setGeocodingStatus('❌ 住所の解析に失敗しました。住所をより詳しく入力してください。')
      }
    )
  }

  // マーカー位置が変更された時のハンドラー
  const handleMarkerPositionChange = (lat: number, lng: number) => {
    setMarkerPosition([lat, lng])
    setGeocodingStatus(`📍 位置を調整しました (緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)})`)
  }

  // 地図クリックで位置変更
  const handleMapClick = (lat: number, lng: number) => {
    setMarkerPosition([lat, lng])
    setGeocodingStatus(`📍 新しい位置を選択しました (緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)})`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!markerPosition) {
      alert('まず住所を検索して、地図上で位置を確認してください')
      return
    }

    setIsSubmitting(true)

    try {
      const [lat, lng] = markerPosition
      
      console.log('データベースに保存中...', { lat, lng })
      
      // idを明示的に除外して挿入
      const shopData = {
        name: name.trim(),
        address: address.trim(),
        description: description.trim() || null,
        latitude: lat,
        longitude: lng
      }
      
      console.log('挿入するデータ:', shopData)
      
      const { data, error } = await supabase
        .from('shops')
        .insert([shopData])
        .select('id, name, address, description, latitude, longitude')
      
      if (error) {
        console.error('Database error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        
        if (error.message.includes('duplicate key') || error.message.includes('pkey')) {
          alert(
            '店舗の登録に失敗しました。\n\n' +
            'データベースの主キー重複エラーです。\n' +
            'Supabaseダッシュボードで以下のSQLを実行してください：\n\n' +
            'SELECT setval(\'shops_id_seq\', COALESCE((SELECT MAX(id) FROM shops), 0) + 1, false);\n\n' +
            'または、既存のshopsテーブルをクリアしてください。\n\n' +
            'エラー詳細: ' + error.message
          )
        } else if (error.message.includes('row-level security') || error.message.includes('RLS')) {
          alert(
            '店舗の登録に失敗しました。\n\n' +
            'データベースのセキュリティ設定が原因です。\n' +
            'Supabaseダッシュボードで以下を確認してください：\n\n' +
            '1. Table Editor → shops テーブル\n' +
            '2. 設定で「Enable RLS」を無効化\n' +
            'または適切なRLSポリシーを設定\n\n' +
            'エラー詳細: ' + error.message
          )
        } else {
          alert('店舗の登録に失敗しました: ' + error.message)
        }
      } else {
        console.log('店舗が登録されました:', data)
        // フォームリセット
        setName('')
        setAddress('')
        setDescription('')
        setGeocodingStatus('')
        setShowMap(false)
        setMarkerPosition(null)
        alert('店舗を登録しました！地図に反映されます。')
        
        if (onShopAdded) {
          onShopAdded()
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('予期しないエラーが発生しました: ' + error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">新しい店舗を追加</h2>
      
      {/* Geolonia のクレジット表示 */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-xs text-blue-700">
          住所の座標変換には <a href="https://community-geocoder.geolonia.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Geolonia Community Geocoder</a> を使用しています
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            店舗名 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            placeholder="例: 青山コーヒー焙煎所"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            住所 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="address"
              type="text"
              placeholder="例: 大阪府大阪市北区角田町9-26 新梅田食道街"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="flex-1 p-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
              required
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={handleGeocodeAndShowMap}
              disabled={!address.trim() || isSubmitting}
              className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              🗺️ 地図で確認
            </button>
          </div>
          
          {/* 座標取得ステータス表示 */}
          {geocodingStatus && (
            <p className="text-sm mt-1 text-blue-600 font-medium">
              {geocodingStatus}
            </p>
          )}
        </div>

        {/* 地図表示エリア */}
        {showMap && markerPosition && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h4 className="text-sm font-medium text-gray-800 mb-3">🗺️ 位置を確認・調整してください</h4>
            <div className="h-80 w-full rounded-md overflow-hidden border-2 border-gray-300">
              <MapContainer 
                center={mapCenter}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <DraggableMarker 
                  position={markerPosition} 
                  onPositionChange={handleMarkerPositionChange}
                />
                <MapClickHandler onLocationSelect={handleMapClick} />
              </MapContainer>
            </div>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="text-sm text-yellow-800">
                <div className="font-medium mb-1">📍 操作方法:</div>
                <div className="text-xs space-y-1">
                  <div>• 赤いピンをドラッグして正確な位置に移動</div>
                  <div>• または地図をクリックして位置を変更</div>
                  <div>• 位置が決まったら下の「店舗を登録」ボタンをクリック</div>
                </div>
              </div>
            </div>
            {markerPosition && (
              <div className="mt-2 text-xs text-gray-600">
                現在の座標: 緯度 {markerPosition[0].toFixed(6)}, 経度 {markerPosition[1].toFixed(6)}
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            説明・特徴
          </label>
          <textarea
            id="description"
            placeholder="例: 新梅田食道街の奥にある隠れ家的なコーヒー専門店"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-md h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
            disabled={isSubmitting}
          />
        </div>

        <button 
          type="submit"
          disabled={isSubmitting || !name.trim() || !address.trim() || !markerPosition}
          className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg shadow-md"
        >
          {isSubmitting ? '📍 登録中...' : !markerPosition ? '🗺️ まず地図で位置を確認してください' : '🏪 店舗を登録'}
        </button>
      </form>

      {/* ヘルプセクション */}
      <div className="mt-4 space-y-3">        
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-sm font-medium text-green-800 mb-2">🎯 精度向上の流れ</h4>
          <div className="text-xs text-green-700 space-y-1">
            <div>1. 住所を入力して「🗺️ 地図で確認」をクリック</div>
            <div>2. Geoloniaで大まかな位置を取得</div>
            <div>3. 地図上で赤いピンをドラッグして正確な位置に調整</div>
            <div>4. 位置が決まったら店舗情報を登録</div>
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 住所入力のコツ</h4>
          <div className="text-xs text-blue-700 space-y-1">
            <div>• 建物名や施設名も含める（例: ○○食道街、○○ビル）</div>
            <div>• 「大阪府大阪市北区角田町9-26 新梅田食道街」のように詳しく</div>
            <div>• 地図で微調整できるので、大まかな住所でもOK</div>
          </div>
        </div>
      </div>
    </div>
  )
}