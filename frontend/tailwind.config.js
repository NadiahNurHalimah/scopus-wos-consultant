/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: '#0F2A4A', light: '#1A3D6B', dark: '#081D33' },
        gold:  { DEFAULT: '#B8963E', light: '#D4AF6A', dark: '#8A6F2E' },
        teal:  { DEFAULT: '#1A8A8A', light: '#22B0B0', dark: '#126666' },
        cream: { DEFAULT: '#FAF8F1', dark: '#F0EDE0' },
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in':     'fadeIn 0.4s ease-out',
        'slide-up':    'slideUp 0.5s ease-out',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
