// types/global.d.ts
import 'react'

declare global {
  namespace React {
    interface HTMLAttributes<T> {
      jsx?: boolean
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

// Next.js環境変数の型定義
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    NEXT_PUBLIC_BASE_URL?: string
  }
}

export {}