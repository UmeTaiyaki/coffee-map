'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
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

// アニメーション用のスタイル
const animationStyles = {
  fadeIn: { animation: 'fadeIn 0.3s ease-out' },
  slideUp: { animation: 'slideUp 0.3s ease-out' },
  pulse: { animation: 'pulse 2s infinite' }
}

// エラーアラートコンポーネント
function ErrorAlert({ message, onClose, onRetry }: { 
  message: string
  onClose: () => void
  onRetry?: () => void 
}) {
  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert" style={animationStyles.slideUp}>
      <div className="flex items-start gap-3">
        <span className="text-red-500 text-xl flex-shrink-0">⚠️</span>
        <div className="flex-1">
          <p className="text-sm text-red-800 font-medium">{message}</p>
          <div className="mt-3 flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors min-h-[44px] min-w-[44px] font-medium"
                aria-label="再試行"
              >
                🔄 再試行
              </button>
            )}
            <button
              onClick={onClose}
              className="text-xs px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors min-h-[44px] min-w-[44px] font-medium"
              aria-label="エラーメッセージを閉じる"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 成功アラートコンポーネント
function SuccessAlert({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg" role="alert" style={animationStyles.slideUp}>
      <div className="flex items-start gap-3">
        <span className="text-green-500 text-xl flex-shrink-0">✅</span>
        <div className="flex-1">
          <p className="text-sm text-green-800 font-medium">{message}</p>
          <button
            onClick={onClose}
            className="mt-2 text-xs text-green-700 hover:text-green-900 underline min-h-[44px] min-w-[44px] flex items-center"
            aria-label="成功メッセージを閉じる"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
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
        <div className="text-center p-2">
          <strong className="text-red-600">📍 店舗位置</strong>
          <br />
          <small className="text-gray-600">ドラッグして位置を調整できます</small>
          <br />
          <small className="text-gray-500">緯度: {position[0].toFixed(6)}</small>
          <br />
          <small className="text-gray-500">経度: {position[1].toFixed(6)}</small>
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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  // バリデーション状態
  const [validationErrors, setValidationErrors] = useState<{
    name?: string
    address?: string
  }>({})

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
      setError('地図機能の初期化に失敗しました。ページを再読み込みしてください。')
    }
    document.head.appendChild(script)

    return () => {
      const existingScript = document.getElementById('geolonia-geocoder')
      if (existingScript) {
        document.head.removeChild(existingScript)
      }
    }
  }, [])

  // バリデーション関数
  const validateForm = useCallback(() => {
    const errors: typeof validationErrors = {}
    
    if (!name.trim()) {
      errors.name = '店舗名は必須です'
    } else if (name.trim().length < 2) {
      errors.name = '店舗名は2文字以上で入力してください'
    } else if (name.trim().length > 100) {
      errors.name = '店舗名は100文字以内で入力してください'
    }
    
    if (!address.trim()) {
      errors.address = '住所は必須です'
    } else if (address.trim().length < 5) {
      errors.address = '住所をより詳しく入力してください'
    } else if (address.trim().length > 200) {
      errors.address = '住所は200文字以内で入力してください'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [name, address])

  // 住所から座標を取得してマップを表示
  const handleGeocodeAndShowMap = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    if (!window.getLatLng) {
      setError('地図機能が利用できません。ページを再読み込みしてください。')
      return
    }

    setIsGeocoding(true)
    setGeocodingStatus('住所を解析しています...')
    setError(null)
    
    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('住所の解析がタイムアウトしました'))
        }, 10000) // 10秒でタイムアウト

        window.getLatLng(
          address.trim(),
          (latlng) => {
            clearTimeout(timeoutId)
            console.log('Geolonia で取得した座標:', latlng)
            setMarkerPosition([latlng.lat, latlng.lng])
            setMapCenter([latlng.lat, latlng.lng])
            setShowMap(true)
            setGeocodingStatus(`✅ 座標を取得しました！地図上で位置を微調整してください`)
            resolve()
          },
          (error) => {
            clearTimeout(timeoutId)
            console.error('Geolonia geocoding error:', error)
            reject(new Error('住所の解析に失敗しました。住所をより詳しく入力してください。'))
          }
        )
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '住所の解析に失敗しました'
      setError(errorMessage)
      setGeocodingStatus('')
    } finally {
      setIsGeocoding(false)
    }
  }, [address, validateForm])

  // マーカー位置が変更された時のハンドラー
  const handleMarkerPositionChange = useCallback((lat: number, lng: number) => {
    setMarkerPosition([lat, lng])
    setGeocodingStatus(`📍 位置を調整しました (緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)})`)
  }, [])

  // 地図クリックで位置変更
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setMarkerPosition([lat, lng])
    setGeocodingStatus(`📍 新しい位置を選択しました (緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)})`)
  }, [])

  // フォームリセット関数
  const resetForm = useCallback(() => {
    setName('')
    setAddress('')
    setDescription('')
    setGeocodingStatus('')
    setShowMap(false)
    setMarkerPosition(null)
    setValidationErrors({})
    setError(null)
    setSuccess(null)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      setError('入力内容に不備があります。各項目を確認してください。')
      return
    }

    if (!markerPosition) {
      setError('まず住所を検索して、地図上で位置を確認してください。')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const [lat, lng] = markerPosition
      
      console.log('データベースに保存中...', { lat, lng })
      
      // データ検証
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        throw new Error('位置情報が正しくありません。地図上で位置を再設定してください。')
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('位置情報が有効な範囲外です。正しい位置を選択してください。')
      }
      
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
        
        // エラーメッセージの詳細化
        if (error.message.includes('duplicate key') || error.message.includes('pkey')) {
          throw new Error('データベースの重複エラーが発生しました。システム管理者にお問い合わせください。')
        } else if (error.message.includes('row-level security') || error.message.includes('RLS')) {
          throw new Error('データベースのアクセス権限エラーが発生しました。システム管理者にお問い合わせください。')
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('ネットワークエラーが発生しました。インターネット接続を確認して再試行してください。')
        } else {
          throw new Error(`データベースエラー: ${error.message}`)
        }
      } else {
        console.log('店舗が登録されました:', data)
        setSuccess('✅ 店舗を登録しました！地図に反映されます。')
        resetForm()
        
        if (onShopAdded) {
          onShopAdded()
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md" style={animationStyles.fadeIn}>
      <h2 className="text-xl font-semibold mb-4 text-gray-800">🏪 新しい店舗を追加</h2>
      
      {/* Geolonia のクレジット表示 */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          住所の座標変換には{' '}
          <a 
            href="https://community-geocoder.geolonia.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline font-medium hover:text-blue-800 transition-colors"
            aria-label="Geolonia Community Geocoder（新しいタブで開く）"
          >
            Geolonia Community Geocoder
          </a>{' '}
          を使用しています
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <ErrorAlert 
          message={error} 
          onClose={() => setError(null)}
          onRetry={error.includes('地図機能') ? () => window.location.reload() : undefined}
        />
      )}

      {/* 成功表示 */}
      {success && (
        <SuccessAlert 
          message={success} 
          onClose={() => setSuccess(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 店舗名入力 */}
        <div>
          <label htmlFor="shop-name" className="block text-sm font-medium text-gray-700 mb-2">
            店舗名 <span className="text-red-500" aria-label="必須">*</span>
          </label>
          <input
            id="shop-name"
            type="text"
            placeholder="例: 青山コーヒー焙煎所"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (validationErrors.name) {
                setValidationErrors(prev => ({ ...prev, name: undefined }))
              }
            }}
            className={`w-full p-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 transition-colors min-h-[44px] ${
              validationErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            required
            disabled={isSubmitting}
            aria-describedby={validationErrors.name ? 'name-error' : undefined}
            maxLength={100}
          />
          {validationErrors.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
              {validationErrors.name}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {name.length}/100文字
          </p>
        </div>

        {/* 住所入力 */}
        <div>
          <label htmlFor="shop-address" className="block text-sm font-medium text-gray-700 mb-2">
            住所 <span className="text-red-500" aria-label="必須">*</span>
          </label>
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              id="shop-address"
              type="text"
              placeholder="例: 大阪府大阪市北区角田町9-26 新梅田食道街"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value)
                if (validationErrors.address) {
                  setValidationErrors(prev => ({ ...prev, address: undefined }))
                }
              }}
              className={`flex-1 p-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 transition-colors min-h-[44px] ${
                validationErrors.address ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              required
              disabled={isSubmitting || isGeocoding}
              aria-describedby={validationErrors.address ? 'address-error' : 'address-help'}
              maxLength={200}
            />
            <button
              type="button"
              onClick={handleGeocodeAndShowMap}
              disabled={!address.trim() || isSubmitting || isGeocoding}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="住所から地図上の位置を検索"
            >
              {isGeocoding ? (
                <>
                  <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  検索中...
                </>
              ) : (
                '🗺️ 地図で確認'
              )}
            </button>
          </div>
          
          {validationErrors.address && (
            <p id="address-error" className="mt-1 text-sm text-red-600" role="alert">
              {validationErrors.address}
            </p>
          )}
          
          <p id="address-help" className="mt-1 text-xs text-gray-500">
            {address.length}/200文字 - 建物名や施設名も含めると精度が向上します
          </p>
          
          {/* 座標取得ステータス表示 */}
          {geocodingStatus && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg" style={animationStyles.slideUp}>
              <p className="text-sm text-blue-700 font-medium">
                {geocodingStatus}
              </p>
            </div>
          )}
        </div>

        {/* 地図表示エリア */}
        {showMap && markerPosition && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg" style={animationStyles.slideUp}>
            <h4 className="text-sm font-medium text-gray-800 mb-3">🗺️ 位置を確認・調整してください</h4>
            <div className="h-80 w-full rounded-lg overflow-hidden border-2 border-gray-300">
              <MapContainer 
                center={mapCenter}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                className="focus:outline-none"
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
            
            {/* 操作説明 */}
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800">
                <div className="font-medium mb-2">📍 操作方法:</div>
                <div className="text-xs space-y-1 leading-relaxed">
                  <div>• 赤いピンをドラッグして正確な位置に移動</div>
                  <div>• または地図をクリックして位置を変更</div>
                  <div>• 位置が決まったら下の「店舗を登録」ボタンをクリック</div>
                </div>
              </div>
            </div>
            
            {markerPosition && (
              <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border">
                <strong>現在の座標:</strong> 緯度 {markerPosition[0].toFixed(6)}, 経度 {markerPosition[1].toFixed(6)}
              </div>
            )}
          </div>
        )}

        {/* 説明入力 */}
        <div>
          <label htmlFor="shop-description" className="block text-sm font-medium text-gray-700 mb-2">
            説明・特徴 <span className="text-gray-400">(任意)</span>
          </label>
          <textarea
            id="shop-description"
            placeholder="例: 新梅田食道街の奥にある隠れ家的なコーヒー専門店。手焙煎の豆が自慢で、落ち着いた雰囲気でゆっくりできます。"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-lg h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 transition-colors"
            disabled={isSubmitting}
            maxLength={500}
            aria-describedby="description-help"
          />
          <p id="description-help" className="mt-1 text-xs text-gray-500">
            {description.length}/500文字 - 店舗の特徴や雰囲気を教えてください
          </p>
        </div>

        {/* 登録ボタン */}
        <button 
          type="submit"
          disabled={isSubmitting || !name.trim() || !address.trim() || !markerPosition}
          className={`w-full p-4 rounded-lg transition-all font-medium text-lg shadow-md min-h-[44px] ${
            isSubmitting || !name.trim() || !address.trim() || !markerPosition
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
          }`}
          aria-label={
            isSubmitting 
              ? '店舗を登録中' 
              : !markerPosition 
                ? '地図で位置を確認してから登録してください' 
                : '店舗を登録'
          }
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              📍 登録中...
            </div>
          ) : !markerPosition ? (
            '🗺️ まず地図で位置を確認してください'
          ) : (
            '🏪 店舗を登録'
          )}
        </button>
      </form>

      {/* ヘルプセクション */}
      <div className="mt-6 space-y-4">        
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 mb-2">🎯 精度向上の流れ</h4>
          <div className="text-xs text-green-700 space-y-1 leading-relaxed">
            <div>1. 住所を入力して「🗺️ 地図で確認」をクリック</div>
            <div>2. Geoloniaで大まかな位置を取得</div>
            <div>3. 地図上で赤いピンをドラッグして正確な位置に調整</div>
            <div>4. 位置が決まったら店舗情報を登録</div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 住所入力のコツ</h4>
          <div className="text-xs text-blue-700 space-y-1 leading-relaxed">
            <div>• 建物名や施設名も含める（例: ○○食道街、○○ビル）</div>
            <div>• 「大阪府大阪市北区角田町9-26 新梅田食道街」のように詳しく</div>
            <div>• 地図で微調整できるので、大まかな住所でもOK</div>
            <div>• 英語表記よりも日本語表記の方が精度が高くなります</div>
          </div>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="text-sm font-medium text-purple-800 mb-2">📝 説明欄の活用</h4>
          <div className="text-xs text-purple-700 space-y-1 leading-relaxed">
            <div>• 店舗の雰囲気や特徴を具体的に</div>
            <div>• おすすめメニューや営業時間なども記載OK</div>
            <div>• Wi-Fi や電源の有無も役立つ情報です</div>
            <div>• 他の利用者が参考にできる情報を心がけましょう</div>
          </div>
        </div>
      </div>

      {/* CSS-in-JS アニメーション定義 */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* フォーカス時のアクセシビリティ向上 */
        input:focus-visible,
        textarea:focus-visible,
        button:focus-visible {
          outline: 2px solid #3B82F6;
          outline-offset: 2px;
        }

        /* タッチデバイス向けの最適化 */
        @media (hover: hover) {
          .hover\\:scale-105:hover {
            transform: scale(1.05);
          }
        }

        /* レスポンシブ対応 */
        @media (max-width: 640px) {
          .leaflet-container {
            height: 300px !important;
          }
        }

        /* バリデーションエラー時のアニメーション */
        .border-red-300 {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  )
}