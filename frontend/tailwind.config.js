/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#e0ebff',
          200: '#c7dafe',
          300: '#a4bffb',
          400: '#7f9ef6',
          500: '#5f7def',
          600: '#4b5de3',
          700: '#3a44c3',
          800: '#2f379c',
          900: '#262b6e',
        },
      },
    },
  },
  plugins: [],
}