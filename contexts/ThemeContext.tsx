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

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [density, setDensity] = useState<Density>('detailed')
  const [mounted, setMounted] = useState(false)

  // 初期化時にローカルストレージから設定を読み込む
  useEffect(() => {
    const savedTheme = localStorage.getItem('coffee-map-theme') as Theme
    const savedDensity = localStorage.getItem('coffee-map-density') as Density
    
    if (savedTheme) {
      setTheme(savedTheme)
    }
    
    if (savedDensity) {
      setDensity(savedDensity)
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
    
    localStorage.setItem('coffee-map-theme', theme)
  }, [theme, mounted])

  // 密度が変更されたときの処理
  useEffect(() => {
    if (!mounted) return
    
    localStorage.setItem('coffee-map-density', density)
  }, [density, mounted])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const value = {
    theme,
    density,
    toggleTheme,
    setDensity
  }

  // 初期ロード時のフラッシュを防ぐ
  if (!mounted) {
    return <>{children}</>
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
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}