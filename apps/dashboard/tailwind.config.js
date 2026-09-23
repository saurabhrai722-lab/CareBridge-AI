/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['"Newsreader"', 'serif'],
      },
      colors: {
        brand: {
          navy: '#0B1528',
          slate: '#1E293B',
          muted: '#64748B',
          blue: '#1E56A0',
          blueLight: '#2563EB',
          blueSoft: '#EFF6FF',
          green: '#047857',
          greenSoft: '#ECFDF5',
          purple: '#7C3AED',
          purpleSoft: '#F5F3FF',
          bgLight: '#FAFAFC',
          cardBg: '#FFFFFF',
          border: '#E2E8F0',
        }
      },
      animation: {
        'pulse-dot': 'pulseDot 2.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'marquee': 'marquee 32s linear infinite',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: 0.3, transform: 'scale(0.9)' },
          '50%': { opacity: 1, transform: 'scale(1.15)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
}
