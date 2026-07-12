/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f1f4fc',
          100: '#e3e9f8',
          200: '#c7d3f0',
          300: '#9eafe5',
          400: '#668ae0',
          500: '#3E6AE1',
          600: '#3155b5',
          700: '#284692',
          800: '#223b78',
          900: '#1c315f',
          950: '#171A20',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
