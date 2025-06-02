// components/AddShopModal.tsx
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
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

interface AddShopModalProps {
  isOpen: boolean
  onClose: () => void
  onShopAdded?: () => void
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
  icon,
  children,
  isOpen = true,
  onToggle
}: { 
  title: string
  icon: string
  children: React.ReactNode
  isOpen?: boolean
  onToggle?: () => void
}) {
  if (onToggle) {
    return (
      <div className="border rounded-lg">
        <button
          onClick={onToggle}
          className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors rounded-t-lg"
        >
          <span className="font-medium text-gray-800 flex items-center gap-2">
            <span>{icon}</span>
            {title}
          </span>
          <span className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </button>
        {isOpen && (
          <div className="p-4 border-t">
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-700 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  )
}

export default function AddShopModal({ isOpen, onClose, onShopAdded }: AddShopModalProps) {
  const { user } = useUser()

  // フォーム状態
  const [formData, setFormData] = useState<ShopFormData>(DEFAULT_FORM_DATA)
  const [showMap, setShowMap] = useState(false)
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6762, 139.6503])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  // セクション開閉状態
  const [openSections, setOpenSections] = useState({
    hours: false,
    advanced: false
  })

  // フォームデータ更新
  const updateFormData = useCallback(<K extends keyof ShopFormData>(
    field: K,
    value: ShopFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // セクション開閉
  const toggleSection = useCallback((section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }, [])

  // 住所検索
  const handleGeocodeAndShowMap = useCallback(async () => {
    if (!user) {
      showToast('店舗の登録にはサインインが必要です。右上のサインインボタンからログインしてください。', 'warning', 6000)
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
            setCurrentStep(2)
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
  }, [formData.address, formData.name, user])

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      showToast('店舗の登録にはサインインが必要です。右上のサインインボタンからログインしてください。', 'warning', 6000)
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
      setCurrentStep(1)

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

  // モーダル閉じる処理
  const handleClose = useCallback(() => {
    if (isSubmitting) return
    onClose()
    // リセット処理は少し遅延させる
    setTimeout(() => {
      setFormData(DEFAULT_FORM_DATA)
      setShowMap(false)
      setMarkerPosition(null)
      setCurrentStep(1)
      setOpenSections({ hours: false, advanced: false })
    }, 300)
  }, [isSubmitting, onClose])

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isSubmitting, handleClose])

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

  // モーダル表示/非表示時のスクロール制御
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const isFormDisabled = !user || isSubmitting

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              🏪 新しい店舗を追加
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentStep >= 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}>
                1. 基本情報
              </div>
              <span className="text-gray-400">→</span>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentStep >= 2 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}>
                2. 位置確認
              </div>
              <span className="text-gray-400">→</span>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentStep >= 3 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}>
                3. 登録完了
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 text-2xl p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto">
          {/* 認証案内 */}
          {!user && (
            <div className="m-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-blue-500 text-xl">ℹ️</span>
                <div>
                  <h3 className="text-blue-800 font-medium mb-1">店舗登録にはサインインが必要です</h3>
                  <p className="text-blue-700 text-sm">
                    右上のサインインボタンからGoogleアカウントでサインインしてください。
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 基本情報 */}
            <FormSection title="基本情報" icon="📝">
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

              <div>
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
                    className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {isGeocoding ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        検索中...
                      </>
                    ) : (
                      <>
                        🗺️ 地図で確認
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
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

            {/* 連絡先・設備 */}
            <FormSection title="連絡先・設備" icon="📞">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

              <div className="flex flex-wrap gap-4">
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
            </FormSection>

            {/* 説明 */}
            <FormSection title="説明・特徴" icon="📝">
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

            {/* 地図（位置確認後に表示） */}
            {showMap && markerPosition && user && (
              <FormSection title="位置確認" icon="🗺️">
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

            {/* フッター・送信ボタン */}
            <div className="border-t pt-6">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button 
                  type="submit"
                  disabled={isFormDisabled || !formData.name.trim() || !formData.address.trim() || !markerPosition}
                  className={`flex-1 px-6 py-3 rounded-lg transition-all font-medium ${
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
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}