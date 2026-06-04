/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand blue
        accent: {
          DEFAULT: '#1E84E3',
          hover: '#1970C1',
        },
        // Brand orange (streak / flame motif)
        flame: {
          DEFAULT: '#E37D1E',
          hover: '#C96D15',
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
