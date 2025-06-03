import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // カスタムカラー
        'coffee': '#6F4E37',
        'warm': '#FF8C42',
        'gold': '#D4AF37',
        'light': {
          'primary': '#F8F5F0',
          'secondary': '#FFFFFF',
          'tertiary': '#FFF8F0',
        },
        'dark': {
          'primary': '#0F0F0F',
          'secondary': '#1A1A1A',
          'tertiary': '#2D2D2D',
        }
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'gentle-pulse': 'gentle-pulse 4s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'marker-appear': 'marker-appear 0.5s ease-out both',
        'pulse-location': 'pulse-location 2s infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
      },
      keyframes: {
        'gentle-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'marker-appear': {
          'from': {
            opacity: '0',
            transform: 'scale(0) translateY(-20px)'
          },
          'to': {
            opacity: '1',
            transform: 'scale(1) translateY(0)'
          }
        },
        'pulse-location': {
          '0%': {
            'box-shadow': '0 0 0 0 rgba(59, 130, 246, 0.7)'
          },
          '70%': {
            'box-shadow': '0 0 0 15px rgba(59, 130, 246, 0)'
          },
          '100%': {
            'box-shadow': '0 0 0 0 rgba(59, 130, 246, 0)'
          }
        },
        'slide-in-right': {
          'from': {
            opacity: '0',
            transform: 'translateX(100%)'
          },
          'to': {
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        'fade-in-up': {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        }
      }
    },
  },
  plugins: [],
}

export default config