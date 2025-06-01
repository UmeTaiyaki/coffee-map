'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import { useAuthModal } from './AuthModal'
import UserMenu from './UserMenu'
import { showToast } from './ToastNotification'

// 型定義
interface ShopFormData {
  name: string
  address: string
  description: string
  category: 'cafe' | 'roastery' | 'chain' | 'specialty' | 'bakery'
  priceRange: 1 | 2 | 3 | 4
  phone: string
  website: string
  hasWifi: boolean
  hasPower: boolean
  paymentMethods: string[]
  tags: string[]
  hours: ShopHours[]
}

interface ShopHours {
  day_of_week: number
  open_time: string
  close_time: string
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

const DEFAULT_HOURS: ShopHours[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  open_time: '09:00',
  close_time: '18:00',
  is_closed: false
}))

const DEFAULT_FORM_DATA: ShopFormData = {
  name: '',
  address: '',
  description: '',
  category: 'cafe',
  priceRange: 2,
  phone: '',
  website: '',
  hasWifi: false,
  hasPower: false,
  paymentMethods: ['cash'],
  tags: [],
  hours: DEFAULT_HOURS
}

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

// Geolonia API型定義
declare global {
  interface Window {
    getLatLng?: (
      address: string,
      onSuccess: (latlng: { lat: number; lng: number }) => void,
      onError: (error: unknown) => void
    ) => void
  }
}

// コンポーネント
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
      if (marker) {
        const newPos = marker.getLatLng()
        onPositionChange(newPos.lat, newPos.lng)
      }
    },
  }

  return (
    <Marker
      draggable
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

// フォームセクションコンポーネント
function FormSection({ 
  title, 
  children 
}: { 
  title: string
  children: React.ReactNode 
}) {
  return (
    <div className="border-b pb-6">
      <h3 className="text-lg font-medium mb-4 text-gray-700">{title}</h3>
      {children}
    </div>
  )
}

// 営業時間編集コンポーネント
function HoursEditor({ 
  hours, 
  onChange,
  disabled 
}: { 
  hours: ShopHours[]
  onChange: (hours: ShopHours[]) => void
  disabled?: boolean
}) {
  const updateHour = (index: number, field: keyof ShopHours, value: string | boolean) => {
    const newHours = [...hours]
    newHours[index] = { ...newHours[index], [field]: value }
    onChange(newHours)
  }

  return (
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
              onChange={(e) => updateHour(index, 'is_closed', e.target.checked)}
              className="mr-2"
              disabled={disabled}
            />
            定休日
          </label>

          {!hour.is_closed && (
            <>
              <input
                type="time"
                value={hour.open_time}
                onChange={(e) => updateHour(index, 'open_time', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                disabled={disabled}
              />
              <span>〜</span>
              <input
                type="time"
                value={hour.close_time}
                onChange={(e) => updateHour(index, 'close_time', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                disabled={disabled}
              />
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// タグ入力コンポーネント
function TagInput({ 
  tags, 
  onChange,
  disabled 
}: { 
  tags: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
}) {
  const [inputValue, setInputValue] = useState('')
  
  const COMMON_TAGS = [
    'wifi', 'quiet', 'meeting', 'takeout', 'outdoor',
    'study', 'laptop', 'parking', 'pet-friendly', 'late-night',
    'breakfast', 'lunch', 'dessert', 'specialty-coffee', 'tea'
  ]

  const addTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase()
    if (normalizedTag && !tags.includes(normalizedTag)) {
      onChange([...tags, normalizedTag])
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      addTag(inputValue)
      setInputValue('')
    }
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">よく使われるタグ:</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              disabled={tags.includes(tag) || disabled}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                tags.includes(tag)
                  ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="カスタムタグを追加"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          追加
        </button>
      </form>

      {tags.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">選択されたタグ:</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-blue-600 hover:text-blue-800"
                  disabled={disabled}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface AddShopFormProps {
  onShopAdded?: () => void
}

export default function UpdatedAddShopForm({ onShopAdded }: AddShopFormProps) {
  const { user } = useUser()
  const { openAuthModal, AuthModal } = useAuthModal()

  // フォーム状態
  const [formData, setFormData] = useState<ShopFormData>(DEFAULT_FORM_DATA)
  const [showMap, setShowMap] = useState(false)
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6762, 139.6503])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)

  // フォームデータ更新
  const updateFormData = useCallback(<K extends keyof ShopFormData>(
    field: K,
    value: ShopFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // 住所検索
  const handleGeocodeAndShowMap = useCallback(async () => {
    if (!user) {
      openAuthModal()
      return
    }

    if (!formData.name.trim() || !formData.address.trim()) {
      showToast('店舗名と住所を入力してください', 'error')
      return
    }

    if (!window.getLatLng) {
      showToast('地図機能が利用できません。ページを再読み込みしてください。', 'error')
      return
    }

    setIsGeocoding(true)
    
    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('住所の解析がタイムアウトしました'))
        }, 10000)

        window.getLatLng!(
          formData.address.trim(),
          (latlng) => {
            clearTimeout(timeoutId)
            setMarkerPosition([latlng.lat, latlng.lng])
            setMapCenter([latlng.lat, latlng.lng])
            setShowMap(true)
            showToast('座標を取得しました！', 'success')
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
      showToast(errorMessage, 'error')
    } finally {
      setIsGeocoding(false)
    }
  }, [formData.address, formData.name, user, openAuthModal])

  // 画像アップロード
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `shops/${fileName}`

      const { error } = await supabase.storage
        .from('shop_images')
        .upload(filePath, file)

      if (error) throw error

      const { data } = supabase.storage
        .from('shop_images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('画像アップロードエラー:', error)
      return null
    }
  }

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      openAuthModal()
      return
    }

    if (!formData.name.trim() || !formData.address.trim() || !markerPosition) {
      showToast('必須項目を入力し、地図上で位置を確認してください', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const [lat, lng] = markerPosition

      // 店舗データ準備
      const shopData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        description: formData.description.trim() || null,
        latitude: lat,
        longitude: lng,
        category: formData.category,
        price_range: formData.priceRange,
        phone: formData.phone.trim() || null,
        website: formData.website.trim() || null,
        has_wifi: formData.hasWifi,
        has_power: formData.hasPower,
        payment_methods: formData.paymentMethods,
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
      const hoursData = formData.hours.map(hour => ({
        shop_id: shopId,
        ...hour
      }))

      await supabase.from('shop_hours').insert(hoursData)

      // タグ登録
      if (formData.tags.length > 0) {
        const tagsData = formData.tags.map(tag => ({
          shop_id: shopId,
          tag
        }))
        await supabase.from('shop_tags').insert(tagsData)
      }

      showToast('店舗を登録しました！ありがとうございます。', 'success')
      
      // フォームリセット
      setFormData(DEFAULT_FORM_DATA)
      setShowMap(false)
      setMarkerPosition(null)

      if (onShopAdded) {
        onShopAdded()
      }

    } catch (error) {
      console.error('登録エラー:', error)
      const errorMessage = error instanceof Error ? error.message : '店舗の登録に失敗しました'
      showToast(errorMessage, 'error')
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

  const isFormDisabled = !user || isSubmitting

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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報 */}
        <FormSection title="📝 基本情報">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                店舗名 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 青山コーヒー焙煎所"
                required
                disabled={isFormDisabled}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリー
              </label>
              <select
                value={formData.category}
                onChange={(e) => updateFormData('category', e.target.value as typeof formData.category)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isFormDisabled}
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
                value={formData.address}
                onChange={(e) => updateFormData('address', e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 大阪府大阪市北区角田町9-26"
                required
                disabled={isFormDisabled}
              />
              <button
                type="button"
                onClick={handleGeocodeAndShowMap}
                disabled={isGeocoding || isFormDisabled}
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
              value={formData.priceRange}
              onChange={(e) => updateFormData('priceRange', Number(e.target.value) as typeof formData.priceRange)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isFormDisabled}
            >
              {Object.entries(PRICE_RANGES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </FormSection>

        {/* 連絡先・詳細 */}
        <FormSection title="📞 連絡先・詳細">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                電話番号
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 03-1234-5678"
                disabled={isFormDisabled}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ウェブサイト
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => updateFormData('website', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: https://example.com"
                disabled={isFormDisabled}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.hasWifi}
                onChange={(e) => updateFormData('hasWifi', e.target.checked)}
                className="mr-2"
                disabled={isFormDisabled}
              />
              📶 Wi-Fi あり
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.hasPower}
                onChange={(e) => updateFormData('hasPower', e.target.checked)}
                className="mr-2"
                disabled={isFormDisabled}
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
                    checked={formData.paymentMethods.includes(value)}
                    onChange={() => {
                      const newMethods = formData.paymentMethods.includes(value)
                        ? formData.paymentMethods.filter(m => m !== value)
                        : [...formData.paymentMethods, value]
                      updateFormData('paymentMethods', newMethods)
                    }}
                    className="mr-2"
                    disabled={isFormDisabled}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </FormSection>

        {/* 営業時間 */}
        <FormSection title="🕐 営業時間">
          <HoursEditor
            hours={formData.hours}
            onChange={(hours) => updateFormData('hours', hours)}
            disabled={isFormDisabled}
          />
        </FormSection>

        {/* タグ */}
        <FormSection title="🏷️ タグ">
          <TagInput
            tags={formData.tags}
            onChange={(tags) => updateFormData('tags', tags)}
            disabled={isFormDisabled}
          />
        </FormSection>

        {/* 説明 */}
        <FormSection title="📝 説明・特徴">
          <textarea
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg h-24 resize-none focus:ring-2 focus:ring-blue-500"
            placeholder="店舗の特徴や雰囲気を教えてください..."
            maxLength={500}
            disabled={isFormDisabled}
          />
          <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500文字</p>
        </FormSection>

        {/* 地図 */}
        {showMap && markerPosition && user && (
          <FormSection title="🗺️ 位置確認">
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
          </FormSection>
        )}

        {/* 送信ボタン */}
        <button 
          type="submit"
          disabled={isFormDisabled || !formData.name.trim() || !formData.address.trim() || !markerPosition}
          className={`w-full p-4 rounded-lg transition-all font-medium text-lg ${
            isFormDisabled || !formData.name.trim() || !formData.address.trim() || !markerPosition
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {!user ? '👤 サインインが必要です' : 
           isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              登録中...
            </div>
          ) : !markerPosition ? '🗺️ まず地図で位置を確認してください' : '🏪 店舗を登録'}
        </button>
      </form>

      <AuthModal 
        title="店舗登録にはサインインが必要です"
        message="コミュニティの品質維持のため、店舗情報の登録にはサインインをお願いしています。"
      />
    </div>
  )
}