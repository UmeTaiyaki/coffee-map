// components/ImageUpload.tsx - 新規作成
'use client'
import React, { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '../lib/supabase'

interface ImageUploadProps {
  shopId?: number
  onImageUploaded?: (imageUrl: string) => void
  multiple?: boolean
  maxSize?: number // MB単位
  className?: string
}

export default function ImageUpload({
  shopId,
  onImageUploaded,
  multiple = false,
  maxSize = 5,
  className = ''
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): boolean => {
    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルのみアップロード可能です')
      return false
    }

    // ファイルサイズチェック
    if (file.size > maxSize * 1024 * 1024) {
      setError(`ファイルサイズは${maxSize}MB以下にしてください`)
      return false
    }

    return true
  }

  const compressImage = async (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const img = new window.Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // アスペクト比を保持しながらリサイズ
          if (width > height) {
            if (width > maxWidth) {
              height = (maxWidth / width) * height
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (maxHeight / height) * width
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas context not available'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to compress image'))
              }
            },
            'image/jpeg',
            quality
          )
        }

        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target?.result as string
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const uploadImage = async (file: File) => {
    try {
      setError(null)
      setUploading(true)

      // ファイル検証
      if (!validateFile(file)) {
        return
      }

      // 画像圧縮
      const compressedBlob = await compressImage(file)
      
      // ファイル名生成
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = shopId ? `shops/${shopId}/${fileName}` : `temp/${fileName}`

      // Supabaseストレージにアップロード
      const { error: uploadError, data } = await supabase.storage
        .from('shop-images')
        .upload(filePath, compressedBlob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // パブリックURLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('shop-images')
        .getPublicUrl(filePath)

      // プレビュー表示
      setPreview(publicUrl)

      // 親コンポーネントに通知
      if (onImageUploaded) {
        onImageUploaded(publicUrl)
      }

      // データベースに画像情報を保存（shopIdがある場合）
      if (shopId) {
        const { error: dbError } = await supabase
          .from('shop_images')
          .insert({
            shop_id: shopId,
            image_url: publicUrl,
            is_main: false
          })

        if (dbError) {
          console.error('Failed to save image info to database:', dbError)
        }
      }

    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : '画像のアップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 複数ファイル対応
    if (multiple) {
      Array.from(files).forEach(file => uploadImage(file))
    } else {
      uploadImage(files[0])
    }
  }, [multiple])

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* アップロードボタン */}
      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              アップロード中...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>📸</span>
              画像を選択
            </div>
          )}
        </button>

        {preview && (
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            クリア
          </button>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* プレビュー */}
      {preview && (
        <div className="relative w-full max-w-md">
          <Image
            src={preview}
            alt="アップロード画像プレビュー"
            width={400}
            height={300}
            className="w-full h-auto rounded-lg border"
            style={{ maxHeight: '300px', objectFit: 'contain' }}
          />
        </div>
      )}

      {/* ヘルプテキスト */}
      <div className="text-xs text-gray-500">
        <p>• 対応形式: JPG, PNG, GIF, WebP</p>
        <p>• 最大サイズ: {maxSize}MB</p>
        <p>• 画像は自動的に圧縮されます</p>
      </div>
    </div>
  )
}