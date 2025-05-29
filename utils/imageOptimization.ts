// utils/imageOptimization.ts
import { supabase } from '../lib/supabase'

export interface ImageUploadOptions {
  file: File
  bucket: string
  path?: string
  quality?: number
  maxSize?: number
}

export interface OptimizedImageUrls {
  original: string
  thumbnail: string // 200x200
  medium: string    // 800x600
  large: string     // 1200x900
}

/**
 * 画像をアップロードし、最適化されたURLを返す
 */
export async function uploadOptimizedImage({
  file,
  bucket = 'shop_images',
  path,
  quality = 80,
  maxSize = 5 * 1024 * 1024 // 5MB
}: ImageUploadOptions): Promise<OptimizedImageUrls | null> {
  try {
    // ファイルサイズチェック
    if (file.size > maxSize) {
      throw new Error(`ファイルサイズが${maxSize / (1024 * 1024)}MBを超えています`)
    }

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      throw new Error('画像ファイルのみアップロード可能です')
    }

    // ファイルパス生成
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const fileName = path || `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `shops/${fileName}`

    // アップロード実行
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600', // 1時間キャッシュ
        upsert: false
      })

    if (uploadError) throw uploadError

    // 最適化されたURLを生成
    const baseUrl = supabase.storage.from(bucket).getPublicUrl(filePath)
    
    if (!baseUrl.data.publicUrl) {
      throw new Error('画像URLの取得に失敗しました')
    }

    const optimizedUrls: OptimizedImageUrls = {
      original: baseUrl.data.publicUrl,
      thumbnail: getOptimizedUrl(baseUrl.data.publicUrl, { width: 200, height: 200, quality }),
      medium: getOptimizedUrl(baseUrl.data.publicUrl, { width: 800, height: 600, quality }),
      large: getOptimizedUrl(baseUrl.data.publicUrl, { width: 1200, height: 900, quality })
    }

    return optimizedUrls

  } catch (error) {
    console.error('画像アップロードエラー:', error)
    return null
  }
}

/**
 * Supabase画像変換URLを生成
 */
export function getOptimizedUrl(
  originalUrl: string, 
  options: { width?: number; height?: number; quality?: number; format?: string }
): string {
  const url = new URL(originalUrl)
  
  if (options.width) url.searchParams.set('width', options.width.toString())
  if (options.height) url.searchParams.set('height', options.height.toString())
  if (options.quality) url.searchParams.set('quality', options.quality.toString())
  if (options.format) url.searchParams.set('format', options.format)
  
  return url.toString()
}

/**
 * 画像をクライアントサイドで圧縮
 */
export function compressImage(
  file: File, 
  maxWidth: number = 1920, 
  maxHeight: number = 1080, 
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // 比率を保持して最大サイズに収める
      const { width, height } = calculateOptimalSize(img.width, img.height, maxWidth, maxHeight)
      
      canvas.width = width
      canvas.height = height
      
      // 高品質リサイズ
      ctx!.imageSmoothingEnabled = true
      ctx!.imageSmoothingQuality = 'high'
      ctx!.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            reject(new Error('画像圧縮に失敗しました'))
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 最適なリサイズサイズを計算
 */
function calculateOptimalSize(
  originalWidth: number, 
  originalHeight: number, 
  maxWidth: number, 
  maxHeight: number
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight)
  
  if (ratio >= 1) {
    return { width: originalWidth, height: originalHeight }
  }
  
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio)
  }
}

/**
 * Next.js Image Loader (Supabase用)
 */
export function supabaseImageLoader({ 
  src, 
  width, 
  quality 
}: { 
  src: string
  width: number
  quality?: number 
}): string {
  const url = new URL(src)
  url.searchParams.set('width', width.toString())
  if (quality) {
    url.searchParams.set('quality', quality.toString())
  }
  return url.toString()
}

/**
 * 画像の削除
 */
export async function deleteImage(filePath: string, bucket: string = 'shop_images'): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('画像削除エラー:', error)
    return false
  }
}

/**
 * 複数画像の一括アップロード
 */
export async function uploadMultipleImages(
  files: File[],
  options: Omit<ImageUploadOptions, 'file'>
): Promise<OptimizedImageUrls[]> {
  const results = await Promise.allSettled(
    files.map(file => uploadOptimizedImage({ ...options, file }))
  )

  return results
    .filter((result): result is PromiseFulfilledResult<OptimizedImageUrls | null> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value!)
}