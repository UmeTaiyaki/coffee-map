// types/global.d.ts
import 'react'

declare global {
  namespace React {
    interface HTMLAttributes<T> {
      jsx?: boolean
    }
  }
  
  // HTMLLinkElement の onLoad イベント拡張
  namespace JSX {
    interface IntrinsicElements {
      link: React.DetailedHTMLProps<
        React.LinkHTMLAttributes<HTMLLinkElement> & {
          onLoad?: (event: React.SyntheticEvent<HTMLLinkElement, Event>) => void
        },
        HTMLLinkElement
      >
    }
  }
}

// Leaflet関連の型定義
declare module 'leaflet' {
  namespace L {
    interface MapOptions {
      preferCanvas?: boolean
    }
  }
}

// CSS Modules
declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}

// 画像
declare module '*.png'
declare module '*.jpg'
declare module '*.jpeg'
declare module '*.gif'
declare module '*.svg'
declare module '*.webp'

// Next.js環境変数の型定義
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    NEXT_PUBLIC_BASE_URL?: string
    NODE_ENV: 'development' | 'production' | 'test'
  }
}

// Window オブジェクトの拡張
declare interface Window {
  // Geolonia API
  getLatLng?: (
    address: string,
    onSuccess: (latlng: { lat: number; lng: number }) => void,
    onError: (error: unknown) => void
  ) => void
  
  // Google Analytics
  gtag?: (...args: any[]) => void
  
  // PWA関連
  deferredPrompt?: any
  
  // Service Worker
  workbox?: any
}

// カスタムイベント型定義
interface CustomEventMap {
  'showToast': CustomEvent<{
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    duration?: number
  }>
}

declare global {
  interface WindowEventMap extends CustomEventMap {}
}

// 地理位置情報API拡張
interface GeolocationPosition {
  coords: {
    latitude: number
    longitude: number
    accuracy: number
    altitude?: number | null
    altitudeAccuracy?: number | null
    heading?: number | null
    speed?: number | null
  }
  timestamp: number
}

// IndexedDB関連
interface IDBKeyRange {
  bound(lower: any, upper: any, lowerOpen?: boolean, upperOpen?: boolean): IDBKeyRange
  lowerBound(bound: any, open?: boolean): IDBKeyRange
  upperBound(bound: any, open?: boolean): IDBKeyRange
  only(value: any): IDBKeyRange
}

// Intersection Observer API
interface IntersectionObserverEntry {
  boundingClientRect: DOMRectReadOnly
  intersectionRatio: number
  intersectionRect: DOMRectReadOnly
  isIntersecting: boolean
  rootBounds: DOMRectReadOnly | null
  target: Element
  time: number
}

interface IntersectionObserver {
  readonly root: Element | null
  readonly rootMargin: string
  readonly thresholds: ReadonlyArray<number>
  disconnect(): void
  observe(target: Element): void
  takeRecords(): IntersectionObserverEntry[]
  unobserve(target: Element): void
}

// ResizeObserver API
interface ResizeObserverEntry {
  readonly borderBoxSize: ReadonlyArray<ResizeObserverSize>
  readonly contentBoxSize: ReadonlyArray<ResizeObserverSize>
  readonly contentRect: DOMRectReadOnly
  readonly devicePixelContentBoxSize: ReadonlyArray<ResizeObserverSize>
  readonly target: Element
}

interface ResizeObserver {
  disconnect(): void
  observe(target: Element, options?: ResizeObserverOptions): void
  unobserve(target: Element): void
}

// Performance API拡張
interface PerformanceEntry {
  readonly duration: number
  readonly entryType: string
  readonly name: string
  readonly startTime: number
}

// Web Share API
interface Navigator {
  share?: (data: {
    title?: string
    text?: string
    url?: string
  }) => Promise<void>
  canShare?: (data: {
    title?: string
    text?: string
    url?: string
  }) => boolean
}

// Web Notification API
interface NotificationOptions {
  actions?: NotificationAction[]
  badge?: string
  body?: string
  data?: any
  dir?: NotificationDirection
  icon?: string
  image?: string
  lang?: string
  renotify?: boolean
  requireInteraction?: boolean
  silent?: boolean
  tag?: string
  timestamp?: number
  vibrate?: VibratePattern
}

// Service Worker API
interface ServiceWorkerRegistration {
  readonly active: ServiceWorker | null
  readonly installing: ServiceWorker | null
  readonly scope: string
  readonly updateViaCache: ServiceWorkerUpdateViaCache
  readonly waiting: ServiceWorker | null
  getNotifications(filter?: GetNotificationOptions): Promise<Notification[]>
  showNotification(title: string, options?: NotificationOptions): Promise<void>
  unregister(): Promise<boolean>
  update(): Promise<void>
  addEventListener(type: string, listener: EventListener): void
  removeEventListener(type: string, listener: EventListener): void
}

// Cache API
interface Cache {
  add(request: RequestInfo): Promise<void>
  addAll(requests: RequestInfo[]): Promise<void>
  delete(request: RequestInfo, options?: CacheQueryOptions): Promise<boolean>
  keys(request?: RequestInfo, options?: CacheQueryOptions): Promise<ReadonlyArray<Request>>
  match(request: RequestInfo, options?: CacheQueryOptions): Promise<Response | undefined>
  matchAll(request?: RequestInfo, options?: CacheQueryOptions): Promise<ReadonlyArray<Response>>
  put(request: RequestInfo, response: Response): Promise<void>
}

// Background Sync API
interface SyncManager {
  register(tag: string): Promise<void>
  getTags(): Promise<string[]>
}

interface ServiceWorkerRegistration {
  readonly sync: SyncManager
}

// Push API
interface PushManager {
  getSubscription(): Promise<PushSubscription | null>
  permissionState(options?: PushSubscriptionOptionsInit): Promise<PushPermissionState>
  subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription>
}

interface ServiceWorkerRegistration {
  readonly pushManager: PushManager
}

// Web App Manifest
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

// Payment Request API
interface PaymentRequest {
  readonly id: string
  readonly shippingAddress: PaymentAddress | null
  readonly shippingOption: string | null
  readonly shippingType: PaymentShippingType | null
  abort(): Promise<void>
  canMakePayment(): Promise<boolean>
  show(detailsPromise?: Promise<PaymentDetailsUpdate>): Promise<PaymentResponse>
  addEventListener(type: string, listener: EventListener): void
  removeEventListener(type: string, listener: EventListener): void
}

// File System Access API
interface FileSystemHandle {
  readonly kind: 'file' | 'directory'
  readonly name: string
  isSameEntry(other: FileSystemHandle): Promise<boolean>
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
}

export {}