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
      // カスタムフォント
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Hiragino Kaku Gothic ProN', 'ヒラギノ角ゴ ProN W3', 'メイリオ', 'Meiryo', 'MS Pゴシック', 'sans-serif'],
        inter: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      
      // カスタムカラーパレット
      colors: {
        // コーヒーテーマカラー
        'coffee': {
          50: '#fdf7f0',
          100: '#faebd7',
          200: '#f4d5ae',
          300: '#ebba7a',
          400: '#e19d4a',
          500: '#d4851f',
          600: '#c07014',
          700: '#9e5914',
          800: '#7f4516',
          900: '#6f4e37',
          950: '#3c2a1e',
        },
        
        // ウォームアクセント
        'warm': {
          50: '#fff8ed',
          100: '#ffead5',
          200: '#fed2aa',
          300: '#feb474',
          400: '#fc8c3c',
          500: '#ff8c42',
          600: '#f05a28',
          700: '#c7411e',
          800: '#9d3520',
          900: '#7e2e1c',
          950: '#44130a',
        },
        
        // ゴールドアクセント
        'gold': {
          50: '#fffef0',
          100: '#fefce1',
          200: '#fef7c3',
          300: '#feee95',
          400: '#fde047',
          500: '#f4d03f',
          600: '#d4af37',
          700: '#a67c00',
          800: '#8a6914',
          900: '#745d1a',
          950: '#44350a',
        },
        
        // ライトモード専用色
        'light': {
          'primary': '#F8F5F0',
          'secondary': '#FFFFFF',
          'tertiary': '#FFF8F0',
          'border': '#E2E8F0',
          'text': {
            'primary': '#2D3748',
            'secondary': '#4A5568',
            'muted': '#718096',
          }
        },
        
        // ダークモード専用色
        'dark': {
          'primary': '#0F0F0F',
          'secondary': '#1A1A1A',
          'tertiary': '#2D2D2D',
          'border': 'rgba(255, 255, 255, 0.1)',
          'text': {
            'primary': '#FFFFFF',
            'secondary': '#CCCCCC',
            'muted': '#999999',
          }
        }
      },
      
      // グラスモーフィズム効果用のbackdropBlur
      backdropBlur: {
        'xs': '2px',
        '4xl': '40px',
      },
      
      // カスタムアニメーション
      animation: {
        // 基本アニメーション
        'gentle-pulse': 'gentle-pulse 4s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.6s ease-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        
        // 地図関連アニメーション
        'marker-appear': 'marker-appear 0.5s ease-out',
        'pulse-location': 'pulse-location 2s infinite',
        
        // UIアニメーション
        'shimmer': 'shimmer 1.5s infinite',
        'bounce-gentle': 'bounce-gentle 2s infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        
        // ローディングアニメーション
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        
        // 遅延アニメーション
        'fade-in-delay-100': 'fade-in 0.6s ease-out 0.1s both',
        'fade-in-delay-200': 'fade-in 0.6s ease-out 0.2s both',
        'fade-in-delay-300': 'fade-in 0.6s ease-out 0.3s both',
        'fade-in-delay-500': 'fade-in 0.6s ease-out 0.5s both',
      },
      
      // カスタムキーフレーム
      keyframes: {
        'gentle-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'fade-in': {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fade-in-up': {
          'from': {
            opacity: '0',
            transform: 'translateY(30px)'
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)'
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
        'shimmer': {
          '0%': {
            'background-position': '-200% 0'
          },
          '100%': {
            'background-position': '200% 0'
          }
        },
        'bounce-gentle': {
          '0%, 100%': {
            transform: 'translateY(0)',
            'animation-timing-function': 'cubic-bezier(0.8, 0, 1, 1)'
          },
          '50%': {
            transform: 'translateY(-5px)',
            'animation-timing-function': 'cubic-bezier(0, 0, 0.2, 1)'
          }
        },
        'glow': {
          '0%, 100%': {
            'box-shadow': '0 0 5px rgba(255, 140, 66, 0.5)'
          },
          '50%': {
            'box-shadow': '0 0 20px rgba(255, 140, 66, 0.8)'
          }
        },
        'shake': {
          '0%, 100%': { 
            transform: 'translateX(0)' 
          },
          '10%, 30%, 50%, 70%, 90%': { 
            transform: 'translateX(-2px)' 
          },
          '20%, 40%, 60%, 80%': { 
            transform: 'translateX(2px)' 
          }
        }
      },
      
      // カスタムスペーシング
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '120': '30rem',
        '144': '36rem',
      },
      
      // カスタムブレークポイント
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
      
      // カスタムボーダー半径
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      
      // カスタムシャドウ
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'glass-lg': '0 12px 40px rgba(0, 0, 0, 0.15)',
        'glow': '0 0 20px rgba(255, 140, 66, 0.3)',
        'glow-lg': '0 0 40px rgba(255, 140, 66, 0.4)',
        'coffee': '0 10px 30px rgba(111, 78, 55, 0.2)',
        'warm': '0 10px 30px rgba(255, 140, 66, 0.2)',
      },
      
      // カスタムグラデーション
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'coffee-gradient': 'linear-gradient(45deg, #6F4E37, #FF8C42)',
        'warm-gradient': 'linear-gradient(45deg, #FF8C42, #D4AF37)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      },
      
      // カスタムトランジション
      transitionTimingFunction: {
        'bounce-gentle': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      // カスタムZ-index
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        '500': '500',
        '1000': '1000',
        '9999': '9999',
      },
      
      // カスタムフィルター
      blur: {
        'xs': '2px',
        '4xl': '40px',
      },
      
      // カスタムトランスフォーム
      scale: {
        '102': '1.02',
        '103': '1.03',
      },
      
      // カスタムアスペクト比
      aspectRatio: {
        '4/3': '4 / 3',
        '3/2': '3 / 2',
        '2/3': '2 / 3',
        '9/16': '9 / 16',
      },
      
      // カスタムフレックス
      flex: {
        '2': '2 2 0%',
        '3': '3 3 0%',
      },
      
      // カスタムグリッド
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        '14': 'repeat(14, minmax(0, 1fr))',
        '15': 'repeat(15, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))',
      },
      
      // カスタム最大幅
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      
      // カスタム最小高さ
      minHeight: {
        '0': '0',
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        'full': '100%',
        'screen': '100vh',
        'min': 'min-content',
        'max': 'max-content',
        'fit': 'fit-content',
      },
    },
  },
  plugins: [
    // カスタムプラグイン：グラスモーフィズム
    function({ addUtilities, theme }) {
      const newUtilities = {
        '.glass': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
        '.glass-sm': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        },
        '.glass-dark': {
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        },
        // ホバーエフェクト
        '.hover-lift': {
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
          },
        },
        '.hover-glow': {
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 0 20px rgba(255, 140, 66, 0.4)',
          },
        },
        // ボタンスタイル
        '.btn-glass': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: '#FF8C42',
            color: 'white',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(255, 140, 66, 0.3)',
          },
        },
        // テキストグラデーション
        '.gradient-text': {
          background: 'linear-gradient(45deg, #6F4E37, #FF8C42)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        // シャドウグロー効果
        '.shadow-glow': {
          boxShadow: '0 0 20px rgba(255, 140, 66, 0.3)',
        },
        // カスタムスクロールバー
        '.scrollbar-thin': {
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'var(--current-tertiary-bg)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#FF8C42',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#e67e22',
          },
        },
      }
      
      addUtilities(newUtilities)
    },
    
    // カスタムプラグイン：レスポンシブタイポグラフィ
    function({ addUtilities }) {
      const responsiveText = {
        '.text-responsive-xs': {
          fontSize: '0.75rem',
          '@media (min-width: 640px)': {
            fontSize: '0.875rem',
          },
        },
        '.text-responsive-sm': {
          fontSize: '0.875rem',
          '@media (min-width: 640px)': {
            fontSize: '1rem',
          },
        },
        '.text-responsive-base': {
          fontSize: '1rem',
          '@media (min-width: 640px)': {
            fontSize: '1.125rem',
          },
        },
        '.text-responsive-lg': {
          fontSize: '1.125rem',
          '@media (min-width: 640px)': {
            fontSize: '1.25rem',
          },
          '@media (min-width: 1024px)': {
            fontSize: '1.5rem',
          },
        },
        '.text-responsive-xl': {
          fontSize: '1.25rem',
          '@media (min-width: 640px)': {
            fontSize: '1.5rem',
          },
          '@media (min-width: 1024px)': {
            fontSize: '1.875rem',
          },
        },
      }
      
      addUtilities(responsiveText)
    },
  ],
}

export default config