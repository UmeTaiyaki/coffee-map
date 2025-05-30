// components/EnhancedImageUpload.tsx - img要素修正版
'use client'
import { useState, useRef, useCallback } from 'react'
import { uploadOptimizedImage, compressImage, type OptimizedImageUrls } from '../utils/imageOptimization'

interface EnhancedImageUploadProps {
  onImageUploaded: (urls: OptimizedImageUrls) => void
  onError: (error: string) => void
  maxFiles?: number
  currentImages?: string[]
  bucket?: string
}

export default function EnhancedImageUpload({
  onImageUploaded,
  onError,
  maxFiles = 1,
  currentImages = [],
  bucket = 'shop_images'
}: EnhancedImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    // ファイル数制限チェック
    if (currentImages.length + files.length > maxFiles) {
      onError(`最大${maxFiles}枚まで画像をアップロードできます`)
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const fileArray = Array.from(files)
      
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        setUploadProgress(((i + 1) / fileArray.length) * 50) // 圧縮フェーズ50%

        // 画像を圧縮
        const compressedFile = await compressImage(file, 1920, 1080, 0.85)
        
        setUploadProgress(((i + 1) / fileArray.length) * 50 + 25) // アップロードフェーズ25%

        // 最適化されたアップロード
        const optimizedUrls = await uploadOptimizedImage({
          file: compressedFile,
          bucket
        })

        if (optimizedUrls) {
          onImageUploaded(optimizedUrls)
          setUploadProgress(((i + 1) / fileArray.length) * 100) // 完了
        } else {
          throw new Error(`${file.name}のアップロードに失敗しました`)
        }
      }

    } catch (error) {
      console.error('画像アップロードエラー:', error)
      onError(error instanceof Error ? error.message : '画像のアップロードに失敗しました')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [onImageUploaded, onError, maxFiles, currentImages.length, bucket])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const canUploadMore = currentImages.length < maxFiles

  return (
    <div className="space-y-4">
      {/* アップロードエリア */}
      {canUploadMore && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={triggerFileSelect}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={maxFiles > 1}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          {uploading ? (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">アップロード中...</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">{uploadProgress.toFixed(0)}%</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-4xl">📸</div>
              <div>
                <div className="text-lg font-medium text-gray-700">
                  画像をアップロード
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  ドラッグ&ドロップまたはクリックして選択
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  JPG, PNG, WebP対応 (最大5MB)
                  {maxFiles > 1 && ` • 最大${maxFiles}枚`}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* アップロード済み画像プレビュー */}
      {currentImages.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">
            アップロード済み画像 ({currentImages.length}/{maxFiles})
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {currentImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`アップロード済み画像 ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-all"
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: 削除機能の実装
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 制限に達した場合のメッセージ */}
      {!canUploadMore && (
        <div className="text-center py-4 px-6 bg-gray-50 rounded-lg border">
          <div className="text-gray-600">
            最大{maxFiles}枚の画像がアップロード済みです
          </div>
          <div className="text-sm text-gray-500 mt-1">
            新しい画像を追加するには、既存の画像を削除してください
          </div>
        </div>
      )}

      {/* ヘルプテキスト */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>💡 <strong>ヒント:</strong></div>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>画像は自動的に最適化され、複数サイズで保存されます</li>
          <li>WebP形式に変換され、読み込み速度が向上します</li>
          <li>大きな画像は自動的に圧縮されます</li>
          {maxFiles > 1 && <li>複数の画像を同時に選択できます</li>}
        </ul>
      </div>
    </div>
  )
}

// 使用例コンポーネント
export function ImageUploadExample() {
  const [imageUrls, setImageUrls] = useState<OptimizedImageUrls[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleImageUploaded = (urls: OptimizedImageUrls) => {
    setImageUrls(prev => [...prev, urls])
    setError(null)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">画像アップロードテスト</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <EnhancedImageUpload
        onImageUploaded={handleImageUploaded}
        onError={handleError}
        maxFiles={5}
        currentImages={imageUrls.map(urls => urls.medium)}
      />

      {/* アップロード結果の表示 */}
      {imageUrls.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-medium">アップロード結果</h3>
          {imageUrls.map((urls, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-2">
              <div className="font-medium">画像 {index + 1}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="font-medium mb-1">サムネイル</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urls.thumbnail} alt="thumbnail" className="w-full rounded" />
                </div>
                <div>
                  <div className="font-medium mb-1">中サイズ</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urls.medium} alt="medium" className="w-full rounded" />
                </div>
                <div>
                  <div className="font-medium mb-1">大サイズ</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urls.large} alt="large" className="w-full rounded" />
                </div>
                <div>
                  <div className="font-medium mb-1">オリジナル</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urls.original} alt="original" className="w-full rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}