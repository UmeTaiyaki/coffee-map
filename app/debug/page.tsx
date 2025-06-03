'use client'
import { useTheme } from '../../contexts/ThemeContext'

export default function DebugPage() {
  try {
    const theme = useTheme()
    
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
        <div className="space-y-2">
          <p>Theme Context Status: ✅ Available</p>
          <p>Current Theme: {theme.theme}</p>
          <p>Current Density: {theme.density}</p>
          <button
            onClick={theme.toggleTheme}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Toggle Theme
          </button>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Debug Page - Error</h1>
        <p>Theme Context Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    )
  }
}