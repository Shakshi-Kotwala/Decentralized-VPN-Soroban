/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        stellar: {
          black: '#0a0a0f',
          dark: '#0f0f1a',
          panel: '#13131f',
          border: '#1e1e30',
          accent: '#7B68EE',
          'accent-light': '#9b8fff',
          teal: '#00b4d8',
          green: '#00ff9f',
          orange: '#ff6b35',
          yellow: '#ffd60a',
          red: '#ff4444',
          muted: '#4a4a6a',
          text: '#c8c8e8',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(123, 104, 238, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(123, 104, 238, 0.7)' },
        },
      },
    },
  },
  plugins: [],
}
