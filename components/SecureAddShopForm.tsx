// components/SecureAddShopForm.tsx - ビルドエラー修正版
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { useUser, withAuth } from '../contexts/UserContext'
import Image from 'next/image'

// AuthModalの仮実装（実際のファイルに置き換えてください）
const useAuthModal = () => {
  const [isOpen, setIsOpen] = useState(false)
  
  return {
    isOpen,
    openAuthModal: () => setIsOpen(true),
    closeAuthModal: () => setIsOpen(false),
    AuthModal: ({ title, message }: { title?: string; message?: string }) => (
      isOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-gray-600 mb-4">{message}</p>
            <button 
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              閉じる
            </button>
          </div>
        </div>
      ) : null
    )
  }
}

// Geolonia APIの型定義を追加
declare global {
  interface Window {
    getLatLng?: (
      address: string,
      onSuccess: (latlng: { lat: number; lng: number }) => void,
      onError: (error: unknown) => void
    ) => void
  }
}

// セキュリティ設定
const SECURITY_LIMITS = {
  MAX_SHOP_NAME_LENGTH: 100,
  MAX_ADDRESS_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_PHONE_LENGTH: 20,
  MAX_WEBSITE_LENGTH: 200,
  MAX_TAGS_PER_SHOP: 10,
  MAX_TAG_LENGTH: 30,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MIN_COORDINATES_PRECISION: 6
}

// XSS対策のサニタイズ関数
const sanitizeInput = (input: string, maxLength: number): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .substring(0, maxLength)
}

// URLの検証
const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

// 座標の検証
const isValidCoordinate = (lat: number, lng: number): boolean => {
  return (
    lat >= -90 && lat <= 90 && 
    lng >= -180 && lng <= 180 &&
    Number.isFinite(lat) && Number.isFinite(lng)
  )
}

// 電話番号の基本検証
const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\-\+\(\)\s]+$/
  return phoneRegex.test(phone) && phone.length >= 10 && phone.length <= 20
}

interface ShopFormData {
  name: string
  address: string
  description: string
  category: 'cafe' | 'roastery' | 'chain' | 'specialty' | 'bakery'
  price_range: 1 | 2 | 3 | 4
  phone: string
  website: string
  has_wifi: boolean
  has_power: boolean
  payment_methods: string[]
  tags: string[]
}

interface AddShopFormProps {
  onShopAdded?: () => void
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
        // 座標の精度を制限してプライバシーを保護
        const lat = Math.round(newPos.lat * 1000000) / 1000000
        const lng = Math.round(newPos.lng * 1000000) / 1000000
        
        if (isValidCoordinate(lat, lng)) {
          onPositionChange(lat, lng)
        }
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
      const lat = Math.round(e.latlng.lat * 1000000) / 1000000
      const lng = Math.round(e.latlng.lng * 1000000) / 1000000
      
      if (isValidCoordinate(lat, lng)) {
        onLocationSelect(lat, lng)
      }
    },
  })
  return null
}

function SecureAddShopForm({ onShopAdded }: AddShopFormProps) {
  const { user, security, validateUserAction, logSecurityEvent } = useUser()
  const { openAuthModal, AuthModal } = useAuthModal()

  // フォームデータ
  const [formData, setFormData] = useState<ShopFormData>({
    name: '',
    address: '',
    description: '',
    category: 'cafe',
    price_range: 2,
    phone: '',
    website: '',
    has_wifi: false,
    has_power: false,
    payment_methods: ['cash'],
    tags: []
  })

  // 状態管理
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6762, 139.6503])
  const [showMap, setShowMap] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // フォームデータの更新（セキュリティチェック付き）
  const updateFormData = useCallback((field: keyof ShopFormData, value: string | number | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // リアルタイムバリデーション
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }, [validationErrors])

  // 入力値の検証
  const validateFormData = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {}

    // 必須フィールドの検証
    if (!formData.name.trim()) {
      errors.name = '店舗名は必須です'
    } else if (formData.name.length > SECURITY_LIMITS.MAX_SHOP_NAME_LENGTH) {
      errors.name = `店舗名は${SECURITY_LIMITS.MAX_SHOP_NAME_LENGTH}文字以内で入力してください`
    }

    if (!formData.address.trim()) {
      errors.address = '住所は必須です'
    } else if (formData.address.length > SECURITY_LIMITS.MAX_ADDRESS_LENGTH) {
      errors.address = `住所は${SECURITY_LIMITS.MAX_ADDRESS_LENGTH}文字以内で入力してください`
    }

    if (formData.description.length > SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH) {
      errors.description = `説明は${SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH}文字以内で入力してください`
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      errors.phone = '有効な電話番号を入力してください'
    }

    if (formData.website && !isValidUrl(formData.website)) {
      errors.website = '有効なURLを入力してください'
    }

    if (formData.tags.length > SECURITY_LIMITS.MAX_TAGS_PER_SHOP) {
      errors.tags = `タグは${SECURITY_LIMITS.MAX_TAGS_PER_SHOP}個まで設定できます`
    }

    if (!markerPosition) {
      errors.location = '地図上で店舗の位置を設定してください'
    } else if (!isValidCoordinate(markerPosition[0], markerPosition[1])) {
      errors.location = '有効な座標を設定してください'
    }

    return errors
  }, [formData, markerPosition])

  // セキュリティチェック
  const performSecurityChecks = useCallback(async (): Promise<boolean> => {
    // 認証チェック
    if (!user || !validateUserAction('create_shop')) {
      await logSecurityEvent('unauthorized_shop_creation_attempt', {
        user_id: user?.id,
        form_data: formData
      })
      setError('店舗作成の権限がありません')
      return false
    }

    // レート制限チェック
    if (!security.canCreateShop) {
      await logSecurityEvent('rate_limit_exceeded', {
        user_id: user.id,
        action: 'shop_creation'
      })
      setError('作成制限に達しています。しばらく時間をおいてから再試行してください')
      return false
    }

    // 匿名ユーザーの制限チェック
    if (user.is_anonymous) {
      const today = new Date().toDateString()
      const todayShopsKey = `anonymous_shops_${user.id}_${today}`
      const todayShops = parseInt(localStorage.getItem(todayShopsKey) || '0')
      
      if (todayShops >= 3) { // 匿名ユーザーは1日3店舗まで
        await logSecurityEvent('anonymous_daily_limit_exceeded', {
          user_id: user.id,
          today_shops: todayShops
        })
        setError('匿名ユーザーは1日3店舗まで登録できます。Googleアカウントでサインインするとより多く登録できます。')
        return false
      }
    }

    return true
  }, [user, security, validateUserAction, logSecurityEvent, formData])

  // 住所検索（セキュリティ強化）
  const handleGeocodeAndShowMap = useCallback(async () => {
    if (!user) {
      openAuthModal()
      return
    }

    const errors = validateFormData()
    if (errors.name || errors.address) {
      setValidationErrors(errors)
      setError('店舗名と住所を正しく入力してください')
      return
    }

    if (!window.getLatLng) {
      setError('地図機能が利用できません。ページを再読み込みしてください。')
      return
    }

    setIsGeocoding(true)
    setError(null)
    
    try {
      await logSecurityEvent('geocoding_attempt', {
        user_id: user.id,
        address: sanitizeInput(formData.address, SECURITY_LIMITS.MAX_ADDRESS_LENGTH)
      })

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('住所の解析がタイムアウトしました'))
        }, 10000)

        window.getLatLng!(
          sanitizeInput(formData.address, SECURITY_LIMITS.MAX_ADDRESS_LENGTH),
          (latlng) => {
            clearTimeout(timeoutId)
            
            if (isValidCoordinate(latlng.lat, latlng.lng)) {
              setMarkerPosition([latlng.lat, latlng.lng])
              setMapCenter([latlng.lat, latlng.lng])
              setShowMap(true)
              resolve()
            } else {
              reject(new Error('無効な座標が返されました'))
            }
          },
          () => {
            clearTimeout(timeoutId)
            reject(new Error('住所の解析に失敗しました'))
          }
        )
      })

      await logSecurityEvent('geocoding_success', { user_id: user.id })
      
    } catch (geocodeError) {
      const errorMessage = geocodeError instanceof Error ? geocodeError.message : '住所の解析に失敗しました'
      setError(errorMessage)
      await logSecurityEvent('geocoding_failed', {
        user_id: user.id,
        error: errorMessage
      })
    } finally {
      setIsGeocoding(false)
    }
  }, [formData, user, validateFormData, openAuthModal, logSecurityEvent])

  // フォーム送信（セキュリティ強化）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // セキュリティチェック
    if (!(await performSecurityChecks())) {
      return
    }

    // バリデーション
    const errors = validateFormData()
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setError('入力内容を確認してください')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const [lat, lng] = markerPosition!

      // データのサニタイズ
      const sanitizedData = {
        name: sanitizeInput(formData.name, SECURITY_LIMITS.MAX_SHOP_NAME_LENGTH),
        address: sanitizeInput(formData.address, SECURITY_LIMITS.MAX_ADDRESS_LENGTH),
        description: sanitizeInput(formData.description, SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH) || null,
        latitude: lat,
        longitude: lng,
        category: formData.category,
        price_range: formData.price_range,
        phone: formData.phone ? sanitizeInput(formData.phone, SECURITY_LIMITS.MAX_PHONE_LENGTH) : null,
        website: formData.website && isValidUrl(formData.website) ? formData.website : null,
        has_wifi: formData.has_wifi,
        has_power: formData.has_power,
        payment_methods: formData.payment_methods,
        created_by: user!.id
      }

      await logSecurityEvent('shop_creation_attempt', {
        user_id: user!.id,
        shop_data: { ...sanitizedData, latitude: undefined, longitude: undefined } // 座標を除く
      })

      // 店舗登録
      const { data: shopResult, error: shopError } = await supabase
        .from('shops')
        .insert([sanitizedData])
        .select('id')
        .single()

      if (shopError) throw shopError
      
      const shopId = shopResult.id

      // タグ登録（セキュリティチェック付き）
      if (formData.tags.length > 0) {
        const sanitizedTags = formData.tags
          .slice(0, SECURITY_LIMITS.MAX_TAGS_PER_SHOP)
          .map(tag => sanitizeInput(tag, SECURITY_LIMITS.MAX_TAG_LENGTH))
          .filter(tag => tag.length > 0)

        if (sanitizedTags.length > 0) {
          const tagsData = sanitizedTags.map(tag => ({
            shop_id: shopId,
            tag: tag.toLowerCase()
          }))

          const { error: tagsError } = await supabase
            .from('shop_tags')
            .insert(tagsData)

          if (tagsError) {
            console.warn('タグ登録エラー:', tagsError)
          }
        }
      }

      // 匿名ユーザーの日次カウンターを更新
      if (user!.is_anonymous) {
        const today = new Date().toDateString()
        const todayShopsKey = `anonymous_shops_${user!.id}_${today}`
        const todayShops = parseInt(localStorage.getItem(todayShopsKey) || '0')
        localStorage.setItem(todayShopsKey, (todayShops + 1).toString())
      }

      await logSecurityEvent('shop_creation_success', {
        user_id: user!.id,
        shop_id: shopId
      })

      setSuccess('✅ 店舗を登録しました！ありがとうございます。')
      
      // フォームリセット
      setFormData({
        name: '',
        address: '',
        description: '',
        category: 'cafe',
        price_range: 2,
        phone: '',
        website: '',
        has_wifi: false,
        has_power: false,
        payment_methods: ['cash'],
        tags: []
      })
      setShowMap(false)
      setMarkerPosition(null)
      setValidationErrors({})

      if (onShopAdded) {
        onShopAdded()
      }

      // 成功メッセージを自動で消す
      setTimeout(() => {
        setSuccess(null)
      }, 5000)

    } catch (submitError) {
      console.error('登録エラー:', submitError)
      const errorMessage = submitError instanceof Error ? submitError.message : '店舗の登録に失敗しました'
      setError(errorMessage)
      
      await logSecurityEvent('shop_creation_failed', {
        user_id: user!.id,
        error: errorMessage
      })
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
                <Image 
                  src={user.avatar_url} 
                  alt={user.nickname || 'User avatar'} 
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <span className="text-gray-600">
                {user.is_anonymous ? '👤 匿名ユーザー' : `👤 ${user.nickname}`}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                user.security_level === 3 ? 'bg-red-100 text-red-800' :
                user.security_level === 2 ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {user.role === 'admin' ? '管理者' : 
                 user.role === 'moderator' ? 'モデレーター' : 
                 user.is_anonymous ? '匿名' : '認証済み'}
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
                店舗名 * <span className="text-xs text-gray-500">({formData.name.length}/{SECURITY_LIMITS.MAX_SHOP_NAME_LENGTH})</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="例: 青山コーヒー焙煎所"
                required
                disabled={!user}
                maxLength={SECURITY_LIMITS.MAX_SHOP_NAME_LENGTH}
              />
              {validationErrors.name && (
                <p className="text-red-600 text-xs mt-1">{validationErrors.name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリー
              </label>
              <select
                value={formData.category}
                onChange={(e) => updateFormData('category', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!user}
              >
                <option value="cafe">☕ カフェ</option>
                <option value="roastery">🔥 焙煎所</option>
                <option value="chain">🏪 チェーン店</option>
                <option value="specialty">✨ スペシャルティ</option>
                <option value="bakery">🥐 ベーカリーカフェ</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              住所 * <span className="text-xs text-gray-500">({formData.address.length}/{SECURITY_LIMITS.MAX_ADDRESS_LENGTH})</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateFormData('address', e.target.value)}
                className={`flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.address ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="例: 大阪府大阪市北区角田町9-26"
                required
                disabled={!user}
                maxLength={SECURITY_LIMITS.MAX_ADDRESS_LENGTH}
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
            {validationErrors.address && (
              <p className="text-red-600 text-xs mt-1">{validationErrors.address}</p>
            )}
            {validationErrors.location && (
              <p className="text-red-600 text-xs mt-1">{validationErrors.location}</p>
            )}
          </div>
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
          disabled={isSubmitting || !user || !security.canCreateShop || Object.keys(validateFormData()).length > 0}
          className={`w-full p-4 rounded-lg transition-all font-medium text-lg ${
            isSubmitting || !user || !security.canCreateShop || Object.keys(validateFormData()).length > 0
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {!user ? (
            '👤 サインインが必要です'
          ) : !security.canCreateShop ? (
            '⏰ 作成制限中（しばらくお待ちください）'
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
        message="セキュリティとコミュニティの品質維持のため、店舗情報の登録にはサインインをお願いしています。"
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

// デフォルトエクスポート（withAuthでラップ）
export default withAuth(SecureAddShopForm)