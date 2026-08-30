/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffd',
          300: '#7cc5fb',
          400: '#36a9f6',
          500: '#0c8de7',
          600: '#006fc5',
          700: '#0158a0',
          800: '#064b84',
          900: '#0b3f6e',
          950: '#07284a',
        },
        scout: {
          blue: '#003366',
          gold: '#c5930a',
          green: '#17803d',
          purple: '#6d28d9',
        }
      },
    },
  },
  plugins: [],
}
