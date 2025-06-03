'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'
type Density = 'compact' | 'detailed'

interface ThemeContextType {
  theme: Theme
  density: Density
  toggleTheme: () => void
  setDensity: (density: Density) => void
}

// デフォルト値を設定
const defaultContext: ThemeContextType = {
  theme: 'light',
  density: 'detailed',
  toggleTheme: () => {},
  setDensity: () => {}
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [density, setDensity] = useState<Density>('detailed')
  const [mounted, setMounted] = useState(false)

  // 初期化時にローカルストレージから設定を読み込む
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('coffee-map-theme') as Theme
      const savedDensity = localStorage.getItem('coffee-map-density') as Density
      
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setTheme(savedTheme)
      }
      
      if (savedDensity && (savedDensity === 'compact' || savedDensity === 'detailed')) {
        setDensity(savedDensity)
      }
    } catch (error) {
      console.error('テーマ設定の読み込みエラー:', error)
    }
    
    setMounted(true)
  }, [])

  // テーマが変更されたときの処理
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    try {
      localStorage.setItem('coffee-map-theme', theme)
    } catch (error) {
      console.error('テーマ設定の保存エラー:', error)
    }
  }, [theme, mounted])

  // 密度が変更されたときの処理
  useEffect(() => {
    if (!mounted) return
    
    try {
      localStorage.setItem('coffee-map-density', density)
    } catch (error) {
      console.error('密度設定の保存エラー:', error)
    }
  }, [density, mounted])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const value: ThemeContextType = {
    theme,
    density,
    toggleTheme,
    setDensity
  }

  // 初期ロード時のフラッシュを防ぐ
  if (!mounted) {
    return (
      <ThemeContext.Provider value={defaultContext}>
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    console.error('useTheme must be used within a ThemeProvider')
    // エラーの代わりにデフォルト値を返す（開発時のホットリロード対策）
    return defaultContext
  }
  return context
}