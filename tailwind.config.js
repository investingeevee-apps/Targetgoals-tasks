/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Google Tasks-ish blue accent
        accent: {
          DEFAULT: '#1a73e8',
          hover: '#1b66c9',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Roboto',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
