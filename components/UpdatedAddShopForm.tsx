// components/UpdatedAddShopForm.tsx
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import { useAuthModal } from './AuthModal'

// 省略: 既存の型定義とインポート...
interface Shop {
  id: number
  name: string
  address: string
  description?: string
  latitude: number
  longitude: number
  phone?: string
  website?: string
  has_wifi?: boolean
  has_power?: boolean
  category: 'cafe' | 'roastery' | 'chain' | 'specialty' | 'bakery'
  price_range: 1 | 2 | 3 | 4
  main_image_url?: string
  payment_methods?: string[]
  created_by?: string
}

interface ShopHours {
  day_of_week: number
  open_time?: string
  close_time?: string
  is_closed: boolean
}

// 定数
const CATEGORIES = {
  cafe: '☕ カフェ',
  roastery: '🔥 焙煎所',
  chain: '🏪 チェーン店',
  specialty: '✨ スペシャルティ',
  bakery: '🥐 ベーカリーカフェ'
} as const

const PRICE_RANGES = {
  1: '¥ (～500円)',
  2: '¥¥ (500～1000円)', 
  3: '¥¥¥ (1000～2000円)',
  4: '¥¥¥¥ (2000円～)'
} as const

const COMMON_TAGS = [
  'wifi', 'quiet', 'meeting', 'takeout', 'outdoor',
  'study', 'laptop', 'parking', 'pet-friendly', 'late-night',
  'breakfast', 'lunch', 'dessert', 'specialty-coffee', 'tea'
] as const

const PAYMENT_METHODS = [
  { value: 'cash', label: '💰 現金' },
  { value: 'credit', label: '💳 クレジットカード' },
  { value: 'debit', label: '💳 デビットカード' },
  { value: 'qr-code', label: '📱 QRコード決済' },
  { value: 'ic-card', label: '💳 ICカード' },
  { value: 'paypay', label: '📱 PayPay' },
  { value: 'line-pay', label: '📱 LINE Pay' }
] as const

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'] as const

// Leafletアイコン設定
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
        <div className="text-center p-2">
          <strong className="text-red-600">📍 店舗位置</strong>
          <br />
          <small className="text-gray-600">ドラッグして位置を調整できます</small>
        </div>
      </Popup>
    </Marker>
  )
}

// 地図クリックハンドラー
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

export default function UpdatedAddShopForm({ onShopAdded }: AddShopFormProps) {
  // ユーザー認証
  const { user } = useUser()
  const { isOpen: authModalOpen, openAuthModal, closeAuthModal, AuthModal } = useAuthModal()

  // 基本情報
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<keyof typeof CATEGORIES>('cafe')
  const [priceRange, setPriceRange] = useState<1 | 2 | 3 | 4>(2)
  
  // 連絡先・詳細情報
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [hasWifi, setHasWifi] = useState(false)
  const [hasPower, setHasPower] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['cash'])
  
  // 営業時間
  const [hours, setHours] = useState<ShopHours[]>(
    Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      open_time: '09:00',
      close_time: '18:00',
      is_closed: false
    }))
  )
  
  // タグ
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  
  // 画像
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // 地図・送信状態
  const [showMap, setShowMap] = useState(false)
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6762, 139.6503])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodingStatus, setGeocodingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 認証チェック
  const checkAuthentication = () => {
    if (!user) {
      openAuthModal()
      return false
    }
    return true
  }

  // 画像選択ハンドラー
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB制限
        setError('画像サイズは5MB以下にしてください')
        return
      }
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // 画像アップロード
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `shops/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('shop_images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('shop_images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('画像アップロードエラー:', error)
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  // タグ追加
  const addTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const addCustomTag = () => {
    if (customTag.trim()) {
      addTag(customTag.trim().toLowerCase())
      setCustomTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove))
  }

  // 営業時間更新
  const updateHours = (dayIndex: number, field: keyof ShopHours, value: any) => {
    setHours(hours.map((hour, index) => 
      index === dayIndex ? { ...hour, [field]: value } : hour
    ))
  }

  // 決済方法トグル
  const togglePaymentMethod = (method: string) => {
    setPaymentMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    )
  }

  // 住所検索
  const handleGeocodeAndShowMap = useCallback(async () => {
    if (!checkAuthentication()) return

    if (!name.trim() || !address.trim()) {
      setError('店舗名と住所を入力してください')
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
        }, 10000)

        window.getLatLng!(
          address.trim(),
          (latlng) => {
            clearTimeout(timeoutId)
            setMarkerPosition([latlng.lat, latlng.lng])
            setMapCenter([latlng.lat, latlng.lng])
            setShowMap(true)
            setGeocodingStatus(`✅ 座標を取得しました！`)
            resolve()
          },
          (error) => {
            clearTimeout(timeoutId)
            reject(new Error('住所の解析に失敗しました'))
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
  }, [address, name])

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!checkAuthentication()) return

    if (!name.trim() || !address.trim() || !markerPosition) {
      setError('必須項目を入力し、地図上で位置を確認してください')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const [lat, lng] = markerPosition
      
      // 画像アップロード
      let imageUrl: string | null = null
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage)
        if (!imageUrl) {
          throw new Error('画像のアップロードに失敗しました')
        }
      }

      // 店舗データ準備（created_byを追加）
      const shopData = {
        name: name.trim(),
        address: address.trim(),
        description: description.trim() || null,
        latitude: lat,
        longitude: lng,
        category,
        price_range: priceRange,
        phone: phone.trim() || null,
        website: website.trim() || null,
        has_wifi: hasWifi,
        has_power: hasPower,
        main_image_url: imageUrl,
        payment_methods: paymentMethods,
        created_by: user!.id // ユーザーIDを追加
      }

      // 店舗登録
      const { data: shopResult, error: shopError } = await supabase
        .from('shops')
        .insert([shopData])
        .select('id')
        .single()

      if (shopError) throw shopError
      
      const shopId = shopResult.id

      // 営業時間登録
      const hoursData = hours.map(hour => ({
        shop_id: shopId,
        ...hour
      }))

      const { error: hoursError } = await supabase
        .from('shop_hours')
        .insert(hoursData)

      if (hoursError) console.warn('営業時間登録エラー:', hoursError)

      // タグ登録
      if (selectedTags.length > 0) {
        const tagsData = selectedTags.map(tag => ({
          shop_id: shopId,
          tag
        }))

        const { error: tagsError } = await supabase
          .from('shop_tags')
          .insert(tagsData)

        if (tagsError) console.warn('タグ登録エラー:', tagsError)
      }

      setSuccess('✅ 店舗を登録しました！ありがとうございます。')
      
      // フォームリセット
      setName('')
      setAddress('')
      setDescription('')
      setCategory('cafe')
      setPriceRange(2)
      setPhone('')
      setWebsite('')
      setHasWifi(false)
      setHasPower(false)
      setPaymentMethods(['cash'])
      setSelectedTags([])
      setSelectedImage(null)
      setImagePreview(null)
      setShowMap(false)
      setMarkerPosition(null)
      setGeocodingStatus('')
      
      // 営業時間をリセット
      setHours(Array.from({ length: 7 }, (_, i) => ({
        day_of_week: i,
        open_time: '09:00',
        close_time: '18:00',
        is_closed: false
      })))

      if (onShopAdded) {
        onShopAdded()
      }

      // 成功メッセージを自動で消す
      setTimeout(() => {
        setSuccess(null)
      }, 5000)

    } catch (error) {
      console.error('登録エラー:', error)
      const errorMessage = error instanceof Error ? error.message : '店舗の登録に失敗しました'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Geolonia スクリプト読み込み
  useEffect(() => {
    if (document.getElementById('geolonia-geocoder')) return

    const script = document.createElement('script')
    script.id = 'geolonia-geocoder'
    script.src = 'https://cdn.geolonia.com/community-geocoder.js'
    script.async = true
    document.head.appendChild(script)

    return () => {
      const existingScript = document.getElementById('geolonia-geocoder')
      if (existingScript) {
        document.head.removeChild(existingScript)
      }
    }
  }, [])

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">🏪 新しい店舗を追加</h2>
        
        {/* ユーザー状態表示 */}
        <div className="text-sm">
          {user ? (
            <div className="flex items-center gap-2">
              {user.avatar_url && (
                <img 
                  src={user.avatar_url} 
                  alt={user.nickname} 
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-gray-600">
                {user.is_anonymous ? '👤 匿名ユーザー' : `👤 ${user.nickname}`}
              </span>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
            >
              サインインして投稿
            </button>
          )}
        </div>
      </div>
      
      {/* 認証が必要な場合の案内 */}
      {!user && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-blue-500 text-xl">ℹ️</span>
            <div>
              <h3 className="text-blue-800 font-medium mb-1">店舗登録にはサインインが必要です</h3>
              <p className="text-blue-700 text-sm mb-3">
                Googleアカウントまたは匿名ログインで簡単にサインインできます。
              </p>
              <button
                onClick={openAuthModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
              >
                サインインする
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* エラー・成功表示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報セクション */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">📝 基本情報</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                店舗名 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 青山コーヒー焙煎所"
                required
                disabled={!user}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリー
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as keyof typeof CATEGORIES)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!user}
              >
                {Object.entries(CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              住所 *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 大阪府大阪市北区角田町9-26"
                required
                disabled={!user}
              />
              <button
                type="button"
                onClick={handleGeocodeAndShowMap}
                disabled={isGeocoding || !user}
                className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {isGeocoding ? '検索中...' : '🗺️ 地図で確認'}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              価格帯
            </label>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value) as 1 | 2 | 3 | 4)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!user}
            >
              {Object.entries(PRICE_RANGES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 連絡先・詳細情報 */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">📞 連絡先・詳細</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                電話番号
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 03-1234-5678"
                disabled={!user}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ウェブサイト
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: https://example.com"
                disabled={!user}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasWifi}
                onChange={(e) => setHasWifi(e.target.checked)}
                className="mr-2"
                disabled={!user}
              />
              📶 Wi-Fi あり
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasPower}
                onChange={(e) => setHasPower(e.target.checked)}
                className="mr-2"
                disabled={!user}
              />
              🔌 電源あり
            </label>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              決済方法
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ value, label }) => (
                <label key={value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={paymentMethods.includes(value)}
                    onChange={() => togglePaymentMethod(value)}
                    className="mr-2"
                    disabled={!user}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 営業時間セクションは省略（既存コードと同じ）... */}
        
        {/* 地図 */}
        {showMap && markerPosition && user && (
          <div className="border-b pb-6">
            <h3 className="text-lg font-medium mb-4 text-gray-700">🗺️ 位置確認</h3>
            
            {geocodingStatus && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                {geocodingStatus}
              </div>
            )}
            
            <div className="h-80 w-full rounded-lg overflow-hidden border">
              <MapContainer 
                center={mapCenter}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <DraggableMarker 
                  position={markerPosition} 
                  onPositionChange={(lat, lng) => setMarkerPosition([lat, lng])}
                />
                <MapClickHandler 
                  onLocationSelect={(lat, lng) => setMarkerPosition([lat, lng])} 
                />
              </MapContainer>
            </div>
            
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              💡 赤いピンをドラッグするか、地図をクリックして正確な位置に調整してください
            </div>
          </div>
        )}

        {/* 送信ボタン */}
        <button 
          type="submit"
          disabled={isSubmitting || !user || !name.trim() || !address.trim() || !markerPosition || uploadingImage}
          className={`w-full p-4 rounded-lg transition-all font-medium text-lg ${
            isSubmitting || !user || !name.trim() || !address.trim() || !markerPosition || uploadingImage
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {!user ? (
            '👤 サインインが必要です'
          ) : isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              登録中...
            </div>
          ) : uploadingImage ? (
            '画像アップロード中...'
          ) : !markerPosition ? (
            '🗺️ まず地図で位置を確認してください'
          ) : (
            '🏪 店舗を登録'
          )}
        </button>
      </form>

      {/* 認証モーダル */}
      <AuthModal 
        title="店舗登録にはサインインが必要です"
        message="コミュニティの品質維持のため、店舗情報の登録にはサインインをお願いしています。"
      />

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}