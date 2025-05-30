// components/Phase1AddShopForm.tsx - 新規作成
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import { useAuthModal } from './AuthModal'
import UserMenu from './UserMenu'
import ImageUpload from './ImageUpload'

// Geolonia APIの型定義
declare global {
  interface Window {
    getLatLng?: (
      address: string,
      onSuccess: (latlng: { lat: number; lng: number }) => void,
      onError: (error: unknown) => void
    ) => void
  }
}

// 型定義
interface ShopHours {
  day_of_week: number
  open_time?: string
  close_time?: string
  is_closed: boolean
}

// 定数
const CATEGORIES = {
  cafe: { label: '☕ カフェ', icon: '☕' },
  roastery: { label: '🔥 焙煎所', icon: '🔥' },
  chain: { label: '🏪 チェーン店', icon: '🏪' },
  specialty: { label: '✨ スペシャルティ', icon: '✨' },
  bakery: { label: '🥐 ベーカリーカフェ', icon: '🥐' }
} as const

const PRICE_RANGES = {
  1: '¥ (～500円)',
  2: '¥¥ (500～1000円)', 
  3: '¥¥¥ (1000～2000円)',
  4: '¥¥¥¥ (2000円～)'
} as const

const COMMON_TAGS = [
  'wifi', 'power', 'quiet', 'meeting', 'takeout', 'outdoor',
  'study', 'laptop', 'parking', 'pet-friendly', 'late-night',
  'breakfast', 'lunch', 'dessert', 'specialty-coffee', 'tea',
  'no-smoking', 'smoking', 'counter', 'sofa', 'terrace'
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

// Leafletアイコン
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

interface Phase1AddShopFormProps {
  onShopAdded?: () => void
}

// マップコンポーネント
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

export default function Phase1AddShopForm({ onShopAdded }: Phase1AddShopFormProps) {
  const { user } = useUser()
  const { openAuthModal, AuthModal } = useAuthModal()

  // 基本情報
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<keyof typeof CATEGORIES>('cafe')
  const [priceRange, setPriceRange] = useState<1 | 2 | 3 | 4>(2)
  
  // Phase 1 新機能
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
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null)
  const [additionalImageUrls, setAdditionalImageUrls] = useState<string[]>([])
  
  // 地図・送信状態
  const [showMap, setShowMap] = useState(false)
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6762, 139.6503])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 画像アップロードハンドラー
  const handleMainImageUploaded = (imageUrl: string) => {
    setMainImageUrl(imageUrl)
  }

  const handleAdditionalImageUploaded = (imageUrl: string) => {
    setAdditionalImageUrls([...additionalImageUrls, imageUrl])
  }

  // タグ管理
  const addTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const addCustomTag = () => {
    if (customTag.trim() && customTag.length <= 30) {
      addTag(customTag.trim().toLowerCase())
      setCustomTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove))
  }

  // 営業時間管理
  const updateHours = (dayIndex: number, field: keyof ShopHours, value: string | boolean) => {
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
    if (!user) {
      openAuthModal()
      return
    }

    if (!name.trim() || !address.trim()) {
      setError('店舗名と住所を入力してください')
      return
    }

    if (!window.getLatLng) {
      setError('地図機能が利用できません。ページを再読み込みしてください。')
      return
    }

    setIsGeocoding(true)
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
            resolve()
          },
          () => {
            clearTimeout(timeoutId)
            reject(new Error('住所の解析に失敗しました'))
          }
        )
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '住所の解析に失敗しました'
      setError(errorMessage)
    } finally {
      setIsGeocoding(false)
    }
  }, [address, name, user, openAuthModal])

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      openAuthModal()
      return
    }

    if (!name.trim() || !address.trim() || !markerPosition) {
      setError('必須項目を入力し、地図上で位置を確認してください')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const [lat, lng] = markerPosition
      
      // 店舗データ
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
        main_image_url: mainImageUrl,
        image_urls: [mainImageUrl, ...additionalImageUrls].filter(Boolean),
        payment_methods: paymentMethods,
        created_by: user.id
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

      await supabase.from('shop_hours').insert(hoursData)

      // タグ登録
      if (selectedTags.length > 0) {
        const tagsData = selectedTags.map(tag => ({
          shop_id: shopId,
          tag
        }))

        await supabase.from('shop_tags').insert(tagsData)
      }

      // 画像情報登録
      if (mainImageUrl || additionalImageUrls.length > 0) {
        const allImageUrls = [mainImageUrl, ...additionalImageUrls].filter(Boolean)
        const imagesData = allImageUrls.map((url, index) => ({
          shop_id: shopId,
          image_url: url,
          is_main: index === 0
        }))

        await supabase.from('shop_images').insert(imagesData)
      }

      setSuccess('✅ 店舗を登録しました！ありがとうございます。')
      
      // 成功通知
      const successEvent = new CustomEvent('showToast', {
        detail: {
          message: '新しい店舗を登録しました！',
          type: 'success'
        }
      })
      window.dispatchEvent(successEvent)
      
      // フォームリセット
      resetForm()

      if (onShopAdded) {
        onShopAdded()
      }

    } catch (error) {
      console.error('登録エラー:', error)
      setError(error instanceof Error ? error.message : '店舗の登録に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
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
    setMainImageUrl(null)
    setAdditionalImageUrls([])
    setShowMap(false)
    setMarkerPosition(null)
    setHours(Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      open_time: '09:00',
      close_time: '18:00',
      is_closed: false
    })))
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
        <UserMenu />
      </div>
      
      {/* 認証案内 */}
      {!user && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-blue-500 text-xl">ℹ️</span>
            <div>
              <h3 className="text-blue-800 font-medium mb-1">店舗登録にはサインインが必要です</h3>
              <button
                onClick={openAuthModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors mt-2"
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
        {/* 基本情報 */}
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
                {Object.entries(CATEGORIES).map(([key, { label }]) => (
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

        {/* 写真アップロード（Phase 1新機能） */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">📸 店舗写真</h3>
          
          <div className="space-y-4">
            {/* メイン画像 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メイン画像
              </label>
              <ImageUpload
                onImageUploaded={handleMainImageUploaded}
                maxSize={5}
              />
            </div>

            {/* 追加画像 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                追加画像（最大5枚）
              </label>
              {additionalImageUrls.length < 5 && (
                <ImageUpload
                  onImageUploaded={handleAdditionalImageUploaded}
                  maxSize={5}
                />
              )}
              
              {/* アップロード済み画像 */}
              {additionalImageUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {additionalImageUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`追加画像${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setAdditionalImageUrls(
                          additionalImageUrls.filter((_, i) => i !== index)
                        )}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

        {/* 営業時間 */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">🕐 営業時間</h3>
          
          <div className="space-y-3">
            {hours.map((hour, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-8 text-center font-medium">
                  {DAY_NAMES[index]}
                </div>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hour.is_closed}
                    onChange={(e) => updateHours(index, 'is_closed', e.target.checked)}
                    className="mr-2"
                    disabled={!user}
                  />
                  定休日
                </label>

                {!hour.is_closed && (
                  <>
                    <input
                      type="time"
                      value={hour.open_time || ''}
                      onChange={(e) => updateHours(index, 'open_time', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      disabled={!user}
                    />
                    <span>〜</span>
                    <input
                      type="time"
                      value={hour.close_time || ''}
                      onChange={(e) => updateHours(index, 'close_time', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      disabled={!user}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* タグ */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">🏷️ タグ</h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">よく使われるタグ:</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  disabled={selectedTags.includes(tag) || !user}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="カスタムタグを追加（最大30文字）"
              maxLength={30}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
              disabled={!user}
            />
            <button
              type="button"
              onClick={addCustomTag}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              disabled={!user || !customTag.trim()}
            >
              追加
            </button>
          </div>

          {selectedTags.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">選択されたタグ:</p>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 説明 */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">📝 説明・特徴</h3>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg h-24 resize-none focus:ring-2 focus:ring-blue-500"
            placeholder="店舗の特徴や雰囲気を教えてください..."
            maxLength={500}
            disabled={!user}
          />
          <p className="text-xs text-gray-500 mt-1">{description.length}/500文字</p>
        </div>

        {/* 地図 */}
        {showMap && markerPosition && user && (
          <div className="border-b pb-6">
            <h3 className="text-lg font-medium mb-4 text-gray-700">🗺️ 位置確認</h3>
            
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
          disabled={isSubmitting || !user || !name.trim() || !address.trim() || !markerPosition}
          className={`w-full p-4 rounded-lg transition-all font-medium text-lg ${
            isSubmitting || !user || !name.trim() || !address.trim() || !markerPosition
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
          animation: spin        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}