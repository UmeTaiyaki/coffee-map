// components/ToastNotification.tsx - トースト通知コンポーネント
'use client'
import React, { useState, useEffect } from 'react'

interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastEvent extends CustomEvent {
  detail: {
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    duration?: number
  }
}

export default function ToastNotification() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const handleToastEvent = (event: ToastEvent) => {
      const { message, type, duration = 3000 } = event.detail
      const id = Math.random().toString(36).substring(2, 15)
      
      const newToast: ToastMessage = {
        id,
        message,
        type,
        duration
      }

      setToasts(prev => [...prev, newToast])

      // 自動削除
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
      }, duration)
    }

    window.addEventListener('showToast', handleToastEvent as EventListener)
    
    return () => {
      window.removeEventListener('showToast', handleToastEvent as EventListener)
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return 'ℹ️'
    }
  }

  const getToastColors = (type: string) => {
    switch (type) {
      case 'success': 
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error': 
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning': 
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info': 
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default: 
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9998] space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 p-4 rounded-lg border shadow-lg
            transform transition-all duration-300 ease-in-out
            animate-slideIn max-w-sm
            ${getToastColors(toast.type)}
          `}
        >
          <span className="text-lg flex-shrink-0">
            {getToastIcon(toast.type)}
          </span>
          
          <span className="flex-1 text-sm font-medium">
            {toast.message}
          </span>
          
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 ml-2"
            aria-label="通知を閉じる"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        
        /* モバイル対応 */
        @media (max-width: 640px) {
          .max-w-sm {
            max-width: calc(100vw - 2rem);
          }
        }
      `}</style>
    </div>
  )
}

// ヘルパー関数：プログラムからトーストを表示
export const showToast = (
  message: string, 
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  duration: number = 3000
) => {
  const event = new CustomEvent('showToast', {
    detail: { message, type, duration }
  })
  window.dispatchEvent(event)
}

// 使用例用のHook
export function useToast() {
  return {
    showSuccess: (message: string, duration?: number) => showToast(message, 'success', duration),
    showError: (message: string, duration?: number) => showToast(message, 'error', duration),
    showWarning: (message: string, duration?: number) => showToast(message, 'warning', duration),
    showInfo: (message: string, duration?: number) => showToast(message, 'info', duration)
  }
}