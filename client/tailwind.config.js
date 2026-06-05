/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#bcd0ff',
          300: '#8bb0ff',
          400: '#5485ff',
          500: '#2f63f5',
          600: '#1d49db',
          700: '#1939b0',
          800: '#19318b',
          900: '#1b2e6f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 6px 24px -8px rgba(15, 23, 42, 0.15)',
      },
    },
  },
  plugins: [],
};
